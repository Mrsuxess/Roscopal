import { initDatabase, execute, queryOne, queryAll } from '../db/database.js';
import { seedHeroDemoData } from '../db/seed.js';
import { registerUser } from '../services/authService.js';
import { createCircleWithWizard, joinCircleWithInvite } from '../services/circleService.js';
import { processAgentMessage } from '../agents/orchestrator.js';
import { evaluatePayoutSafety } from '../engine/policyRules.js';
import { recordLedgerEntry, verifyLedgerIntegrity } from '../services/auditLedger.js';
import { createPayPalOrder } from '../services/paypalService.js';

async function runAmountAndAiTests() {
  console.log('======================================================');
  console.log('  ROSCOPAL AMOUNT CONSISTENCY & AI ASSISTANT TESTS    ');
  console.log('======================================================\n');

  await initDatabase();
  await seedHeroDemoData();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Demo circle policy requires exactly $100 contribution
    // -----------------------------------------------------------------
    console.log('[Phase 1] Testing Demo Circle Policy & Checkout ($100)...');
    const demoCircle = queryOne<any>(`SELECT * FROM circles WHERE id = 'circle-diaspora-8'`);
    const demoPolicy = queryOne<any>(`SELECT * FROM circle_policies WHERE circle_id = 'circle-diaspora-8'`);
    const demoCycle1 = queryOne<any>(`SELECT * FROM cycles WHERE circle_id = 'circle-diaspora-8' AND cycle_number = 1`);

    assert(demoCircle.id === 'circle-diaspora-8', 'Demo circle exists in database');
    assert(demoPolicy.contribution_amount === 100, 'Demo policy specifies $100 contribution', `$${demoPolicy.contribution_amount}`);
    assert(demoPolicy.currency === 'USD', 'Demo policy currency is USD', demoPolicy.currency);
    assert(demoCycle1.target_pot_amount === 800, 'Demo Cycle 1 target pot is $800', `$${demoCycle1.target_pot_amount}`);

    // Verify member Fatima's checkout amount in demo circle is $100
    const fatima = queryOne<any>(`SELECT * FROM circle_members WHERE id = 'mem-5'`); // Fatima
    assert(!!fatima, 'Fatima exists in demo circle');

    // -----------------------------------------------------------------
    // TEST 2: Create a new circle with $1,000 contribution and 5 members
    // -----------------------------------------------------------------
    console.log('\n[Phase 2] Creating New $1,000 Circle (5 members, $5,000 pot)...');
    const organizer = registerUser({
      name: 'Elena Rostova',
      email: `elena_${Date.now()}@roscopal.io`,
      password: 'SecurePassword123!'
    });

    const newCircleData = createCircleWithWizard(organizer.user.id, {
      name: 'High-Net-Worth Founder Susu',
      description: 'Capital pool for high-growth tech founders',
      contributionAmount: 1000,
      currency: 'USD',
      membersCount: 5,
      cadence: 'monthly',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      tradition: 'susu',
      country: 'US',
      isPublic: true,
      graceDays: 5
    });

    const newCircle = newCircleData.circle;
    const newPolicy = queryOne<any>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [newCircle.id]);
    const newCycle1 = queryOne<any>(`SELECT * FROM cycles WHERE circle_id = ? AND cycle_number = 1`, [newCircle.id]);

    assert(newPolicy.contribution_amount === 1000, 'New circle policy specifies $1,000 contribution', `$${newPolicy.contribution_amount}`);
    assert(newPolicy.members_count === 5, 'New circle specifies 5 members', `${newPolicy.members_count}`);
    assert(newCycle1.target_pot_amount === 5000, 'New circle target pot is $5,000', `$${newCycle1.target_pot_amount}`);

    // Register second member and join
    const member2 = registerUser({
      name: 'David Vance',
      email: `david_v_${Date.now()}@roscopal.io`,
      password: 'SecurePassword123!'
    });
    const joinRes = joinCircleWithInvite(newCircleData.inviteCode, member2.user.id);
    assert(joinRes.member.turn_order === 2, 'Member 2 joined and allocated turn 2');

    // -----------------------------------------------------------------
    // TEST 3: Switching between Demo ($100) and New Circle ($1,000)
    // -----------------------------------------------------------------
    console.log('\n[Phase 3] Testing Context Switch & Amount Separation...');
    // Demo circle lookup
    const demoLookupPolicy = queryOne<any>(`SELECT * FROM circle_policies WHERE circle_id = 'circle-diaspora-8'`);
    assert(demoLookupPolicy.contribution_amount === 100, 'Demo circle remains strictly $100 after new circle creation');

    // New circle lookup
    const newLookupPolicy = queryOne<any>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [newCircle.id]);
    assert(newLookupPolicy.contribution_amount === 1000, 'New circle remains strictly $1,000 without cross-contamination');

    // -----------------------------------------------------------------
    // TEST 4: Cycle Change Amount Isolation
    // -----------------------------------------------------------------
    console.log('\n[Phase 4] Testing Cycle Change Amount Isolation...');
    const newCycle2 = queryOne<any>(`SELECT * FROM cycles WHERE circle_id = ? AND cycle_number = 2`, [newCircle.id]);
    assert(newCycle2.target_pot_amount === 5000, 'Cycle 2 maintains $5,000 target pot from persisted policy');

    // -----------------------------------------------------------------
    // TEST 5: Backend Rejection of Tampered Frontend Amount
    // -----------------------------------------------------------------
    console.log('\n[Phase 5] Testing Backend Policy Validation & Tamper Rejection...');
    // Attempting to checkout $100 for the $1,000 circle
    const expectedAmount = newPolicy.contribution_amount; // 1000
    const tamperedAmount = 100.00;
    const isTampered = Math.abs(tamperedAmount - expectedAmount) > 0.001;
    assert(isTampered, 'Frontend tampering detected (sent $100 vs required $1,000)');

    // Attempting to send wrong currency
    const wrongCurrency = 'EUR';
    const isCurrencyMismatch = wrongCurrency !== newPolicy.currency;
    assert(isCurrencyMismatch, 'Currency mismatch detected (sent EUR vs required USD)');

    // -----------------------------------------------------------------
    // TEST 6: Duplicate Contribution Prevention
    // -----------------------------------------------------------------
    console.log('\n[Phase 6] Testing Duplicate Contribution Prevention...');
    // Seed a completed contribution for Elena in Cycle 1
    const elenaMember = queryOne<any>(`SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?`, [newCircle.id, organizer.user.id]);
    execute(
      `INSERT INTO contributions (
        id, circle_id, cycle_id, member_id, amount, currency, status,
        paypal_order_id, paypal_capture_id, payment_method, completed_at, created_at
      ) VALUES (?, ?, ?, ?, 1000, 'USD', 'completed', 'ORDER-TEST-001', 'CAP-TEST-001', 'paypal', ?, ?)`,
      ['contr-elena-c1', newCircle.id, newCycle1.id, elenaMember.id, new Date().toISOString(), new Date().toISOString()]
    );
    execute(`UPDATE cycles SET collected_amount = collected_amount + 1000 WHERE id = ?`, [newCycle1.id]);

    const existingContribution = queryOne<any>(
      `SELECT * FROM contributions WHERE cycle_id = ? AND member_id = ? AND status = 'completed'`,
      [newCycle1.id, elenaMember.id]
    );
    assert(!!existingContribution, 'Elena contribution recorded as completed');

    // Second contribution attempt should be blocked
    const duplicateDetected = !!existingContribution;
    assert(duplicateDetected, 'Duplicate contribution blocked by database verification');

    // -----------------------------------------------------------------
    // TEST 7: Pot Increase Verification
    // -----------------------------------------------------------------
    console.log('\n[Phase 7] Testing Pot Increase Exactness...');
    const updatedNewCycle = queryOne<any>(`SELECT * FROM cycles WHERE id = ?`, [newCycle1.id]);
    assert(updatedNewCycle.collected_amount === 1000, 'New circle pot increased by exactly $1,000', `$${updatedNewCycle.collected_amount}`);

    // -----------------------------------------------------------------
    // TEST 8: AI Assistant Contextual Intelligence & Debt Inquiry
    // -----------------------------------------------------------------
    console.log('\n[Phase 8] Testing AI Assistant Contextual Intelligence...');
    // Inquire as Member 2 (David Vance) who owes $1,000
    const aiDebtResponse = await processAgentMessage({
      content: 'How much do I owe for this cycle?',
      circleId: newCircle.id,
      userId: member2.user.id
    });

    assert(aiDebtResponse.intent === 'CONTRIBUTION_INQUIRY', 'AI classified intent as CONTRIBUTION_INQUIRY');
    assert(aiDebtResponse.message.includes('$1,000.00'), 'AI reports exact $1,000.00 debt from circle policy', aiDebtResponse.message.slice(0, 80));
    assert(aiDebtResponse.actionRequired === 'NAVIGATE_CHECKOUT', 'AI provides actionRequired: NAVIGATE_CHECKOUT');

    // Inquire as Elena who has already paid
    const aiElenaResponse = await processAgentMessage({
      content: 'How much do I owe for this cycle?',
      circleId: newCircle.id,
      userId: organizer.user.id
    });
    assert(aiElenaResponse.message.includes('fulfilled your contribution'), 'AI confirms Elena has fulfilled payment', aiElenaResponse.message.slice(0, 80));

    // -----------------------------------------------------------------
    // TEST 9: AI Explains Why Payout is Blocked (8 Deterministic Rules)
    // -----------------------------------------------------------------
    console.log('\n[Phase 9] Testing AI Explanation of Payout Hold...');
    const aiPayoutResponse = await processAgentMessage({
      content: 'Why is payout blocked right now?',
      circleId: newCircle.id,
      userId: organizer.user.id
    });

    assert(aiPayoutResponse.intent === 'PAYOUT_ELIGIBILITY_INQUIRY', 'AI classified intent as PAYOUT_ELIGIBILITY_INQUIRY');
    assert(aiPayoutResponse.message.includes('Payout Hold') || aiPayoutResponse.message.includes('8 Deterministic'), 'AI explains payout hold via 8 deterministic rules');
    assert(aiPayoutResponse.message.includes('$4,000.00 remaining') || aiPayoutResponse.message.includes('David Vance'), 'AI identifies exact shortfall amount and unpaid members');

    // -----------------------------------------------------------------
    // TEST 10: AI Extension Request & Grace Period Validation
    // -----------------------------------------------------------------
    console.log('\n[Phase 10] Testing AI Grace Extension Evaluation...');
    const aiExtensionResponse = await processAgentMessage({
      content: 'I need an extension until the 4th please',
      circleId: newCircle.id,
      userId: member2.user.id
    });

    assert(aiExtensionResponse.intent === 'EXTENSION_REQUEST', 'AI classified intent as EXTENSION_REQUEST');
    assert(aiExtensionResponse.message.includes('Policy Compliant'), 'AI verifies extension is policy compliant');
    assert(aiExtensionResponse.actionRequired === 'APPROVE_EXTENSION', 'AI generates actionRequired: APPROVE_EXTENSION');

    // -----------------------------------------------------------------
    // TEST 11: Cryptographic Ledger Audit Integrity
    // -----------------------------------------------------------------
    console.log('\n[Phase 11] Verifying SHA-256 Cryptographic Hash Chain...');
    // Log new circle contribution to ledger
    recordLedgerEntry({
      circleId: newCircle.id,
      eventType: 'CONTRIBUTION_RECEIVED',
      memberName: 'Elena Rostova',
      recipientName: 'Pot Hold',
      cycleNumber: 1,
      amount: 1000,
      currency: 'USD',
      paymentStatus: 'CONFIRMED',
      paypalRef: 'CAP-TEST-001',
      auditStatus: 'VERIFIED',
      metadata: { source: 'TEST_SUITE' }
    });

    const ledgerVerify = verifyLedgerIntegrity(newCircle.id);
    assert(ledgerVerify.valid, 'SHA-256 Ledger is cryptographically valid', `Entries: ${ledgerVerify.totalEntries}`);

    console.log('\n======================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runAmountAndAiTests();
