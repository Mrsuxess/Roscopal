import { registerUser, loginUser, validateSession, deleteSession } from '../services/authService';
import { createCircleWithWizard, getInvitationDetails, joinCircleWithInvite, getUserCircles } from '../services/circleService';
import { initDatabase } from '../db/database';

async function runTests() {
  console.log('--- Starting Auth & Circle Wizard Integration Tests ---');
  await initDatabase();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();
    const organizerEmail = `organizer_${timestamp}@roscopal.io`;
    const memberEmail = `member_${timestamp}@roscopal.io`;
    const password = 'SecurePassword123!';

    // TEST 1: Register organizer
    console.log('\n[1] Testing User Registration (PBKDF2 600,000 iterations)...');
    const regResult = await registerUser({
      name: 'Amara Okafor',
      email: organizerEmail,
      password: password
    });
    assert(!!regResult.user.id, 'Organizer registered with ID');
    assert(regResult.user.email === organizerEmail, 'Email matches');
    assert(!!regResult.token, 'Session token issued');

    // TEST 2: Duplicate registration rejection
    let dupCaught = false;
    try {
      await registerUser({
        name: 'Duplicate',
        email: organizerEmail,
        password: password
      });
    } catch (err: any) {
      dupCaught = true;
      assert(err.message.includes('already exists'), 'Duplicate registration rejected');
    }
    assert(dupCaught, 'Exception thrown on duplicate registration');

    // TEST 3: Login with correct password
    console.log('\n[2] Testing Authentication...');
    const loginResult = await loginUser(organizerEmail, password);
    assert(loginResult.user.id === regResult.user.id, 'Login successful with matching user ID');
    assert(!!loginResult.token, 'Session token created on login');

    // TEST 4: Login with incorrect password
    let badPassCaught = false;
    try {
      await loginUser(organizerEmail, 'WrongPassword!');
    } catch (err: any) {
      badPassCaught = true;
      assert(err.message.includes('Invalid email or password'), 'Wrong password rejected');
    }
    assert(badPassCaught, 'Exception thrown on wrong password');

    // TEST 5: Validate and revoke session
    const sessionUser = await validateSession(loginResult.token);
    assert(sessionUser?.id === regResult.user.id, 'Session validates successfully');
    await deleteSession(loginResult.token);
    const expiredUser = await validateSession(loginResult.token);
    assert(expiredUser === null, 'Session revoked after logout');

    // TEST 6: Register Member
    const memberResult = await registerUser({
      name: 'Kwame Mensah',
      email: memberEmail,
      password: password
    });
    assert(!!memberResult.user.id, 'Second member registered successfully');

    // TEST 7: Circle Creation Wizard
    console.log('\n[3] Testing Circle Creation Wizard...');
    const circleData = await createCircleWithWizard(regResult.user.id, {
      name: 'Lagos Tech Founders Susu',
      description: 'Monthly savings pool for early-stage founders',
      contributionAmount: 250,
      currency: 'USD',
      membersCount: 3,
      cadence: 'monthly',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      tradition: 'susu',
      country: 'NG',
      isPublic: true,
      graceDays: 2
    });

    assert(!!circleData.circle.id, 'Circle created with ID');
    assert(circleData.inviteCode.startsWith('RSC-'), `Valid invite code generated: ${circleData.inviteCode}`);
    assert(circleData.circle.membersCount === 1, 'Organizer registered as initial member');
    assert(circleData.circle.policy?.members_count === 3, 'Policy specifies 3 members');
    assert(circleData.circle.policy?.contribution_amount === 250, 'Contribution amount is 250');

    // TEST 8: Invalid constraints
    let invalidCaught = false;
    try {
      await createCircleWithWizard(regResult.user.id, {
        name: 'Invalid Circle',
        contributionAmount: -10,
        currency: 'USD',
        membersCount: 1, // Minimum is 2
        cadence: 'monthly',
        startDate: new Date().toISOString()
      });
    } catch (err: any) {
      invalidCaught = true;
      assert(true, `Invalid parameters rejected: ${err.message}`);
    }
    assert(invalidCaught, 'Exception thrown on invalid circle params');

    // TEST 9: Public Invitation Preview
    console.log('\n[4] Testing Circle Invitation & Joining...');
    const preview = await getInvitationDetails(circleData.inviteCode);
    assert(preview.circleId === circleData.circle.id, 'Preview matches circle ID');
    assert(preview.availableSlots === 2, 'Available slots correctly shows 2');
    assert(preview.organizerName === 'Amara Okafor', 'Organizer name visible on preview');
    assert(preview.targetPot === 750, 'Target pot correctly calculated (250 * 3 = 750)');

    // TEST 10: Member Joins via Invite Code
    const joinResult = await joinCircleWithInvite(circleData.inviteCode, memberResult.user.id);
    assert(!!joinResult.member.id, 'Member joined successfully');
    assert(joinResult.member.turn_order === 2, 'Member allocated turn 2');

    const previewAfterJoin = await getInvitationDetails(circleData.inviteCode);
    assert(previewAfterJoin.availableSlots === 1, 'Available slots decremented to 1');

    // TEST 11: Duplicate Join Prevention
    let dupJoinCaught = false;
    try {
      await joinCircleWithInvite(circleData.inviteCode, memberResult.user.id);
    } catch (err: any) {
      dupJoinCaught = true;
      assert(err.message.includes('already a member'), 'Duplicate join rejected');
    }
    assert(dupJoinCaught, 'Exception thrown on duplicate circle join');

    // TEST 12: Query User Circles
    console.log('\n[5] Testing User Circles Query...');
    const organizerCircles = await getUserCircles(regResult.user.id);
    assert(organizerCircles.some(c => c.id === circleData.circle.id && c.organizer_id === regResult.user.id), 'Organizer sees circle as organizer');

    const memberCircles = await getUserCircles(memberResult.user.id);
    assert(memberCircles.some(c => c.id === circleData.circle.id), 'Member sees circle in their circle list');

    // Summary
    console.log('\n======================================');
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('======================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error running tests:', error);
    process.exit(1);
  }
}

runTests();
