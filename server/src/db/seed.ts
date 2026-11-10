import { initDatabase, execute, queryAll, queryOne } from './database';
import { recordLedgerEntry } from '../services/auditLedger';

export async function seedHeroDemoData(): Promise<void> {
  await initDatabase();

  // Clear existing demo data
  await execute(`DELETE FROM ledger_entries`);
  await execute(`DELETE FROM webhook_events`);
  await execute(`DELETE FROM reminders`);
  await execute(`DELETE FROM approvals`);
  await execute(`DELETE FROM agent_decisions`);
  await execute(`DELETE FROM messages`);
  await execute(`DELETE FROM payment_requests`);
  await execute(`DELETE FROM payouts`);
  await execute(`DELETE FROM contributions`);
  await execute(`DELETE FROM cycles`);
  await execute(`DELETE FROM circle_members`);
  await execute(`DELETE FROM circle_policies`);
  await execute(`DELETE FROM circles`);
  await execute(`DELETE FROM users`);

  console.log('Seeding ROSCOPAL Hero Demo scenario...');

  // 1. Create Users
  const users = [
    { id: 'usr-ada', name: 'Adaeze Okonkwo', email: 'ada@roscopal.demo', role: 'organizer', paypal_email: 'ada-organizer@roscopal.demo', location: 'London, UK' },
    { id: 'usr-chidi', name: 'Chidi Anozie', email: 'chidi@roscopal.demo', role: 'member', paypal_email: 'chidi-recipient@roscopal.demo', location: 'Lagos, Nigeria' },
    { id: 'usr-amara', name: 'Amara Johnson', email: 'amara@roscopal.demo', role: 'member', paypal_email: 'amara@roscopal.demo', location: 'Houston, USA' },
    { id: 'usr-kwame', name: 'Kwame Mensah', email: 'kwame@roscopal.demo', role: 'member', paypal_email: 'kwame@roscopal.demo', location: 'Toronto, Canada' },
    { id: 'usr-fatima', name: 'Fatima Bello', email: 'fatima@roscopal.demo', role: 'member', paypal_email: 'fatima@roscopal.demo', location: 'London, UK' },
    { id: 'usr-david', name: 'David Chen', email: 'david@roscopal.demo', role: 'member', paypal_email: 'david@roscopal.demo', location: 'Houston, USA' },
    { id: 'usr-zainab', name: 'Zainab Balogun', email: 'zainab@roscopal.demo', role: 'member', paypal_email: 'zainab@roscopal.demo', location: 'Lagos, Nigeria' },
    { id: 'usr-marcus', name: 'Marcus Taylor', email: 'marcus@roscopal.demo', role: 'member', paypal_email: 'marcus@roscopal.demo', location: 'Toronto, Canada' },
  ];

  for (const u of users) {
    await execute(
      `INSERT INTO users (id, name, email, role, paypal_email, location, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, u.role, u.paypal_email, u.location, '2026-11-01T10:00:00.000Z']
    );
  }

  // 2. Create Ada's Circle
  const circleId = 'circle-diaspora-8';
  await execute(
    `INSERT INTO circles (id, name, tagline, organizer_id, status, current_cycle_number, created_at)
     VALUES (?, ?, ?, ?, 'active', 1, ?)`,
    [
      circleId,
      'Global Diaspora Heritage Circle',
      'Eight friends across four global cities saving $100/mo',
      'usr-ada',
      '2026-11-01T10:05:00.000Z'
    ]
  );

  // 3. Circle Policy
  await execute(
    `INSERT INTO circle_policies (
      circle_id, currency, contribution_amount, cadence, start_date, total_cycles,
      members_count, order_rule, grace_days, payout_condition, shortfall_policy, max_extensions_per_member
    ) VALUES (?, 'USD', 100, 'monthly', '2026-12-01', 8, 8, 'draw_with_requests', 5, 'all_paid', 'group_vote', 1)`,
    [circleId]
  );

  // Record Genesis Block in Ledger
  await recordLedgerEntry({
    circleId,
    eventType: 'GENESIS',
    memberName: 'Adaeze Okonkwo',
    recipientName: 'ALL_MEMBERS',
    cycleNumber: 0,
    amount: 0,
    paymentStatus: 'INITIALIZED',
    paypalRef: 'GENESIS_BLOCK',
    auditStatus: 'VERIFIED',
    metadata: {
      circleName: 'Global Diaspora Heritage Circle',
      organizer: 'Adaeze Okonkwo',
      membersCount: 8,
      contributionAmount: 100
    }
  });

  // 4. Circle Members with turn allocations
  const memberConfigs = [
    { id: 'mem-1', userId: 'usr-chidi', turn: 1 },
    { id: 'mem-2', userId: 'usr-amara', turn: 2 },
    { id: 'mem-3', userId: 'usr-kwame', turn: 3 },
    { id: 'mem-4', userId: 'usr-fatima', turn: 4 },
    { id: 'mem-5', userId: 'usr-david', turn: 5 },
    { id: 'mem-6', userId: 'usr-zainab', turn: 6 },
    { id: 'mem-7', userId: 'usr-marcus', turn: 7 },
    { id: 'mem-8', userId: 'usr-ada', turn: 8 }
  ];

  for (const m of memberConfigs) {
    await execute(
      `INSERT INTO circle_members (id, circle_id, user_id, turn_order, status, joined_at)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [m.id, circleId, m.userId, m.turn, '2026-11-01T10:10:00.000Z']
    );
  }

  // 5. Create 8 Cycles
  const cycleDates = [
    { num: 1, due: '2026-12-01', payout: '2026-12-03', recipientMem: 'mem-1', status: 'open' },
    { num: 2, due: '2027-01-01', payout: '2027-01-03', recipientMem: 'mem-2', status: 'pending' },
    { num: 3, due: '2027-02-01', payout: '2027-02-03', recipientMem: 'mem-3', status: 'pending' },
    { num: 4, due: '2027-03-01', payout: '2027-03-03', recipientMem: 'mem-4', status: 'pending' },
    { num: 5, due: '2027-04-01', payout: '2027-04-03', recipientMem: 'mem-5', status: 'pending' },
    { num: 6, due: '2027-05-01', payout: '2027-05-03', recipientMem: 'mem-6', status: 'pending' },
    { num: 7, due: '2027-06-01', payout: '2027-06-03', recipientMem: 'mem-7', status: 'pending' },
    { num: 8, due: '2027-07-01', payout: '2027-07-03', recipientMem: 'mem-8', status: 'pending' }
  ];

  for (const c of cycleDates) {
    await execute(
      `INSERT INTO cycles (id, circle_id, cycle_number, recipient_member_id, due_date, payout_date, status, target_pot_amount, collected_amount, paid_out_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, 800, 0, 0)`,
      [`cycle-${c.num}`, circleId, c.num, c.recipientMem, c.due, c.payout, c.status]
    );
  }

  // 6. Seed contributions for Cycle 1
  const paidMembers = [
    { memId: 'mem-1', name: 'Chidi Anozie', ppOrder: 'ORDER-PP-098172', ppCap: 'CAP-998271', time: '2026-11-04T14:22:00.000Z' },
    { memId: 'mem-8', name: 'Adaeze Okonkwo', ppOrder: 'ORDER-PP-109283', ppCap: 'CAP-998272', time: '2026-11-04T15:10:00.000Z' },
    { memId: 'mem-2', name: 'Amara Johnson', ppOrder: 'ORDER-PP-210394', ppCap: 'CAP-998273', time: '2026-11-04T16:45:00.000Z' },
    { memId: 'mem-3', name: 'Kwame Mensah', ppOrder: 'ORDER-PP-321405', ppCap: 'CAP-998274', time: '2026-11-05T09:15:00.000Z' },
    { memId: 'mem-6', name: 'Zainab Balogun', ppOrder: 'ORDER-PP-432516', ppCap: 'CAP-998275', time: '2026-11-05T11:30:00.000Z' },
    { memId: 'mem-7', name: 'Marcus Taylor', ppOrder: 'ORDER-PP-543627', ppCap: 'CAP-998276', time: '2026-11-05T13:00:00.000Z' }
  ];

  let collected = 0;
  for (const p of paidMembers) {
    const contrId = 'CONTR-' + p.ppCap;
    await execute(
      `INSERT INTO contributions (id, circle_id, cycle_id, member_id, amount, currency, status, paypal_order_id, paypal_capture_id, payment_method, completed_at, created_at)
       VALUES (?, ?, 'cycle-1', ?, 100, 'USD', 'completed', ?, ?, 'paypal_sandbox', ?, ?)`,
      [contrId, circleId, p.memId, p.ppOrder, p.ppCap, p.time, p.time]
    );

    await recordLedgerEntry({
      circleId,
      eventType: 'CONTRIBUTION_RECEIVED',
      memberName: p.name,
      recipientName: 'Chidi Anozie (Pot Hold)',
      cycleNumber: 1,
      amount: 100,
      paymentStatus: 'CONFIRMED',
      paypalRef: p.ppCap,
      auditStatus: 'VERIFIED',
      metadata: {
        orderId: p.ppOrder,
        completedAt: p.time
      }
    });

    collected += 100;
  }

  await execute(`UPDATE cycles SET collected_amount = ? WHERE id = 'cycle-1'`, [collected]);

  await execute(
    `INSERT INTO agent_decisions (id, circle_id, trigger_event, proposed_action, policy_check_result, status, rationale, created_at)
     VALUES (?, ?, 'EXTENSION_REQUEST', 'HOLD_POT_UNTIL_DEC_05', 'PASSED_GRACE_WINDOW', 'approved', 'Fatima requested +4 day extension to Dec 5. Within 5-day circle grace policy.', ?)`,
    ['DEC-FATIMA-EXT', circleId, '2026-11-05T18:00:00.000Z']
  );

  await recordLedgerEntry({
    circleId,
    eventType: 'EXTENSION_GRANTED',
    memberName: 'Fatima Bello',
    recipientName: 'Adaeze Okonkwo (Organizer Approved)',
    cycleNumber: 1,
    amount: 0,
    paymentStatus: 'EXTENSION_ACTIVE_UNTIL_DEC_05',
    paypalRef: 'GRACE_POLICY_WINDOW_5D',
    auditStatus: 'VERIFIED',
    metadata: {
      originalDue: '2026-12-01',
      extendedDue: '2026-12-05',
      policyMax: 1
    }
  });

  console.log(`Seeding complete. Diaspora circle seeded with 8 members, $${collected} collected for Cycle 1.`);
}
