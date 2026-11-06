import crypto from 'crypto';
import { queryOne, execute } from '../db/database';
import { evaluatePayoutSafety, PayoutSafetyCheckResult } from './policyRules';
import { recordLedgerEntry } from '../services/auditLedger';
import { executePayPalPayout } from '../services/paypalService';
import { Cycle, CircleMember, User } from '../types';

export interface PayoutExecutionResult {
  success: boolean;
  message: string;
  payoutId?: string;
  paypalBatchId?: string;
  safetyCheck: PayoutSafetyCheckResult;
  ledgerEntryId?: string;
}

export async function processCyclePayout(cycleId: string, initiatorUserId: string): Promise<PayoutExecutionResult> {
  // Step 1: Deterministic Financial Safety Check
  const safetyCheck = evaluatePayoutSafety(cycleId);

  if (!safetyCheck.allowed) {
    // Record rejected attempt in audit log
    const cycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
    if (cycle) {
      recordLedgerEntry({
        circleId: cycle.circle_id,
        eventType: 'PAYOUT_INITIATED',
        memberName: 'ROSCOPAL_SAFETY_ENGINE',
        recipientName: safetyCheck.details.recipientName,
        cycleNumber: cycle.cycle_number,
        amount: safetyCheck.details.targetAmount,
        paymentStatus: 'BLOCKED_POLICY_VIOLATION',
        paypalRef: 'POLICY_GATE_REJECTED',
        auditStatus: 'FLAGGED',
        metadata: {
          blockReason: safetyCheck.blockReason,
          checks: safetyCheck.checks,
          unpaidMembers: safetyCheck.details.missingMembers
        }
      });
    }

    return {
      success: false,
      message: safetyCheck.blockReason || 'Payout blocked by deterministic financial rules',
      safetyCheck
    };
  }

  // Step 2: Fetch cycle and recipient details
  const cycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId])!;
  const recipientMember = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [cycle.recipient_member_id])!;
  const recipientUser = queryOne<User>(`SELECT * FROM users WHERE id = ?`, [recipientMember.user_id])!;

  // Step 3: Trigger PayPal Payout (real sandbox API or transparent simulated fallback)
  const payoutId = 'PAYOUT-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const idempotencyKey = `PAYOUT-${cycle.circle_id}-CYC${cycle.cycle_number}`;

  const paypalResult = await executePayPalPayout({
    recipientEmail: recipientUser.paypal_email,
    amount: cycle.target_pot_amount,
    currency: 'USD',
    note: `ROSCOPAL Cycle ${cycle.cycle_number} pot payout to ${recipientUser.name}`,
    senderBatchId: idempotencyKey
  });

  if (!paypalResult.success) {
    execute(
      `INSERT INTO payouts (
        id, circle_id, cycle_id, recipient_member_id, amount, currency, status,
        paypal_payout_batch_id, failure_reason, audit_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, ?, 'FLAGGED', ?)`,
      [
        payoutId,
        cycle.circle_id,
        cycle.id,
        recipientMember.id,
        cycle.target_pot_amount,
        'USD',
        paypalResult.batchId || null,
        paypalResult.error || 'PayPal payout execution failed',
        new Date().toISOString()
      ]
    );

    return {
      success: false,
      message: `PayPal Payout failed: ${paypalResult.error}`,
      payoutId,
      safetyCheck
    };
  }

  // Step 4: Record confirmed Payout in Database
  const executedAt = new Date().toISOString();
  execute(
    `INSERT INTO payouts (
      id, circle_id, cycle_id, recipient_member_id, amount, currency, status,
      paypal_payout_batch_id, paypal_payout_item_id, audit_status, created_at, executed_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, 'VERIFIED', ?, ?)`,
    [
      payoutId,
      cycle.circle_id,
      cycle.id,
      recipientMember.id,
      cycle.target_pot_amount,
      'USD',
      paypalResult.batchId,
      paypalResult.itemId || 'ITEM-' + crypto.randomUUID().slice(0, 6).toUpperCase(),
      executedAt,
      executedAt
    ]
  );

  // Step 5: Update cycle status to 'paid_out'
  execute(
    `UPDATE cycles SET status = 'paid_out', paid_out_amount = ?, payout_date = ? WHERE id = ?`,
    [cycle.target_pot_amount, executedAt, cycle.id]
  );

  // Advance current cycle number in circle if not last
  execute(
    `UPDATE circles SET current_cycle_number = current_cycle_number + 1 WHERE id = ?`,
    [cycle.circle_id]
  );

  // Step 6: Post Cryptographic Hash-chained Ledger Entry
  const ledgerEntry = recordLedgerEntry({
    circleId: cycle.circle_id,
    eventType: 'PAYOUT_COMPLETED',
    memberName: 'ROSCOPAL_TREASURER',
    recipientName: recipientUser.name,
    cycleNumber: cycle.cycle_number,
    amount: cycle.target_pot_amount,
    paymentStatus: 'PAID_OUT_CONFIRMED',
    paypalRef: paypalResult.batchId,
    auditStatus: 'VERIFIED',
    metadata: {
      recipientEmail: recipientUser.paypal_email,
      paypalMode: paypalResult.mode,
      payoutId,
      cycleId: cycle.id
    }
  });

  return {
    success: true,
    message: `Successfully released pot of $${cycle.target_pot_amount} to ${recipientUser.name} (${recipientUser.paypal_email}).`,
    payoutId,
    paypalBatchId: paypalResult.batchId,
    safetyCheck,
    ledgerEntryId: ledgerEntry.id
  };
}
