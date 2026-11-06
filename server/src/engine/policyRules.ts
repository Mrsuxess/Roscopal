import { queryOne, queryAll } from '../db/database';
import { Circle, CirclePolicy, Cycle, CircleMember, Contribution, Payout, User } from '../types';

export interface PayoutSafetyCheckResult {
  allowed: boolean;
  blockReason?: string;
  checks: {
    circleActive: boolean;
    cycleValid: boolean;
    recipientValid: boolean;
    contributionsConfirmed: boolean;
    amountExact: boolean;
    noDuplicatePayout: boolean;
    policySatisfied: boolean;
    approvalsSatisfied: boolean;
  };
  details: {
    circleId: string;
    cycleNumber: number;
    recipientName: string;
    targetAmount: number;
    collectedAmount: number;
    contributionsCount: number;
    expectedContributions: number;
    missingMembers?: string[];
  };
}

export function evaluatePayoutSafety(cycleId: string): PayoutSafetyCheckResult {
  const cycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
  if (!cycle) {
    return {
      allowed: false,
      blockReason: `Cycle ID ${cycleId} does not exist`,
      checks: {
        circleActive: false,
        cycleValid: false,
        recipientValid: false,
        contributionsConfirmed: false,
        amountExact: false,
        noDuplicatePayout: false,
        policySatisfied: false,
        approvalsSatisfied: false
      },
      details: {
        circleId: '',
        cycleNumber: 0,
        recipientName: 'Unknown',
        targetAmount: 0,
        collectedAmount: 0,
        contributionsCount: 0,
        expectedContributions: 0
      }
    };
  }

  const circle = queryOne<Circle>(`SELECT * FROM circles WHERE id = ?`, [cycle.circle_id]);
  const policy = queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [cycle.circle_id]);
  const members = queryAll<CircleMember>(`SELECT * FROM circle_members WHERE circle_id = ? AND status != 'departed'`, [cycle.circle_id]);
  const recipient = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [cycle.recipient_member_id]);
  const recipientUser = recipient ? queryOne<User>(`SELECT * FROM users WHERE id = ?`, [recipient.user_id]) : null;

  // Check 1: Circle exists and is active
  const circleActive = !!circle && circle.status === 'active';

  // Check 2: Cycle exists and is open/funded (not already paid_out)
  const cycleValid = cycle.status === 'open' || cycle.status === 'funded';

  // Check 3: Recipient is valid active member
  const recipientValid = !!recipient && !!recipientUser && recipient.status !== 'departed';

  // Check 4 & 5: Completed contributions
  const contributions = queryAll<Contribution>(
    `SELECT * FROM contributions WHERE cycle_id = ? AND status = 'completed'`,
    [cycleId]
  );

  const totalCollected = Math.round(contributions.reduce((sum, c) => sum + Number(c.amount), 0) * 100) / 100;
  const targetAmount = Math.round(Number(cycle.target_pot_amount) * 100) / 100;

  // In a standard ROSCA, either everyone contributes (including or excluding recipient depending on pot definition,
  // in our policy: members_count * contribution_amount = target_pot_amount).
  // Everyone contributes $100.
  const expectedContributions = policy ? policy.members_count : members.length;
  
  // Find which members haven't paid
  const paidMemberIds = new Set(contributions.map(c => c.member_id));
  const unpaidMembers = members.filter(m => !paidMemberIds.has(m.id));
  const unpaidUserNames = unpaidMembers.map(m => {
    const u = queryOne<User>(`SELECT name FROM users WHERE id = ?`, [m.user_id]);
    return u ? u.name : m.id;
  });

  const contributionsConfirmed = unpaidMembers.length === 0 && totalCollected >= targetAmount;
  const amountExact = totalCollected >= targetAmount;

  // Check 6: No duplicate payout exists for this cycle
  const existingPayout = queryOne<Payout>(
    `SELECT * FROM payouts WHERE cycle_id = ? AND status IN ('completed', 'processing')`,
    [cycleId]
  );
  const noDuplicatePayout = !existingPayout;

  // Check 7: Policy satisfied
  const policySatisfied = !!policy && (
    policy.payout_condition === 'all_paid' ? contributionsConfirmed : totalCollected >= targetAmount
  );

  // Check 8: Approvals satisfied (e.g. check for any pending blocking decisions)
  const pendingBlockingDecisions = queryAll(
    `SELECT * FROM agent_decisions WHERE circle_id = ? AND status = 'proposed' AND trigger_event IN ('EXTENSION_REQUEST', 'PAYMENT_DISPUTE')`,
    [cycle.circle_id]
  );
  const approvalsSatisfied = pendingBlockingDecisions.length === 0;

  const allPassed =
    circleActive &&
    cycleValid &&
    recipientValid &&
    contributionsConfirmed &&
    amountExact &&
    noDuplicatePayout &&
    policySatisfied &&
    approvalsSatisfied;

  let blockReason: string | undefined;
  if (!circleActive) blockReason = `Circle is not active (status: ${circle?.status || 'missing'}).`;
  else if (!cycleValid) blockReason = `Cycle is already ${cycle.status}.`;
  else if (!recipientValid) blockReason = `Recipient member is invalid or inactive.`;
  else if (!noDuplicatePayout) blockReason = `Payout for cycle ${cycle.cycle_number} has already been initiated/completed (${existingPayout?.paypal_payout_batch_id}).`;
  else if (!contributionsConfirmed) blockReason = `Incomplete pot: collected $${totalCollected}/$${targetAmount}. Unpaid: ${unpaidUserNames.join(', ')}.`;
  else if (!amountExact) blockReason = `Amount mismatch: collected $${totalCollected} does not match target $${targetAmount}.`;
  else if (!approvalsSatisfied) blockReason = `Active pending dispute or extension requires organizer authorization before release.`;

  return {
    allowed: allPassed,
    blockReason,
    checks: {
      circleActive,
      cycleValid,
      recipientValid,
      contributionsConfirmed,
      amountExact,
      noDuplicatePayout,
      policySatisfied,
      approvalsSatisfied
    },
    details: {
      circleId: cycle.circle_id,
      cycleNumber: cycle.cycle_number,
      recipientName: recipientUser?.name || 'Unknown',
      targetAmount,
      collectedAmount: totalCollected,
      contributionsCount: contributions.length,
      expectedContributions,
      missingMembers: unpaidUserNames
    }
  };
}

export interface ExtensionEvaluation {
  allowed: boolean;
  reason: string;
  maxExtensions: number;
  currentExtensionsUsed: number;
  graceDays: number;
  proposedDueDate: string;
  requiresOrganizerApproval: boolean;
}

export function evaluateExtensionRequest(params: {
  circleId: string;
  memberId: string;
  cycleId: string;
  requestedDate: string;
}): ExtensionEvaluation {
  const policy = queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [params.circleId]);
  const cycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [params.cycleId]);

  if (!policy || !cycle) {
    return {
      allowed: false,
      reason: 'Circle policy or cycle not found',
      maxExtensions: 0,
      currentExtensionsUsed: 0,
      graceDays: 0,
      proposedDueDate: params.requestedDate,
      requiresOrganizerApproval: true
    };
  }

  // Count past extensions
  const pastDecisions = queryAll(
    `SELECT * FROM agent_decisions WHERE circle_id = ? AND trigger_event = 'EXTENSION_REQUEST' AND status = 'executed' AND rationale LIKE ?`,
    [params.circleId, `%${params.memberId}%`]
  );
  const used = pastDecisions.length;

  if (used >= policy.max_extensions_per_member) {
    return {
      allowed: false,
      reason: `Member has already reached the maximum limit of ${policy.max_extensions_per_member} extension(s) for this circle.`,
      maxExtensions: policy.max_extensions_per_member,
      currentExtensionsUsed: used,
      graceDays: policy.grace_days,
      proposedDueDate: params.requestedDate,
      requiresOrganizerApproval: true
    };
  }

  // Calculate days difference from cycle due date
  const dueDate = new Date(cycle.due_date);
  const reqDate = new Date(params.requestedDate);
  const diffDays = Math.ceil((reqDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > policy.grace_days) {
    return {
      allowed: false,
      reason: `Requested extension (+${diffDays} days) exceeds circle policy grace window of ${policy.grace_days} days. Requires organizer manual override.`,
      maxExtensions: policy.max_extensions_per_member,
      currentExtensionsUsed: used,
      graceDays: policy.grace_days,
      proposedDueDate: params.requestedDate,
      requiresOrganizerApproval: true
    };
  }

  return {
    allowed: true,
    reason: `Within circle grace window of ${policy.grace_days} days (${diffDays} days requested) and under member limit (${used}/${policy.max_extensions_per_member}).`,
    maxExtensions: policy.max_extensions_per_member,
    currentExtensionsUsed: used,
    graceDays: policy.grace_days,
    proposedDueDate: params.requestedDate,
    requiresOrganizerApproval: false
  };
}

export interface SwapEvaluation {
  allowed: boolean;
  reason: string;
  memberA: { id: string; name: string; turn: number };
  memberB: { id: string; name: string; turn: number };
  requiresDualConsent: boolean;
}

export function evaluateTurnSwap(params: {
  circleId: string;
  memberAId: string;
  memberBId: string;
}): SwapEvaluation {
  const memberA = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ? AND circle_id = ?`, [params.memberAId, params.circleId]);
  const memberB = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ? AND circle_id = ?`, [params.memberBId, params.circleId]);

  if (!memberA || !memberB) {
    return {
      allowed: false,
      reason: 'One or both members do not belong to this circle.',
      memberA: { id: params.memberAId, name: 'Unknown', turn: 0 },
      memberB: { id: params.memberBId, name: 'Unknown', turn: 0 },
      requiresDualConsent: true
    };
  }

  const userA = queryOne<User>(`SELECT name FROM users WHERE id = ?`, [memberA.user_id]);
  const userB = queryOne<User>(`SELECT name FROM users WHERE id = ?`, [memberB.user_id]);

  const nameA = userA?.name || 'Member A';
  const nameB = userB?.name || 'Member B';

  // Check if either turn has already been paid out
  const cycleA = queryOne<Cycle>(`SELECT status FROM cycles WHERE circle_id = ? AND cycle_number = ?`, [params.circleId, memberA.turn_order]);
  const cycleB = queryOne<Cycle>(`SELECT status FROM cycles WHERE circle_id = ? AND cycle_number = ?`, [params.circleId, memberB.turn_order]);

  if (cycleA?.status === 'paid_out') {
    return {
      allowed: false,
      reason: `Turn ${memberA.turn_order} for ${nameA} has already been paid out and cannot be swapped.`,
      memberA: { id: memberA.id, name: nameA, turn: memberA.turn_order },
      memberB: { id: memberB.id, name: nameB, turn: memberB.turn_order },
      requiresDualConsent: true
    };
  }

  if (cycleB?.status === 'paid_out') {
    return {
      allowed: false,
      reason: `Turn ${memberB.turn_order} for ${nameB} has already been paid out and cannot be swapped.`,
      memberA: { id: memberA.id, name: nameA, turn: memberA.turn_order },
      memberB: { id: memberB.id, name: nameB, turn: memberB.turn_order },
      requiresDualConsent: true
    };
  }

  return {
    allowed: true,
    reason: `Turn swap between ${nameA} (Turn ${memberA.turn_order}) and ${nameB} (Turn ${memberB.turn_order}) is valid under circle policy. Dual member confirmation and organizer sign-off required.`,
    memberA: { id: memberA.id, name: nameA, turn: memberA.turn_order },
    memberB: { id: memberB.id, name: nameB, turn: memberB.turn_order },
    requiresDualConsent: true
  };
}
