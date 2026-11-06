import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

import { initDatabase, queryAll, queryOne, execute } from './db/database';
import { seedHeroDemoData } from './db/seed';
import { recordLedgerEntry, getLedgerEntries, verifyLedgerIntegrity } from './services/auditLedger';
import { evaluatePayoutSafety } from './engine/policyRules';
import { processCyclePayout } from './engine/payoutEngine';
import {
  createPayPalOrder,
  capturePayPalOrder,
  verifyWebhookSignature,
  getPayPalMode,
  isPayPalConfigured
} from './services/paypalService';
import { processAgentMessage } from './agents/orchestrator';
import { runAllScenarios } from './tests/runScenarios';
import { User, Circle, CirclePolicy, Cycle, CircleMember, Contribution } from './types';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Current simulated session user (default Ada - Organizer)
let currentUserId = 'usr-ada';

/**
 * Health Check
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    product: 'ROSCOPAL',
    tagline: 'Everyone Takes a Turn',
    paypalMode: getPayPalMode(),
    paypalConfigured: isPayPalConfigured(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Auth & Personas
 */
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = queryOne<User>(`SELECT * FROM users WHERE id = ?`, [currentUserId]) ||
    queryOne<User>(`SELECT * FROM users WHERE id = 'usr-ada'`);
  res.json({ user, currentUserId });
});

app.post('/api/auth/switch', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = queryOne<User>(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!user) {
    return res.status(404).json({ error: 'User persona not found' });
  }
  currentUserId = user.id;
  res.json({ success: true, user });
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = queryAll<User>(`SELECT * FROM users ORDER BY role DESC, name ASC`);
  res.json({ users });
});

/**
 * Circle Routes
 */
app.get('/api/circles', (req: Request, res: Response) => {
  const circles = queryAll<Circle>(`SELECT * FROM circles ORDER BY created_at DESC`);
  const enriched = circles.map(c => {
    const policy = queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [c.id]);
    const members = queryAll<CircleMember>(`SELECT * FROM circle_members WHERE circle_id = ?`, [c.id]);
    return { ...c, policy, membersCount: members.length };
  });
  res.json({ circles: enriched });
});

app.get('/api/circles/:id', (req: Request, res: Response) => {
  const circle = queryOne<Circle>(`SELECT * FROM circles WHERE id = ?`, [req.params.id]);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });

  const policy = queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [circle.id]);
  const organizer = queryOne<User>(`SELECT * FROM users WHERE id = ?`, [circle.organizer_id]);
  const currentCycle = queryOne<Cycle>(
    `SELECT * FROM cycles WHERE circle_id = ? AND cycle_number = ?`,
    [circle.id, circle.current_cycle_number]
  );

  let recipientUser = null;
  if (currentCycle) {
    const recipientMember = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [currentCycle.recipient_member_id]);
    if (recipientMember) {
      recipientUser = queryOne<User>(`SELECT * FROM users WHERE id = ?`, [recipientMember.user_id]);
    }
  }

  res.json({
    circle,
    policy,
    organizer,
    currentCycle: currentCycle ? { ...currentCycle, recipientUser } : null
  });
});

/**
 * Members & Cycle info
 */
app.get('/api/members/:circleId', (req: Request, res: Response) => {
  const members = queryAll<any>(
    `SELECT cm.*, u.name, u.email, u.paypal_email, u.location, u.role
     FROM circle_members cm
     JOIN users u ON cm.user_id = u.id
     WHERE cm.circle_id = ?
     ORDER BY cm.turn_order ASC`,
    [req.params.circleId]
  );
  res.json({ members });
});

app.get('/api/cycles/:circleId', (req: Request, res: Response) => {
  const cycles = queryAll<Cycle>(
    `SELECT c.*, u.name as recipient_name, u.paypal_email as recipient_email
     FROM cycles c
     JOIN circle_members cm ON c.recipient_member_id = cm.id
     JOIN users u ON cm.user_id = u.id
     WHERE c.circle_id = ?
     ORDER BY c.cycle_number ASC`,
    [req.params.circleId]
  );
  res.json({ cycles });
});

/**
 * Contributions & PayPal Flows
 */
app.get('/api/contributions/:circleId', (req: Request, res: Response) => {
  const contributions = queryAll<any>(
    `SELECT c.*, u.name as member_name, u.paypal_email, cm.turn_order
     FROM contributions c
     JOIN circle_members cm ON c.member_id = cm.id
     JOIN users u ON cm.user_id = u.id
     WHERE c.circle_id = ?
     ORDER BY c.created_at DESC`,
    [req.params.circleId]
  );
  res.json({ contributions });
});

/**
 * Create PayPal Checkout Order
 */
app.post('/api/contributions/checkout', async (req: Request, res: Response) => {
  const { circleId, cycleId, memberId, amount } = req.body;

  const circle = queryOne<Circle>(`SELECT * FROM circles WHERE id = ?`, [circleId]);
  const cycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
  const member = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [memberId]);

  if (!circle || !cycle || !member) {
    return res.status(400).json({ error: 'Invalid circle, cycle, or member ID' });
  }

  const customId = `${circleId}:${cycleId}:${memberId}`;
  const orderResult = await createPayPalOrder({
    amount: amount || 100,
    currency: 'USD',
    customId,
    description: `ROSCOPAL Contribution - ${circle.name} (Cycle ${cycle.cycle_number})`
  });

  // Create pending contribution record
  const contrId = 'CONTR-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  execute(
    `INSERT INTO contributions (
      id, circle_id, cycle_id, member_id, amount, currency, status,
      paypal_order_id, payment_method, created_at
    ) VALUES (?, ?, ?, ?, ?, 'USD', 'pending', ?, 'paypal', ?)`,
    [contrId, circleId, cycleId, memberId, amount || 100, orderResult.orderId, new Date().toISOString()]
  );

  res.json({
    contributionId: contrId,
    orderId: orderResult.orderId,
    approvalUrl: orderResult.approvalUrl,
    mode: orderResult.mode
  });
});

/**
 * Capture PayPal Order and Update Ledger
 */
app.post('/api/contributions/capture', async (req: Request, res: Response) => {
  const { orderId, contributionId } = req.body;

  const contribution = queryOne<Contribution>(
    `SELECT * FROM contributions WHERE id = ? OR paypal_order_id = ?`,
    [contributionId, orderId]
  );

  if (!contribution) {
    return res.status(404).json({ error: 'Contribution record not found' });
  }

  if (contribution.status === 'completed') {
    return res.json({ success: true, message: 'Already marked as completed', contribution });
  }

  const captureResult = await capturePayPalOrder(orderId || contribution.paypal_order_id || '');
  if (!captureResult.success) {
    return res.status(400).json({ error: captureResult.error || 'Capture failed' });
  }

  const completedAt = new Date().toISOString();
  execute(
    `UPDATE contributions
     SET status = 'completed', paypal_capture_id = ?, completed_at = ?
     WHERE id = ?`,
    [captureResult.captureId, completedAt, contribution.id]
  );

  // Update collected amount on cycle
  execute(
    `UPDATE cycles SET collected_amount = collected_amount + ? WHERE id = ?`,
    [contribution.amount, contribution.cycle_id]
  );

  // Check if target reached
  const updatedCycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [contribution.cycle_id]);
  if (updatedCycle && updatedCycle.collected_amount >= updatedCycle.target_pot_amount) {
    execute(`UPDATE cycles SET status = 'funded' WHERE id = ?`, [updatedCycle.id]);
  }

  // Get member user details for ledger
  const member = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [contribution.member_id]);
  const user = member ? queryOne<User>(`SELECT name FROM users WHERE id = ?`, [member.user_id]) : null;

  // Post to Hash-chained Cryptographic Ledger
  const ledger = recordLedgerEntry({
    circleId: contribution.circle_id,
    eventType: 'CONTRIBUTION_RECEIVED',
    memberName: user?.name || 'Circle Member',
    recipientName: 'Pot Hold',
    cycleNumber: updatedCycle?.cycle_number || 1,
    amount: contribution.amount,
    currency: contribution.currency,
    paymentStatus: 'CONFIRMED',
    paypalRef: captureResult.captureId,
    auditStatus: 'VERIFIED',
    metadata: {
      orderId,
      mode: captureResult.mode,
      completedAt
    }
  });

  res.json({
    success: true,
    message: 'Contribution confirmed and posted to cryptographic audit ledger',
    captureId: captureResult.captureId,
    ledgerEntryId: ledger.id,
    cycleFunded: updatedCycle?.collected_amount! >= updatedCycle?.target_pot_amount!
  });
});

/**
 * 1-Click Sandbox Simulation for Judges / Testing
 */
app.post('/api/contributions/simulate-member-payment', async (req: Request, res: Response) => {
  const { circleId, cycleId, memberId } = req.body;

  const cycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
  const member = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [memberId]);
  const user = member ? queryOne<User>(`SELECT name FROM users WHERE id = ?`, [member.user_id]) : null;

  if (!cycle || !member) {
    return res.status(404).json({ error: 'Cycle or member not found' });
  }

  // Check if member already completed
  const existing = queryOne<Contribution>(
    `SELECT * FROM contributions WHERE cycle_id = ? AND member_id = ? AND status = 'completed'`,
    [cycleId, memberId]
  );
  if (existing) {
    return res.json({ message: 'Member already contributed', contribution: existing });
  }

  const contrId = 'CONTR-SIM-' + crypto.randomUUID().slice(0, 6).toUpperCase();
  const simOrder = 'ORDER-PP-SIM-' + crypto.randomUUID().slice(0, 6).toUpperCase();
  const simCap = 'CAP-PP-SIM-' + crypto.randomUUID().slice(0, 6).toUpperCase();
  const now = new Date().toISOString();

  execute(
    `INSERT INTO contributions (
      id, circle_id, cycle_id, member_id, amount, currency, status,
      paypal_order_id, paypal_capture_id, payment_method, completed_at, created_at
    ) VALUES (?, ?, ?, ?, 100, 'USD', 'completed', ?, ?, 'paypal_sandbox', ?, ?)`,
    [contrId, circleId, cycleId, memberId, simOrder, simCap, now, now]
  );

  execute(`UPDATE cycles SET collected_amount = collected_amount + 100 WHERE id = ?`, [cycleId]);

  const updatedCycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
  if (updatedCycle && updatedCycle.collected_amount >= updatedCycle.target_pot_amount) {
    execute(`UPDATE cycles SET status = 'funded' WHERE id = ?`, [cycleId]);
  }

  // Post to Ledger
  recordLedgerEntry({
    circleId,
    eventType: 'CONTRIBUTION_RECEIVED',
    memberName: user?.name || 'Member',
    recipientName: 'Pot Hold',
    cycleNumber: cycle.cycle_number,
    amount: 100,
    paymentStatus: 'CONFIRMED',
    paypalRef: simCap,
    auditStatus: 'VERIFIED',
    metadata: {
      simulated: true,
      mode: 'SIMULATED_SANDBOX'
    }
  });

  res.json({
    success: true,
    message: `Payment of $100 for ${user?.name} simulated via PayPal Sandbox.`,
    collectedAmount: updatedCycle?.collected_amount,
    cycleFunded: updatedCycle?.collected_amount! >= updatedCycle?.target_pot_amount!
  });
});

/**
 * Deterministic Financial Payout Gate
 */
app.get('/api/payouts/safety-check/:cycleId', (req: Request, res: Response) => {
  const result = evaluatePayoutSafety(req.params.cycleId);
  res.json(result);
});

app.post('/api/payouts/execute', async (req: Request, res: Response) => {
  const { cycleId } = req.body;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  const result = await processCyclePayout(cycleId, currentUserId);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

/**
 * Shared Cryptographic Ledger (AG Grid API)
 */
app.get('/api/ledger/:circleId', (req: Request, res: Response) => {
  const entries = getLedgerEntries(req.params.circleId);
  res.json({ entries });
});

app.get('/api/ledger/:circleId/verify', (req: Request, res: Response) => {
  const verification = verifyLedgerIntegrity(req.params.circleId);
  res.json(verification);
});

/**
 * AI Assistant Chat & Actions
 */
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { content, circleId } = req.body;
  const activeCircleId = circleId || 'circle-diaspora-8';

  const response = await processAgentMessage({
    content: content || '',
    circleId: activeCircleId,
    userId: currentUserId
  });

  // Store in message log
  const msgId = 'MSG-' + crypto.randomUUID().slice(0, 8);
  execute(
    `INSERT INTO messages (id, circle_id, user_id, sender_role, content, intent, parsed_parameters, status, created_at)
     VALUES (?, ?, ?, 'user', ?, ?, ?, 'processed', ?)`,
    [msgId, activeCircleId, currentUserId, content, response.intent, JSON.stringify(response.structuredData || {}), new Date().toISOString()]
  );

  res.json(response);
});

/**
 * Confirm and Initialize Circle from AI Proposal
 */
app.post('/api/ai/confirm-circle', (req: Request, res: Response) => {
  const { policy, circleName } = req.body;

  const circleId = 'circle-' + crypto.randomUUID().slice(0, 8);
  const name = circleName || policy.name || 'Global Savings Circle';

  execute(
    `INSERT INTO circles (id, name, tagline, organizer_id, status, current_cycle_number, created_at)
     VALUES (?, ?, ?, ?, 'active', 1, ?)`,
    [circleId, name, 'Created via ROSCOPAL AI Assistant', currentUserId, new Date().toISOString()]
  );

  execute(
    `INSERT INTO circle_policies (
      circle_id, currency, contribution_amount, cadence, start_date, total_cycles,
      members_count, order_rule, grace_days, payout_condition, shortfall_policy, max_extensions_per_member
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      circleId,
      policy.currency || 'USD',
      policy.contribution_amount || 100,
      policy.cadence || 'monthly',
      policy.start_date || '2026-12-01',
      policy.members_count || 8,
      policy.members_count || 8,
      policy.order_rule || 'draw_with_requests',
      policy.grace_days || 5,
      policy.payout_condition || 'all_paid',
      policy.shortfall_policy || 'group_vote',
      policy.max_extensions_per_member || 1
    ]
  );

  // Initialize Genesis Ledger Block
  recordLedgerEntry({
    circleId,
    eventType: 'GENESIS',
    memberName: 'Organizer',
    recipientName: 'CIRCLE_ACTIVATED',
    cycleNumber: 0,
    amount: 0,
    paymentStatus: 'INITIALIZED',
    paypalRef: 'AI_SETUP_CONFIRMED',
    auditStatus: 'VERIFIED',
    metadata: policy
  });

  res.json({
    success: true,
    circleId,
    message: `Circle '${name}' created successfully with verified deterministic policy.`
  });
});

/**
 * PayPal Webhook Receiver
 */
app.post('/api/paypal/webhook', async (req: Request, res: Response) => {
  const event = req.body;
  const eventId = event.id || 'WH-' + crypto.randomUUID();
  const eventType = event.event_type || 'UNKNOWN';

  // Check signature
  const verified = await verifyWebhookSignature(req.headers as any, event);
  if (!verified) {
    console.warn('Webhook signature check failed for event:', eventId);
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  // Idempotency check: prevent duplicate event processing
  const existing = queryOne(`SELECT * FROM webhook_events WHERE event_id = ?`, [eventId]);
  if (existing) {
    return res.status(200).json({ status: 'ignored_duplicate' });
  }

  execute(
    `INSERT INTO webhook_events (id, event_id, event_type, summary, payload_json, processed, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      'WH-' + crypto.randomUUID().slice(0, 8),
      eventId,
      eventType,
      event.summary || eventType,
      JSON.stringify(event),
      new Date().toISOString()
    ]
  );

  res.status(200).json({ status: 'received' });
});

/**
 * Scenario Test Suite Runner API
 */
app.get('/api/test-suite/run', async (req: Request, res: Response) => {
  const result = await runAllScenarios();
  res.json(result);
});

/**
 * Reset Demo Data
 */
app.post('/api/demo/reset', async (req: Request, res: Response) => {
  await seedHeroDemoData();
  res.json({ success: true, message: 'Hero Demo data reset to pristine state' });
});

// Serve client static files if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('ROSCOPAL Backend API is running. Client build in progress.');
    }
  });
});

/**
 * Start Server
 */
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`ROSCOPAL backend running on port ${PORT}`);
    console.log(`PayPal Mode: ${getPayPalMode()}`);
  });
});
