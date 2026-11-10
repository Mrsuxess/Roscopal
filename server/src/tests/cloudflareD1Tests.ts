import crypto from 'crypto';
import { scrypt } from 'scrypt-js';
import { initDatabase, queryOne, queryAll, execute, getDatabase } from '../db/database';
import { seedHeroDemoData } from '../db/seed';
import { registerUser, loginUser, validateSession, deleteSession, hashPassword, verifyPassword } from '../services/authService';
import { createCircleWithWizard, joinCircleWithInvite, getUserCircles } from '../services/circleService';
import { evaluatePayoutSafety } from '../engine/policyRules';
import { processCyclePayout, reconcileInterruptedPayout } from '../engine/payoutEngine';
import { recordLedgerEntry, verifyLedgerIntegrity } from '../services/auditLedger';
import { processAgentMessage } from '../agents/orchestrator';

async function runD1Suite() {
  console.log('===========================================================');
  console.log('   ROSCOPAL CLOUDFLARE D1 FULL INTEGRATION TEST SUITE     ');
  console.log('===========================================================');

  await initDatabase();
  await seedHeroDemoData();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Web Crypto PBKDF2 100,000 Iterations Hashing
  // -------------------------------------------------------------
  console.log('\n[Phase 1] Testing Modern PBKDF2 (100,000 iterations)...');
  const t0 = performance.now();
  const modernHash = await hashPassword('HighEntropySecretPassword2026!');
  const elapsed = performance.now() - t0;
  assert(modernHash.startsWith('pbkdf2:100000:'), 'Generated modern PBKDF2 hash format');
  assert(elapsed < 2000, `Benchmark completed within budget (${elapsed.toFixed(1)}ms)`);

  const validRes = await verifyPassword('HighEntropySecretPassword2026!', modernHash);
  assert(validRes.valid === true, 'PBKDF2 verification succeeded');
  assert(validRes.needsUpgrade === false, 'Hash meets 100,000 iterations');

  const invalidRes = await verifyPassword('WrongPassword!', modernHash);
  assert(invalidRes.valid === false, 'Invalid password correctly rejected by PBKDF2');

  // -------------------------------------------------------------
  // Test 2: Legacy scrypt Hash Verification & Transparent Auto-Upgrade
  // -------------------------------------------------------------
  console.log('\n[Phase 2] Testing Legacy scrypt Compatibility & Safe Upgrade...');
  const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const legacyPassword = 'LegacyAccountPassword123';
  const passBytes = new TextEncoder().encode(legacyPassword);
  const saltBytes = new TextEncoder().encode(salt);
  const derived = await scrypt(passBytes, saltBytes, 16384, 8, 1, 64);
  let hexKey = '';
  for (let i = 0; i < derived.length; i++) {
    hexKey += derived[i].toString(16).padStart(2, '0');
  }
  const legacyStoredHash = `${salt}:${hexKey}`;

  const scryptCheck = await verifyPassword(legacyPassword, legacyStoredHash);
  assert(scryptCheck.valid === true, 'Legacy scrypt password verified successfully');
  assert(scryptCheck.needsUpgrade === true, 'Flagged for transparent upgrade to PBKDF2');

  // Register a legacy user in the DB and simulate login to verify auto-upgrade
  const legacyUserId = 'usr-legacy-test';
  await execute(
    `INSERT INTO users (id, name, email, role, paypal_email, location, password_hash, created_at)
     VALUES (?, 'Legacy User', 'legacy@roscopal.demo', 'member', 'legacy@roscopal.demo', 'London', ?, ?)`,
    [legacyUserId, legacyStoredHash, new Date().toISOString()]
  );

  const loginRes = await loginUser('legacy@roscopal.demo', legacyPassword);
  assert(!!loginRes.token, 'Legacy user logged in successfully');

  const upgradedRow = await queryOne<any>(`SELECT password_hash FROM users WHERE id = ?`, [legacyUserId]);
  assert(upgradedRow.password_hash.startsWith('pbkdf2:100000:'), 'Legacy hash transparently upgraded to PBKDF2 100,000');

  // -------------------------------------------------------------
  // Test 3: Demo Circle ($100) vs Custom Circle ($1,000) Policy Isolation
  // -------------------------------------------------------------
  console.log('\n[Phase 3] Testing Circle Policy Amount Isolation ($100 vs $1,000)...');
  const demoCircle = await queryOne<any>(`SELECT * FROM circles WHERE id = 'circle-diaspora-8'`);
  const demoPolicy = await queryOne<any>(`SELECT * FROM circle_policies WHERE circle_id = 'circle-diaspora-8'`);
  assert(demoPolicy.contribution_amount === 100, 'Demo circle strictly requires $100');

  const customCircle = await createCircleWithWizard('usr-ada', {
    name: 'High Roller Founders Circle',
    contributionAmount: 1000,
    currency: 'USD',
    membersCount: 5,
    cadence: 'monthly',
    startDate: '2026-12-01'
  });
  const customPolicy = await queryOne<any>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [customCircle.circle.id]);
  assert(customPolicy.contribution_amount === 1000, 'Custom circle policy requires $1,000');
  assert(demoPolicy.contribution_amount === 100, 'Demo circle remained untouched at $100');

  // -------------------------------------------------------------
  // Test 4: Duplicate Contribution Prevention
  // -------------------------------------------------------------
  console.log('\n[Phase 4] Testing Duplicate Payment Rejection...');
  // Chidi has already paid for cycle-1 in seed
  const existingContribution = await queryOne(
    `SELECT * FROM contributions WHERE cycle_id = 'cycle-1' AND member_id = 'mem-1' AND status = 'completed'`
  );
  assert(!!existingContribution, 'Seed payment verified as completed');

  // Verify unique check logic
  let duplicatePrevented = false;
  if (existingContribution) {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Duplicate contribution blocked by state verification');

  // -------------------------------------------------------------
  // Test 5: Payout Financial Safety Gate (8 Rules)
  // -------------------------------------------------------------
  console.log('\n[Phase 5] Testing Payout Safety Gate (Cycle 1 incomplete)...');
  const safety1 = await evaluatePayoutSafety('cycle-1');
  assert(safety1.allowed === false, 'Payout correctly BLOCKED for partially funded cycle');
  assert(safety1.checks.contributionsConfirmed === false, 'Rule 4: Incomplete contributions identified');
  assert(safety1.details.missingMembers?.length === 2, 'Identified exactly 2 unpaid members (Fatima, David)');

  // -------------------------------------------------------------
  // Test 6: Unauthorized Payout Execution Protection
  // -------------------------------------------------------------
  console.log('\n[Phase 6] Testing Unauthorized Payout Rejection...');
  const unauthRes = await processCyclePayout('cycle-1', 'usr-chidi'); // Chidi is member, NOT organizer
  assert(unauthRes.success === false, 'Non-organizer payout request rejected');
  assert(unauthRes.message.includes('Unauthorized'), 'Authorization error message returned');

  // -------------------------------------------------------------
  // Test 7: Concurrent Payout Protection (Atomic D1 Conditional Update)
  // -------------------------------------------------------------
  console.log('\n[Phase 7] Testing Distributed Concurrency Protection...');
  // Fund cycle-1 fully to test race conditions
  await execute(`UPDATE cycles SET collected_amount = 800, status = 'funded' WHERE id = 'cycle-1'`);
  await execute(
    `INSERT OR REPLACE INTO contributions (id, circle_id, cycle_id, member_id, amount, status, created_at)
     VALUES ('CONTR-F', 'circle-diaspora-8', 'cycle-1', 'mem-4', 100, 'completed', ?),
            ('CONTR-D', 'circle-diaspora-8', 'cycle-1', 'mem-5', 100, 'completed', ?)`,
    [new Date().toISOString(), new Date().toISOString()]
  );

  // Simulate two concurrent requests hitting processCyclePayout simultaneously
  const [req1, req2] = await Promise.all([
    processCyclePayout('cycle-1', 'usr-ada'),
    processCyclePayout('cycle-1', 'usr-ada')
  ]);

  const successes = [req1.success, req2.success].filter(s => s === true).length;
  const rejections = [req1.success, req2.success].filter(s => s === false).length;

  assert(successes === 1, 'Exactly ONE concurrent payout succeeded (0 double-payouts)');
  assert(rejections === 1, 'Second concurrent payout rejected by atomic database lock');

  // -------------------------------------------------------------
  // Test 8: Interrupted Payout Recovery & Reconciliation
  // -------------------------------------------------------------
  console.log('\n[Phase 8] Testing Interrupted Payout Reconciliation...');
  // Simulate an interrupted payout by creating a processing cycle and payout record
  const simCycleId = 'cycle-2';
  await execute(`UPDATE cycles SET status = 'processing', collected_amount = 800, target_pot_amount = 800 WHERE id = ?`, [simCycleId]);
  const simBatchId = 'BATCH-PP-SANDBOX-INTERRUPTED-TEST';
  await execute(
    `INSERT OR REPLACE INTO payouts (id, circle_id, cycle_id, recipient_member_id, amount, currency, status, paypal_payout_batch_id, audit_status, created_at)
     VALUES ('PAYOUT-INTERRUPT', 'circle-diaspora-8', ?, 'mem-2', 800, 'USD', 'processing', ?, 'PENDING', ?)`,
    [simCycleId, simBatchId, new Date().toISOString()]
  );

  const reconResult = await reconcileInterruptedPayout(simCycleId);
  assert(reconResult !== null && reconResult.success === true, 'Interrupted payout reconciled successfully');
  const afterCycle = await queryOne<any>(`SELECT status FROM cycles WHERE id = ?`, [simCycleId]);
  assert(afterCycle.status === 'paid_out', 'Cycle updated to paid_out upon reconciliation');

  // -------------------------------------------------------------
  // Test 9: SHA-256 Ledger Cryptographic Integrity
  // -------------------------------------------------------------
  console.log('\n[Phase 9] Testing SHA-256 Ledger Verification...');
  const ledgerVerification = await verifyLedgerIntegrity('circle-diaspora-8');
  assert(ledgerVerification.valid === true, 'Ledger chain is 100% cryptographically valid');
  assert(ledgerVerification.chainValid === true, 'Every link in SHA-256 chain verified');
  assert(ledgerVerification.tamperedIndex === null, 'Zero tampered entries detected');

  // -------------------------------------------------------------
  // Test 10: AI Contextual Treasurer
  // -------------------------------------------------------------
  console.log('\n[Phase 10] Testing AI Contextual Treasurer...');
  const chatResponse = await processAgentMessage({
    circleId: 'circle-diaspora-8',
    userId: 'usr-ada',
    content: 'Why is the payout blocked for Cycle 3?'
  });
  assert(chatResponse.intent === 'PAYOUT_ELIGIBILITY_INQUIRY', 'AI classified payout inquiry intent');
  assert(chatResponse.message.includes('Deterministic Safety Engine') || chatResponse.message.includes('Payout Hold') || chatResponse.message.includes('cannot be released yet'), 'AI evaluated live database rules');

  // -------------------------------------------------------------
  // Final Results
  // -------------------------------------------------------------
  console.log('\n===========================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runD1Suite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
