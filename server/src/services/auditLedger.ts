import { queryAll, queryOne, execute } from '../db/database';
import { LedgerEntry } from '../types';

const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function calculateHash(
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
): Promise<string> {
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

  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(payload));
  return toHex(digest);
}

/**
 * Record a ledger entry with optimistic concurrency retry against UNIQUE(circle_id, entry_index)
 */
export async function recordLedgerEntry(params: {
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
}): Promise<LedgerEntry> {
  const currency = params.currency || 'USD';
  const auditStatus = params.auditStatus || 'VERIFIED';
  const metadataJson = JSON.stringify(params.metadata || {});

  // Optimistic retry loop up to 5 attempts to handle concurrent writes safely
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const timestamp = new Date().toISOString();

    // 1. Fetch latest entry to find current chain head
    const latest = await queryOne<LedgerEntry>(
      `SELECT * FROM ledger_entries WHERE circle_id = ? ORDER BY entry_index DESC LIMIT 1`,
      [params.circleId]
    );

    let entryIndex = 0;
    let previousHash = GENESIS_PREV_HASH;

    if (latest) {
      entryIndex = latest.entry_index + 1;
      previousHash = latest.entry_hash;
    }

    const entryHash = await calculateHash(
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

    try {
      await execute(
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
    } catch (err: any) {
      const isCollision =
        err?.message?.includes('UNIQUE') ||
        err?.message?.includes('constraint') ||
        err?.message?.includes('entry_index');
      if (isCollision && attempt < maxAttempts) {
        // Wait a slight jittered delay before retrying
        await new Promise(r => setTimeout(r, 10 * attempt + Math.random() * 20));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to record ledger entry after maximum concurrency retry attempts.');
}

export async function getLedgerEntries(circleId: string): Promise<LedgerEntry[]> {
  return await queryAll<LedgerEntry>(
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
  entries: Array<{
    index: number;
    eventType: string;
    amount: number;
    entryHash: string;
    previousHash: string;
    status: 'VALID' | 'TAMPERED';
  }>;
}

export async function verifyLedgerIntegrity(circleId: string): Promise<VerificationResult> {
  const entries = await getLedgerEntries(circleId);

  if (entries.length === 0) {
    return {
      valid: true,
      totalEntries: 0,
      chainValid: true,
      tamperedIndex: null,
      message: 'Ledger is empty. Genesis state intact.',
      headHash: null,
      entries: []
    };
  }

  let expectedPrevHash = GENESIS_PREV_HASH;
  const verifiedEntries: VerificationResult['entries'] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check sequence
    if (entry.entry_index !== i) {
      return {
        valid: false,
        totalEntries: entries.length,
        chainValid: false,
        tamperedIndex: i,
        message: `Sequence violation at entry ${i}: expected index ${i}, got ${entry.entry_index}`,
        headHash: entries[entries.length - 1].entry_hash,
        entries: verifiedEntries
      };
    }

    // Check previous hash linkage
    if (entry.previous_hash !== expectedPrevHash) {
      verifiedEntries.push({
        index: entry.entry_index,
        eventType: entry.event_type,
        amount: entry.amount,
        entryHash: entry.entry_hash,
        previousHash: entry.previous_hash,
        status: 'TAMPERED'
      });

      return {
        valid: false,
        totalEntries: entries.length,
        chainValid: false,
        tamperedIndex: i,
        message: `Broken chain link at entry ${i}: previous_hash does not match predecessor hash`,
        headHash: entries[entries.length - 1].entry_hash,
        entries: verifiedEntries
      };
    }

    // Recalculate hash
    const recomputedHash = await calculateHash(
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

    if (recomputedHash !== entry.entry_hash) {
      verifiedEntries.push({
        index: entry.entry_index,
        eventType: entry.event_type,
        amount: entry.amount,
        entryHash: entry.entry_hash,
        previousHash: entry.previous_hash,
        status: 'TAMPERED'
      });

      return {
        valid: false,
        totalEntries: entries.length,
        chainValid: false,
        tamperedIndex: i,
        message: `Content tampering detected at entry ${i}: computed hash ${recomputedHash} != stored ${entry.entry_hash}`,
        headHash: entries[entries.length - 1].entry_hash,
        entries: verifiedEntries
      };
    }

    verifiedEntries.push({
      index: entry.entry_index,
      eventType: entry.event_type,
      amount: entry.amount,
      entryHash: entry.entry_hash,
      previousHash: entry.previous_hash,
      status: 'VALID'
    });

    expectedPrevHash = entry.entry_hash;
  }

  return {
    valid: true,
    totalEntries: entries.length,
    chainValid: true,
    tamperedIndex: null,
    message: `All ${entries.length} entries cryptographically verified. SHA-256 chain integrity intact.`,
    headHash: entries[entries.length - 1].entry_hash,
    entries: verifiedEntries
  };
}
