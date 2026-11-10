import { queryOne, queryAll, execute } from '../db/database';
import { recordLedgerEntry } from './auditLedger';
import { Circle, CirclePolicy, CircleMember, Cycle, User, Invitation } from '../types';

export interface CreateCircleWizardInput {
  name: string;
  tagline?: string;
  description?: string;
  tradition?: string; // Susu, Tanda, Chama, etc.
  country?: string;
  currency?: string;
  isPublic?: boolean;
  contributionAmount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  membersCount: number;
  startDate: string;
  orderRule?: 'draw_with_requests' | 'fixed_priority' | 'random_draw' | 'bidding';
  graceDays?: number;
  payoutCondition?: 'all_paid' | 'majority_paid' | 'scheduled_date';
  shortfallPolicy?: 'group_vote' | 'organizer_cover' | 'hold_payout';
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RSC-${code}`;
}

export async function createCircleWithWizard(
  organizerId: string,
  input: CreateCircleWizardInput
): Promise<{ circle: Circle; inviteCode: string }> {
  const organizer = await queryOne<User>(`SELECT * FROM users WHERE id = ?`, [organizerId]);
  if (!organizer) {
    throw new Error('Organizer user not found.');
  }

  const name = input.name?.trim();
  if (!name || name.length < 3) {
    throw new Error('Circle name must be at least 3 characters.');
  }

  const contributionAmount = Number(input.contributionAmount);
  if (isNaN(contributionAmount) || contributionAmount <= 0) {
    throw new Error('Contribution amount must be greater than 0.');
  }

  const membersCount = Math.floor(Number(input.membersCount));
  if (isNaN(membersCount) || membersCount < 2 || membersCount > 50) {
    throw new Error('Member count must be between 2 and 50 members.');
  }

  const currency = (input.currency || 'USD').toUpperCase();
  const cadence = input.cadence || 'monthly';
  const tradition = input.tradition || 'General ROSCA';
  const country = input.country || 'Global';
  const isPublic = input.isPublic ? 1 : 0;
  const description = input.description || `${tradition} group saving together`;
  const tagline = input.tagline || `${membersCount} members saving ${contributionAmount} ${currency}/${cadence}`;
  const startDate = input.startDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const graceDays = input.graceDays !== undefined ? Number(input.graceDays) : 5;
  const orderRule = input.orderRule || 'draw_with_requests';
  const payoutCondition = input.payoutCondition || 'all_paid';
  const shortfallPolicy = input.shortfallPolicy || 'group_vote';

  const circleId = 'circle-' + crypto.randomUUID().slice(0, 8);
  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();

  // 1. Create Circle
  await execute(
    `INSERT INTO circles (
      id, name, tagline, description, tradition, country, is_public,
      invite_code, organizer_id, status, current_cycle_number, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?)`,
    [circleId, name, tagline, description, tradition, country, isPublic, inviteCode, organizerId, now]
  );

  // 2. Create Circle Policy
  await execute(
    `INSERT INTO circle_policies (
      circle_id, currency, contribution_amount, cadence, start_date,
      total_cycles, members_count, order_rule, grace_days, payout_condition,
      shortfall_policy, max_extensions_per_member
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      circleId,
      currency,
      contributionAmount,
      cadence,
      startDate,
      membersCount,
      membersCount,
      orderRule,
      graceDays,
      payoutCondition,
      shortfallPolicy
    ]
  );

  // 3. Add Organizer as Member #1
  const organizerMemberId = 'mem-' + crypto.randomUUID().slice(0, 8);
  await execute(
    `INSERT INTO circle_members (
      id, circle_id, user_id, turn_order, status, joined_at
    ) VALUES (?, ?, ?, 1, 'active', ?)`,
    [organizerMemberId, circleId, organizerId, now]
  );

  // 4. Generate Cycles for all turns
  const targetPotAmount = contributionAmount * membersCount;
  let cycleDate = new Date(startDate);

  for (let c = 1; c <= membersCount; c++) {
    const cycleId = `cycle-${circleId}-${c}`;
    const dueDate = cycleDate.toISOString();
    const payoutDate = new Date(cycleDate.getTime() + graceDays * 86400000).toISOString();
    const recipientMemberId = organizerMemberId;

    await execute(
      `INSERT INTO cycles (
        id, circle_id, cycle_number, recipient_member_id, due_date,
        payout_date, status, target_pot_amount, collected_amount, paid_out_amount
      ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, 0, 0)`,
      [cycleId, circleId, c, recipientMemberId, dueDate, payoutDate, targetPotAmount]
    );

    if (cadence === 'weekly') {
      cycleDate = new Date(cycleDate.getTime() + 7 * 86400000);
    } else if (cadence === 'biweekly') {
      cycleDate = new Date(cycleDate.getTime() + 14 * 86400000);
    } else {
      cycleDate = new Date(cycleDate.getTime() + 30 * 86400000);
    }
  }

  // 5. Create Invitation Record
  const invitationId = 'inv-' + crypto.randomUUID().slice(0, 8);
  await execute(
    `INSERT INTO invitations (
      id, circle_id, code, created_by, max_uses, uses_count, status, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, 'active', ?)`,
    [invitationId, circleId, inviteCode, organizerId, membersCount - 1, now]
  );

  // 6. Record Genesis Ledger Entry
  await recordLedgerEntry({
    circleId,
    eventType: 'CIRCLE_INITIALIZED',
    memberName: organizer.name,
    recipientName: 'Community Pot',
    cycleNumber: 1,
    amount: targetPotAmount,
    currency,
    paymentStatus: 'INITIALIZED',
    paypalRef: `GENESIS-${circleId}`,
    auditStatus: 'VERIFIED',
    metadata: {
      circleName: name,
      tradition,
      cadence,
      membersCount,
      contributionAmount,
      organizerId
    }
  });

  const circle = (await queryOne<Circle>(`SELECT * FROM circles WHERE id = ?`, [circleId]))!;
  circle.policy = (await queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [circleId]))!;
  circle.membersCount = 1;

  return { circle, inviteCode };
}

/**
 * Get all circles for a specific user (as organizer or member)
 */
export async function getUserCircles(userId: string): Promise<Circle[]> {
  const circles = await queryAll<Circle>(
    `SELECT DISTINCT c.*,
       (SELECT COUNT(*) FROM circle_members cm WHERE cm.circle_id = c.id AND cm.status != 'departed') as membersCount
     FROM circles c
     LEFT JOIN circle_members cm ON c.id = cm.circle_id
     WHERE c.organizer_id = ? OR cm.user_id = ?
     ORDER BY c.created_at DESC`,
    [userId, userId]
  );

  for (const c of circles) {
    c.policy = (await queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [c.id])) || undefined;
  }

  return circles;
}

/**
 * Preview circle invitation details
 */
export async function getInvitationDetails(code: string) {
  const cleanCode = code.trim().toUpperCase();

  const invitation = await queryOne<Invitation>(
    `SELECT * FROM invitations WHERE code = ? AND status = 'active'`,
    [cleanCode]
  );

  if (!invitation) {
    const circle = await queryOne<Circle>(`SELECT * FROM circles WHERE UPPER(invite_code) = ?`, [cleanCode]);
    if (!circle) {
      throw new Error(`Invitation code "${cleanCode}" is invalid or does not exist.`);
    }
    return await getCircleInvitePreview(circle.id, cleanCode);
  }

  return await getCircleInvitePreview(invitation.circle_id, cleanCode);
}

async function getCircleInvitePreview(circleId: string, inviteCode: string) {
  const circle = await queryOne<Circle>(`SELECT * FROM circles WHERE id = ?`, [circleId]);
  if (!circle) throw new Error('Circle not found.');

  const policy = await queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [circleId]);
  const organizer = await queryOne<User>(`SELECT id, name, location FROM users WHERE id = ?`, [circle.organizer_id]);
  const members = await queryAll<CircleMember>(`SELECT * FROM circle_members WHERE circle_id = ? AND status != 'departed'`, [circleId]);

  const maxMembers = policy ? policy.members_count : 8;
  const currentMembersCount = members.length;
  const availableSlots = Math.max(0, maxMembers - currentMembersCount);
  const isFull = availableSlots === 0;

  return {
    circleId: circle.id,
    name: circle.name,
    tagline: circle.tagline,
    description: circle.description,
    tradition: circle.tradition || 'General',
    country: circle.country || 'Global',
    organizerName: organizer?.name || 'Circle Organizer',
    organizerLocation: organizer?.location || 'Remote',
    currency: policy?.currency || 'USD',
    contributionAmount: policy?.contribution_amount || 100,
    cadence: policy?.cadence || 'monthly',
    totalCycles: policy?.total_cycles || maxMembers,
    targetPot: (policy?.contribution_amount || 100) * maxMembers,
    currentMembersCount,
    maxMembers,
    availableSlots,
    isFull,
    status: circle.status,
    inviteCode
  };
}

/**
 * Join a circle with an invite code
 */
export async function joinCircleWithInvite(code: string, userId: string): Promise<{ member: CircleMember; circle: Circle }> {
  const user = await queryOne<User>(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!user) throw new Error('User not found.');

  const preview = await getInvitationDetails(code);

  if (preview.isFull) {
    throw new Error('This savings circle has already reached its maximum member capacity.');
  }

  if (preview.status !== 'active' && preview.status !== 'draft') {
    throw new Error(`Cannot join circle because its status is ${preview.status}.`);
  }

  // Prevent duplicate membership
  const existingMember = await queryOne<CircleMember>(
    `SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ? AND status != 'departed'`,
    [preview.circleId, userId]
  );
  if (existingMember) {
    throw new Error('You are already a member of this savings circle.');
  }

  const existingMembers = await queryAll<CircleMember>(
    `SELECT turn_order FROM circle_members WHERE circle_id = ? ORDER BY turn_order ASC`,
    [preview.circleId]
  );

  // Determine next turn order
  const assignedTurns = new Set(existingMembers.map(m => m.turn_order));
  let nextTurn = 1;
  while (assignedTurns.has(nextTurn)) {
    nextTurn++;
  }

  const memberId = 'mem-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  // Insert new member
  await execute(
    `INSERT INTO circle_members (id, circle_id, user_id, turn_order, status, joined_at)
     VALUES (?, ?, ?, ?, 'active', ?)`,
    [memberId, preview.circleId, userId, nextTurn, now]
  );

  // Update cycle recipient for this member's turn
  await execute(
    `UPDATE cycles SET recipient_member_id = ? WHERE circle_id = ? AND cycle_number = ?`,
    [memberId, preview.circleId, nextTurn]
  );

  // Increment invitation usage
  await execute(
    `UPDATE invitations SET uses_count = uses_count + 1 WHERE code = ?`,
    [code.trim().toUpperCase()]
  );

  // Record in SHA-256 ledger
  await recordLedgerEntry({
    circleId: preview.circleId,
    eventType: 'MEMBER_JOINED',
    memberName: user.name,
    recipientName: 'Community Pot',
    cycleNumber: 1,
    amount: 0,
    currency: preview.currency,
    paymentStatus: 'ACTIVE',
    paypalRef: `JOIN-${memberId}`,
    auditStatus: 'VERIFIED',
    metadata: {
      userId,
      turnOrder: nextTurn,
      userEmail: user.email,
      inviteCode: code
    }
  });

  const member = (await queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [memberId]))!;
  const circle = (await queryOne<Circle>(`SELECT * FROM circles WHERE id = ?`, [preview.circleId]))!;
  circle.policy = (await queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [preview.circleId])) || undefined;

  return { member, circle };
}
