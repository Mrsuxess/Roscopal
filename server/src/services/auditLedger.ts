import crypto from 'crypto';
import { queryAll, queryOne, execute } from '../db/database';
import { LedgerEntry } from '../types';

const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function calculateHash(
  prevHash: string,
  index: number,
  circleId: string,
  timestamp: string,
  eventType: string,
  memberName: string,
  recipientName: string,
  cycleNumber: number,
  amount: number,
  currency: string,
  paymentStatus: string,
  paypalRef: string,
  metadataJson: string
): string {
  const payload = [
    prevHash,
    index,
    circleId,
    timestamp,
    eventType,
    memberName,
    recipientName,
    cycleNumber,
    amount.toFixed(2),
    currency,
    paymentStatus,
    paypalRef,
    metadataJson
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function recordLedgerEntry(params: {
  circleId: string;
  eventType: LedgerEntry['event_type'];
  memberName: string;
  recipientName: string;
  cycleNumber: number;
  amount: number;
  currency?: string;
  paymentStatus: string;
  paypalRef: string;
  auditStatus?: LedgerEntry['audit_status'];
  metadata?: Record<string, any>;
}): LedgerEntry {
  const currency = params.currency || 'USD';
  const auditStatus = params.auditStatus || 'VERIFIED';
  const timestamp = new Date().toISOString();
  const metadataJson = JSON.stringify(params.metadata || {});

  // Fetch the latest entry to determine next index and previous hash
  const latest = queryOne<LedgerEntry>(
    `SELECT * FROM ledger_entries WHERE circle_id = ? ORDER BY entry_index DESC LIMIT 1`,
    [params.circleId]
  );

  let entryIndex = 0;
  let previousHash = GENESIS_PREV_HASH;

  if (latest) {
    entryIndex = latest.entry_index + 1;
    previousHash = latest.entry_hash;
  }

  const entryHash = calculateHash(
    previousHash,
    entryIndex,
    params.circleId,
    timestamp,
    params.eventType,
    params.memberName,
    params.recipientName,
    params.cycleNumber,
    params.amount,
    currency,
    params.paymentStatus,
    params.paypalRef,
    metadataJson
  );

  const id = 'LEDGER-' + crypto.randomUUID().slice(0, 8).toUpperCase();

  execute(
    `INSERT INTO ledger_entries (
      id, entry_index, circle_id, timestamp, event_type, member_name, recipient_name,
      cycle_number, amount, currency, payment_status, paypal_ref, audit_status,
      previous_hash, entry_hash, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entryIndex,
      params.circleId,
      timestamp,
      params.eventType,
      params.memberName,
      params.recipientName,
      params.cycleNumber,
      params.amount,
      currency,
      params.paymentStatus,
      params.paypalRef,
      auditStatus,
      previousHash,
      entryHash,
      metadataJson
    ]
  );

  return {
    id,
    entry_index: entryIndex,
    circle_id: params.circleId,
    timestamp,
    event_type: params.eventType,
    member_name: params.memberName,
    recipient_name: params.recipientName,
    cycle_number: params.cycleNumber,
    amount: params.amount,
    currency,
    payment_status: params.paymentStatus,
    paypal_ref: params.paypalRef,
    audit_status: auditStatus,
    previous_hash: previousHash,
    entry_hash: entryHash,
    metadata_json: metadataJson
  };
}

export function getLedgerEntries(circleId: string): LedgerEntry[] {
  return queryAll<LedgerEntry>(
    `SELECT * FROM ledger_entries WHERE circle_id = ? ORDER BY entry_index ASC`,
    [circleId]
  );
}

export interface VerificationResult {
  valid: boolean;
  totalEntries: number;
  chainValid: boolean;
  tamperedIndex: number | null;
  message: string;
  headHash: string | null;
}

export function verifyLedgerIntegrity(circleId: string): VerificationResult {
  const entries = getLedgerEntries(circleId);

  if (entries.length === 0) {
    return {
      valid: true,
      totalEntries: 0,
      chainValid: true,
      tamperedIndex: null,
      message: 'Ledger is empty. No entries to verify.',
      headHash: null
    };
  }

  let expectedPrevHash = GENESIS_PREV_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check index ordering
    if (entry.entry_index !== i) {
      return {
        valid: false,
        totalEntries: entries.length,
        chainValid: false,
        tamperedIndex: i,
        message: `Sequence broken: expected index ${i}, found ${entry.entry_index}`,
        headHash: null
      };
    }

    // Check previous hash pointer
    if (entry.previous_hash !== expectedPrevHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        chainValid: false,
        tamperedIndex: i,
        message: `Broken chain link at index ${i}: previous hash mismatch`,
        headHash: null
      };
    }

    // Recalculate hash of this entry
    const recalculated = calculateHash(
      entry.previous_hash,
      entry.entry_index,
      entry.circle_id,
      entry.timestamp,
      entry.event_type,
      entry.member_name,
      entry.recipient_name,
      entry.cycle_number,
      entry.amount,
      entry.currency,
      entry.payment_status,
      entry.paypal_ref,
      entry.metadata_json
    );

    if (recalculated !== entry.entry_hash) {
      return {
        valid: false,
        totalEntries: entries.length,
        chainValid: false,
        tamperedIndex: i,
        message: `Tampered payload detected at index ${i}! Computed ${recalculated.slice(0, 10)}... vs recorded ${entry.entry_hash.slice(0, 10)}...`,
        headHash: null
      };
    }

    expectedPrevHash = entry.entry_hash;
  }

  return {
    valid: true,
    totalEntries: entries.length,
    chainValid: true,
    tamperedIndex: null,
    message: `All ${entries.length} cryptographic entries verified. SHA-256 chain integrity intact.`,
    headHash: expectedPrevHash
  };
}
