import { queryOne, execute } from '../db/database';
import { evaluatePayoutSafety, PayoutSafetyCheckResult } from './policyRules';
import { recordLedgerEntry } from '../services/auditLedger';
import { executePayPalPayout, getPayoutBatchDetails } from '../services/paypalService';
import { Cycle, CircleMember, User, Payout } from '../types';

export interface PayoutExecutionResult {
  success: boolean;
  message: string;
  payoutId?: string;
  paypalBatchId?: string;
  safetyCheck: PayoutSafetyCheckResult;
  ledgerEntryId?: string;
}

/**
 * Reconcile an in-flight or interrupted payout with PayPal Sandbox
 */
export async function reconcileInterruptedPayout(cycleId: string): Promise<PayoutExecutionResult | null> {
  const existingPayout = await queryOne<Payout>(
    `SELECT * FROM payouts WHERE cycle_id = ? AND status = 'processing'`,
    [cycleId]
  );

  if (!existingPayout || !existingPayout.paypal_payout_batch_id) {
    return null;
  }

  const batchDetails = await getPayoutBatchDetails(existingPayout.paypal_payout_batch_id);
  const cycle = await queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
  const safetyCheck = await evaluatePayoutSafety(cycleId);

  if (!batchDetails) {
    return {
      success: false,
      message: 'Payout is processing. Batch status not yet available from PayPal.',
      payoutId: existingPayout.id,
      paypalBatchId: existingPayout.paypal_payout_batch_id,
      safetyCheck
    };
  }

  const batchStatus = batchDetails.batch_header?.batch_status;

  if (batchStatus === 'SUCCESS') {
    const now = new Date().toISOString();
    await execute(
      `UPDATE payouts SET status = 'completed', audit_status = 'VERIFIED', executed_at = ? WHERE id = ?`,
      [now, existingPayout.id]
    );

    if (cycle) {
      await execute(
        `UPDATE cycles SET status = 'paid_out', paid_out_amount = ? WHERE id = ?`,
        [existingPayout.amount, cycleId]
      );

      const recipientMember = await queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [cycle.recipient_member_id]);
      const recipientUser = recipientMember ? await queryOne<User>(`SELECT * FROM users WHERE id = ?`, [recipientMember.user_id]) : null;

      const ledger = await recordLedgerEntry({
        circleId: cycle.circle_id,
        eventType: 'PAYOUT_EXECUTED',
        memberName: 'ROSCOPAL_ESCROW_ENGINE',
        recipientName: recipientUser?.name || 'Cycle Recipient',
        cycleNumber: cycle.cycle_number,
        amount: existingPayout.amount,
        currency: existingPayout.currency || 'USD',
        paymentStatus: 'COMPLETED_PAYPAL_SANDBOX',
        paypalRef: existingPayout.paypal_payout_batch_id,
        auditStatus: 'VERIFIED',
        metadata: {
          payoutId: existingPayout.id,
          reconciled: true,
          paypalBatchId: existingPayout.paypal_payout_batch_id
        }
      });

      return {
        success: true,
        message: 'Interrupted payout successfully reconciled and completed.',
        payoutId: existingPayout.id,
        paypalBatchId: existingPayout.paypal_payout_batch_id,
        safetyCheck,
        ledgerEntryId: ledger.id
      };
    }
  } else if (batchStatus === 'DENIED' || batchStatus === 'CANCELED') {
    await execute(
      `UPDATE payouts SET status = 'failed', audit_status = 'FLAGGED', failure_reason = ? WHERE id = ?`,
      [`PayPal batch status: ${batchStatus}`, existingPayout.id]
    );
    if (cycle) {
      await execute(`UPDATE cycles SET status = 'funded' WHERE id = ?`, [cycleId]);
    }
    return {
      success: false,
      message: `Interrupted payout was ${batchStatus} by PayPal. Cycle reset to funded.`,
      payoutId: existingPayout.id,
      paypalBatchId: existingPayout.paypal_payout_batch_id,
      safetyCheck
    };
  }

  return {
    success: false,
    message: `Payout still processing in PayPal Sandbox (Status: ${batchStatus}).`,
    payoutId: existingPayout.id,
    paypalBatchId: existingPayout.paypal_payout_batch_id,
    safetyCheck
  };
}

export async function processCyclePayout(cycleId: string, initiatorUserId: string): Promise<PayoutExecutionResult> {
  // Step 0: Check if an interrupted payout exists and reconcile first
  const existingProcessing = await queryOne<Payout>(
    `SELECT * FROM payouts WHERE cycle_id = ? AND status = 'processing'`,
    [cycleId]
  );
  if (existingProcessing) {
    const recon = await reconcileInterruptedPayout(cycleId);
    if (recon) return recon;
  }

  const cycle = await queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
  if (!cycle) {
    return {
      success: false,
      message: 'Cycle not found.',
      safetyCheck: await evaluatePayoutSafety(cycleId)
    };
  }

  // Step 1: Organizer Authorization Check
  const circle = await queryOne<{ organizer_id: string }>(`SELECT organizer_id FROM circles WHERE id = ?`, [cycle.circle_id]);
  if (circle && initiatorUserId && circle.organizer_id !== initiatorUserId) {
    return {
      success: false,
      message: 'Unauthorized: Only the circle organizer can execute payouts for this circle.',
      safetyCheck: await evaluatePayoutSafety(cycleId)
    };
  }

  // Step 2: Deterministic Financial Safety Check (all 8 checks)
  const safetyCheck = await evaluatePayoutSafety(cycleId);

  if (!safetyCheck.allowed) {
    await recordLedgerEntry({
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
        unpaidMembers: safetyCheck.details.missingMembers,
        initiatorUserId
      }
    });

    return {
      success: false,
      message: safetyCheck.blockReason || 'Payout blocked by deterministic financial rules',
      safetyCheck
    };
  }

  // Step 3: Fetch recipient details
  const recipientMember = await queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [cycle.recipient_member_id]);
  if (!recipientMember) {
    return {
      success: false,
      message: 'Recipient member not found.',
      safetyCheck
    };
  }

  const recipientUser = await queryOne<User>(`SELECT * FROM users WHERE id = ?`, [recipientMember.user_id]);
  if (!recipientUser) {
    return {
      success: false,
      message: 'Recipient user account not found.',
      safetyCheck
    };
  }

  // Step 4: Atomic conditional update in D1 (guarantees exactly-once lock at the database layer)
  const lockResult = await execute(
    `UPDATE cycles SET status = 'processing' WHERE id = ? AND status IN ('open', 'funded')`,
    [cycleId]
  );

  if (lockResult.changes === 0) {
    return {
      success: false,
      message: 'Concurrent payout request rejected: a payout is already in progress for this cycle.',
      safetyCheck
    };
  }

  // Step 5: Insert durable execution record with idempotent batch ID BEFORE invoking PayPal
  const payoutId = 'PAYOUT-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const idempotencyKey = `PAYOUT-${cycle.circle_id}-CYC${cycle.cycle_number}`;
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO payouts (
      id, circle_id, cycle_id, recipient_member_id, amount, currency, status,
      paypal_payout_batch_id, audit_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, 'PENDING', ?)`,
    [
      payoutId,
      cycle.circle_id,
      cycle.id,
      recipientMember.id,
      cycle.target_pot_amount,
      'USD',
      idempotencyKey,
      now
    ]
  );

  // Step 6: Trigger PayPal Payout with strict idempotency key
  let paypalResult;
  try {
    paypalResult = await executePayPalPayout({
      recipientEmail: recipientUser.paypal_email,
      amount: cycle.target_pot_amount,
      currency: 'USD',
      note: `ROSCOPAL Cycle ${cycle.cycle_number} pot payout to ${recipientUser.name}`,
      senderBatchId: idempotencyKey
    });
  } catch (err: any) {
    // Worker crashed or network error: DO NOT delete record or re-execute. Record pending state for reconciliation!
    console.error('PayPal payout call threw an error. Leaving record for safe reconciliation:', err);
    return {
      success: false,
      message: 'PayPal request in progress or timed out. State preserved for automated reconciliation.',
      payoutId,
      paypalBatchId: idempotencyKey,
      safetyCheck
    };
  }

  if (!paypalResult.success) {
    // Revert status on explicit PayPal denial so it can be safely reviewed
    await execute(`UPDATE cycles SET status = 'funded' WHERE id = ?`, [cycleId]);
    await execute(
      `UPDATE payouts SET status = 'failed', failure_reason = ?, audit_status = 'FLAGGED' WHERE id = ?`,
      [paypalResult.error || 'PayPal payout execution failed', payoutId]
    );

    await recordLedgerEntry({
      circleId: cycle.circle_id,
      eventType: 'PAYOUT_INITIATED',
      memberName: 'ROSCOPAL_ESCROW_ENGINE',
      recipientName: recipientUser.name,
      cycleNumber: cycle.cycle_number,
      amount: cycle.target_pot_amount,
      paymentStatus: 'FAILED',
      paypalRef: paypalResult.batchId || 'PAYPAL_ERROR',
      auditStatus: 'FLAGGED',
      metadata: {
        payoutId,
        error: paypalResult.error
      }
    });

    return {
      success: false,
      message: `PayPal payout execution failed: ${paypalResult.error}`,
      payoutId,
      paypalBatchId: paypalResult.batchId,
      safetyCheck
    };
  }

  // Step 7: Completed payout state transition
  const batchId = paypalResult.batchId || idempotencyKey;
  const executedAt = new Date().toISOString();

  await execute(
    `UPDATE payouts SET status = 'completed', paypal_payout_batch_id = ?, paypal_payout_item_id = ?, audit_status = 'VERIFIED', executed_at = ? WHERE id = ?`,
    [batchId, paypalResult.itemId || null, executedAt, payoutId]
  );

  await execute(
    `UPDATE cycles SET status = 'paid_out', paid_out_amount = ? WHERE id = ?`,
    [cycle.target_pot_amount, cycleId]
  );

  const ledgerEntry = await recordLedgerEntry({
    circleId: cycle.circle_id,
    eventType: 'PAYOUT_EXECUTED',
    memberName: 'ROSCOPAL_ESCROW_ENGINE',
    recipientName: recipientUser.name,
    cycleNumber: cycle.cycle_number,
    amount: cycle.target_pot_amount,
    currency: 'USD',
    paymentStatus: 'COMPLETED_PAYPAL_SANDBOX',
    paypalRef: batchId,
    auditStatus: 'VERIFIED',
    metadata: {
      payoutId,
      paypalBatchId: batchId,
      recipientPaypal: recipientUser.paypal_email,
      turnOrder: recipientMember.turn_order,
      executionMode: paypalResult.mode
    }
  });

  return {
    success: true,
    message: `Successfully released $${cycle.target_pot_amount} pot to ${recipientUser.name} via PayPal Sandbox (${batchId})`,
    payoutId,
    paypalBatchId: batchId,
    safetyCheck,
    ledgerEntryId: ledgerEntry.id
  };
}
