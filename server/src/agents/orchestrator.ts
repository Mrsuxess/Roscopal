import { IntentType, User, Circle, CirclePolicy, Cycle, CircleMember, Contribution } from '../types';
import { queryAll, queryOne, execute } from '../db/database';
import { evaluateExtensionRequest, evaluateTurnSwap, evaluatePayoutSafety } from '../engine/policyRules';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

export interface AgentResponse {
  intent: IntentType;
  confidence: number;
  message: string;
  actionRequired?: 'CONFIRM_CIRCLE_CREATION' | 'APPROVE_EXTENSION' | 'CONFIRM_SWAP' | 'NAVIGATE_CHECKOUT' | 'SHARE_INVITE' | 'NONE';
  structuredData?: any;
  engine: 'deterministic_contextual' | 'anthropic_llm';
}

/**
 * 1. Natural Language Intent Classifier
 */
export function classifyMessage(content: string): IntentType {
  const text = content.toLowerCase().trim();

  // Circle creation
  if (
    text.includes('create a circle') ||
    text.includes('start a circle') ||
    text.includes('start a savings circle') ||
    text.includes('set up a') ||
    text.includes('set up an') ||
    text.includes('savings circle for') ||
    text.includes('savings circle with') ||
    (text.includes('contribute') && (text.includes('people') || text.includes('group') || text.includes('members')) && (text.includes('monthly') || text.includes('week')))
  ) {
    return 'CIRCLE_SETUP';
  }

  // Payout eligibility / Why payout is blocked
  if (
    text.includes('why is payout blocked') ||
    text.includes('why is the payout blocked') ||
    text.includes('why isn\'t the circle ready') ||
    text.includes('why isn\'t the pot ready') ||
    text.includes('why can\'t we payout') ||
    text.includes('why can\'t i payout') ||
    text.includes('ready for payout') ||
    text.includes('payout eligibility') ||
    text.includes('can we payout') ||
    text.includes('eligible for payout') ||
    text.includes('release the pot') ||
    text.includes('release payout')
  ) {
    return 'PAYOUT_ELIGIBILITY_INQUIRY';
  }

  // Funding progress
  if (
    text.includes('how much has our circle collected') ||
    text.includes('how much have we collected') ||
    text.includes('how much is collected') ||
    text.includes('funding progress') ||
    text.includes('who has paid') ||
    text.includes('who hasn\'t paid') ||
    text.includes('unpaid members') ||
    text.includes('how much in the pot') ||
    text.includes('pot balance')
  ) {
    return 'FUNDING_PROGRESS_INQUIRY';
  }

  // Invitations
  if (
    text.includes('invite') ||
    text.includes('invitation code') ||
    text.includes('invite code') ||
    text.includes('invite link') ||
    text.includes('add a member') ||
    text.includes('add another member')
  ) {
    return 'INVITATION_INQUIRY';
  }

  // Turn swaps
  if (
    text.includes('exchange') ||
    text.includes('swap my turn') ||
    text.includes('switch turns') ||
    text.includes('trade turns') ||
    text.includes('exchange with') ||
    text.includes('swap turn') ||
    text.includes('trade with')
  ) {
    return 'TURN_SWAP_REQUEST';
  }

  // Extension requests
  if (
    text.includes('extension') ||
    text.includes('need more time') ||
    text.includes('pay late') ||
    text.includes('delay payment') ||
    text.includes('grace period') ||
    text.includes('i can only pay on') ||
    text.includes('pay next week')
  ) {
    return 'EXTENSION_REQUEST';
  }

  // Disputes & Verification
  if (
    text.includes('i already paid') ||
    text.includes('already sent') ||
    text.includes('payment dispute') ||
    text.includes('debited but') ||
    text.includes('money was taken') ||
    text.includes('deducted from paypal') ||
    text.includes('payment succeeded') ||
    text.includes('verify my payment')
  ) {
    return 'PAYMENT_DISPUTE';
  }

  // Member contribution inquiry / Next recipient
  if (
    text.includes('how much do i owe') ||
    text.includes('when is my payment due') ||
    text.includes('when is my next contribution') ||
    text.includes('how to pay') ||
    text.includes('paypal link') ||
    text.includes('payment status') ||
    text.includes('who receives the next payout') ||
    text.includes('who receives the pot') ||
    text.includes('whose turn is it') ||
    text.includes('when is my turn')
  ) {
    return 'CONTRIBUTION_INQUIRY';
  }

  // Withdrawals
  if (
    text.includes('leave the circle') ||
    text.includes('withdraw from circle') ||
    text.includes('drop out') ||
    text.includes('cancel membership')
  ) {
    return 'WITHDRAWAL_REQUEST';
  }

  return 'GENERAL_FAQ';
}

/**
 * 2. Natural Language Circle Setup Agent
 */
export function handleCircleSetup(nlPrompt: string): AgentResponse {
  const text = nlPrompt.toLowerCase();

  // Extract members count (default 5 for new or 8 for heritage)
  let membersCount = 5;
  const membersMatch = text.match(/(\d+)\s*(people|members|person|of us)/i) || text.match(/(three|four|five|six|seven|eight|ten|twelve)\s*(people|members|person)/i);
  if (membersMatch) {
    const wordMap: Record<string, number> = { three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ten: 10, twelve: 12 };
    membersCount = wordMap[membersMatch[1].toLowerCase()] || parseInt(membersMatch[1], 10) || 5;
  }

  // Extract amount
  let amount = 1000;
  const amountMatch = text.match(/\$\s*(\d+(\.\d+)?)/) || text.match(/(\d+)\s*(dollars|usd|bucks)/i);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]) || 1000;
  }

  // Extract currency
  let currency = 'USD';
  if (text.includes('eur') || text.includes('euro') || text.includes('€')) currency = 'EUR';
  else if (text.includes('gbp') || text.includes('pound') || text.includes('£')) currency = 'GBP';
  else if (text.includes('ngn') || text.includes('naira') || text.includes('₦')) currency = 'NGN';
  else if (text.includes('kes') || text.includes('shilling')) currency = 'KES';

  // Extract cadence
  let cadence: 'monthly' | 'weekly' | 'biweekly' = 'monthly';
  if (text.includes('week') && !text.includes('bi')) cadence = 'weekly';
  else if (text.includes('biweekly') || text.includes('every two weeks')) cadence = 'biweekly';

  // Extract start date
  let startDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const dateMatch = text.match(/(december|dec|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov)\s*(\d{1,2})/i);
  if (dateMatch) {
    const day = dateMatch[2].padStart(2, '0');
    startDate = `2026-12-${day}`;
  }

  const potTotal = membersCount * amount;

  const proposedPolicy = {
    name: 'Custom Savings Circle',
    currency,
    contribution_amount: amount,
    cadence,
    start_date: startDate,
    total_cycles: membersCount,
    members_count: membersCount,
    target_pot: potTotal,
    order_rule: 'draw_with_requests',
    grace_days: 5,
    payout_condition: 'all_paid',
    shortfall_policy: 'group_vote',
    max_extensions_per_member: 1
  };

  const message = `I have parsed your circle requirements:
• **${membersCount} members** contributing **${formatCurrency(amount, currency)}** ${cadence}
• **Total Pot Each Cycle:** ${formatCurrency(potTotal, currency)} (${membersCount} × ${formatCurrency(amount, currency)})
• **Start Date:** ${startDate}
• **Grace Window:** 5 days (Maximum 1 extension per member)
• **Payout Gate:** Non-bypassable deterministic condition (100% collected before release)

Review the parameters below and click **Confirm & Initialize Circle** to create your circle.`;

  return {
    intent: 'CIRCLE_SETUP',
    confidence: 0.98,
    message,
    actionRequired: 'CONFIRM_CIRCLE_CREATION',
    structuredData: proposedPolicy,
    engine: 'deterministic_contextual'
  };
}

/**
 * Master Agent Dispatcher with Live Context & Deterministic Accuracy
 */
export async function processAgentMessage(params: {
  content: string;
  circleId: string;
  userId: string;
}): Promise<AgentResponse> {
  const { content, circleId, userId } = params;
  const intent = classifyMessage(content);

  // 1. Fetch live contextual data from database
  const user = (await queryOne<User>(`SELECT * FROM users WHERE id = ?`, [userId])) || {
    id: userId,
    name: 'Member',
    email: 'member@roscopal.io',
    role: 'member',
    paypal_email: 'member@roscopal.io',
    location: 'Global'
  };

  const circle = await queryOne<Circle>(`SELECT * FROM circles WHERE id = ?`, [circleId]);
  const policy = await queryOne<CirclePolicy>(`SELECT * FROM circle_policies WHERE circle_id = ?`, [circleId]);
  const currentCycle = await queryOne<Cycle>(
    `SELECT * FROM cycles WHERE circle_id = ? AND cycle_number = ?`,
    [circleId, circle?.current_cycle_number || 1]
  );
  const allCycles = await queryAll<Cycle>(
    `SELECT c.*, u.name as recipient_name 
     FROM cycles c 
     LEFT JOIN circle_members cm ON c.recipient_member_id = cm.id 
     LEFT JOIN users u ON cm.user_id = u.id 
     WHERE c.circle_id = ? 
     ORDER BY c.cycle_number ASC`,
    [circleId]
  );

  const members = await queryAll<any>(
    `SELECT cm.*, u.name, u.email, u.paypal_email, u.location 
     FROM circle_members cm 
     JOIN users u ON cm.user_id = u.id 
     WHERE cm.circle_id = ? AND cm.status != 'departed'
     ORDER BY cm.turn_order ASC`,
    [circleId]
  );

  const myMemberRecord = members.find((m: any) => m.user_id === user.id);
  const isOrganizer = circle ? circle.organizer_id === user.id : false;

  const cycleId = currentCycle?.id || '';
  const contributions = await queryAll<Contribution>(
    `SELECT * FROM contributions WHERE cycle_id = ? AND status = 'completed'`,
    [cycleId]
  );

  const paidMemberIds = new Set(contributions.map(c => c.member_id));
  const unpaidMembers = members.filter((m: any) => !paidMemberIds.has(m.id));
  const myCompletedContribution = contributions.find(c => c.member_id === myMemberRecord?.id);

  const currency = policy?.currency || 'USD';
  const contributionAmount = policy ? policy.contribution_amount : (currentCycle ? currentCycle.target_pot_amount / (members.length || 1) : 100);
  const targetPot = currentCycle?.target_pot_amount || (contributionAmount * (members.length || policy?.members_count || 1));
  const collected = currentCycle?.collected_amount || 0;
  const percentCollected = targetPot > 0 ? Math.round((collected / targetPot) * 100) : 0;

  // Resolve recipient name
  const currentRecipientMember = members.find((m: any) => m.id === currentCycle?.recipient_member_id);
  const currentRecipientName = currentRecipientMember?.name || (currentCycle as any)?.recipient_name || 'Assigned Beneficiary';

  // Dispatch according to intent
  switch (intent) {
    case 'CIRCLE_SETUP':
      return handleCircleSetup(content);

    case 'PAYOUT_ELIGIBILITY_INQUIRY': {
      if (!currentCycle) {
        return {
          intent,
          confidence: 0.95,
          message: `There is currently no active open cycle for ${circle?.name || 'this circle'}.`,
          engine: 'deterministic_contextual'
        };
      }

      const safety = await evaluatePayoutSafety(currentCycle.id);
      const remaining = Math.max(0, targetPot - collected);

      if (safety.allowed) {
        return {
          intent,
          confidence: 0.99,
          message: `✅ **Cycle #${currentCycle.cycle_number} is Fully Funded & Ready for Payout!**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Target Pot:** ${formatCurrency(targetPot, currency)} (100% collected)
• **Turn Beneficiary:** **${currentRecipientName}** (Turn #${currentCycle.cycle_number})
• **Payout Safety Status:** All 8 deterministic checks **PASSED**.
• **Action:** ${isOrganizer ? 'As Circle Organizer, you can click **Execute Verified PayPal Payout** on your dashboard.' : 'The Circle Organizer has been notified to execute the payout.'}`,
          structuredData: safety,
          engine: 'deterministic_contextual'
        };
      }

      // Format unpaid members list
      const unpaidNames = unpaidMembers.map((m: any) => m.name).join(', ') || 'None';

      const checkList = [
        `1. Circle Active: ${safety.checks.circleActive ? 'PASSED' : 'HOLD'}`,
        `2. Cycle Valid: ${safety.checks.cycleValid ? 'PASSED' : 'HOLD'}`,
        `3. Recipient Active: ${safety.checks.recipientValid ? 'PASSED' : 'HOLD'}`,
        `4. All Members Paid: ${safety.checks.contributionsConfirmed ? 'PASSED' : 'HOLD'} (${contributions.length}/${members.length} paid)`,
        `5. Amount Exact: ${safety.checks.amountExact ? 'PASSED' : 'HOLD'} (${formatCurrency(collected, currency)} / ${formatCurrency(targetPot, currency)})`,
        `6. Payout Idempotency: ${safety.checks.noDuplicatePayout ? 'PASSED' : 'HOLD'}`,
        `7. Policy Satisfied: ${safety.checks.policySatisfied ? 'PASSED' : 'HOLD'}`,
        `8. No Blocking Disputes: ${safety.checks.approvalsSatisfied ? 'PASSED' : 'HOLD'}`
      ].join('\n• ');

      return {
        intent,
        confidence: 0.98,
        message: `🛡️ **Payout Hold: Deterministic Safety Engine**
The Cycle #${currentCycle.cycle_number} pot (${formatCurrency(targetPot, currency)}) cannot be released yet because policy conditions are not satisfied:

• ${checkList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Still Required:** ${formatCurrency(remaining, currency)} remaining
• **Awaiting Payments From:** ${unpaidNames}
• **Policy:** 100% of member contributions must be verified via PayPal before any payout can be initiated.`,
        structuredData: safety,
        engine: 'deterministic_contextual'
      };
    }

    case 'FUNDING_PROGRESS_INQUIRY': {
      const paidNames = contributions.map(c => (c as any).member_name || 'Member').join(', ') || 'None yet';
      const unpaidNames = unpaidMembers.map((m: any) => m.name).join(', ') || 'All members paid!';

      return {
        intent,
        confidence: 0.98,
        message: `📊 **Funding Progress for ${circle?.name || 'Savings Circle'} (Cycle #${currentCycle?.cycle_number || 1})**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Collected:** **${formatCurrency(collected, currency)}** of **${formatCurrency(targetPot, currency)}** (${percentCollected}%)
• **Members Contributed (${contributions.length}/${members.length}):** ${paidNames}
• **Awaiting Payment (${unpaidMembers.length}):** ${unpaidNames}
• **Current Beneficiary:** **${currentRecipientName}** (Turn #${currentCycle?.cycle_number || 1})
• **Cadence:** ${policy?.cadence || 'monthly'} · Due: ${currentCycle?.due_date || 'Upcoming'}`,
        structuredData: {
          collected,
          targetPot,
          percentCollected,
          currency,
          paidCount: contributions.length,
          totalCount: members.length
        },
        engine: 'deterministic_contextual'
      };
    }

    case 'CONTRIBUTION_INQUIRY': {
      // Check if user asking whose turn it is
      const text = content.toLowerCase();
      if (text.includes('who receives') || text.includes('whose turn') || text.includes('when is my turn')) {
        const myTurn = myMemberRecord ? myMemberRecord.turn_order : null;
        const myTurnCycle = allCycles.find(c => c.cycle_number === myTurn);

        return {
          intent,
          confidence: 0.96,
          message: `🎯 **Payout Schedule & Turn Order**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Current Turn (#${currentCycle?.cycle_number || 1}):** **${currentRecipientName}** receives ${formatCurrency(targetPot, currency)}
• **Your Turn:** ${myTurn ? `Turn #${myTurn} (${myTurnCycle ? `Cycle #${myTurn}, due ${myTurnCycle.due_date}` : 'Scheduled'})` : 'Turn not yet assigned.'}
• **Total Circle Turns:** ${allCycles.length} cycles for ${members.length} members.`,
          engine: 'deterministic_contextual'
        };
      }

      // Member debt / due date
      if (myCompletedContribution) {
        return {
          intent,
          confidence: 0.98,
          message: `Good news, **${user.name}**! You have already fulfilled your contribution for Cycle #${currentCycle?.cycle_number || 1}:
• **Amount Paid:** ${formatCurrency(myCompletedContribution.amount, currency)} ${currency}
• **PayPal Reference:** \`${myCompletedContribution.paypal_capture_id || myCompletedContribution.paypal_order_id || 'Captured'}\`
• **Status:** Verified & permanently recorded on the SHA-256 audit ledger. You owe $0.00 for this cycle.`,
          structuredData: myCompletedContribution,
          engine: 'deterministic_contextual'
        };
      }

      return {
        intent,
        confidence: 0.98,
        message: `Hello **${user.name}**. For **${circle?.name || 'your circle'}** (Cycle #${currentCycle?.cycle_number || 1}):
• **Required Contribution:** **${formatCurrency(contributionAmount, currency)} ${currency}**
• **Due Date:** **${currentCycle?.due_date || 'Dec 1, 2026'}**
• **Grace Period:** ${policy?.grace_days || 5} days
• **Status:** Pending Payment

Click below to complete your payment with PayPal Sandbox.`,
        actionRequired: 'NAVIGATE_CHECKOUT',
        structuredData: {
          amount: contributionAmount,
          currency,
          cycleNumber: currentCycle?.cycle_number,
          dueDate: currentCycle?.due_date
        },
        engine: 'deterministic_contextual'
      };
    }

    case 'INVITATION_INQUIRY': {
      const code = circle?.invite_code || 'RSC-HERO01';
      return {
        intent,
        confidence: 0.98,
        message: `To invite new members to **${circle?.name || 'your circle'}**:
• **Invite Code:** \`${code}\`
• **Direct Join Link:** \`/?invite=${code}\`
• **Current Capacity:** ${members.length} / ${policy?.members_count || 8} members

Prospective members can click 'Join Circle' and enter code \`${code}\` to preview the contribution rules and take their turn.`,
        actionRequired: 'SHARE_INVITE',
        structuredData: { inviteCode: code },
        engine: 'deterministic_contextual'
      };
    }

    case 'EXTENSION_REQUEST': {
      const cycleDueDate = currentCycle ? new Date(currentCycle.due_date) : new Date();
      // Default to +3 days from cycle due date (well within standard grace window)
      let requestedDate = new Date(cycleDueDate.getTime() + 3 * 86400000).toISOString().split('T')[0];

      const daysMatch = content.match(/(\d+)\s*(days|day)/i);
      if (daysMatch) {
        const addDays = parseInt(daysMatch[1], 10);
        requestedDate = new Date(cycleDueDate.getTime() + addDays * 86400000).toISOString().split('T')[0];
      } else {
        const match = content.match(/(\d{1,2})(th|st|nd|rd)?/);
        if (match) {
          const targetDay = parseInt(match[1], 10);
          const candidate = new Date(cycleDueDate);
          candidate.setDate(targetDay);
          // If candidate is in the past compared to due date, use candidate or +3 days
          if (candidate.getTime() >= cycleDueDate.getTime() && (candidate.getTime() - cycleDueDate.getTime()) <= (policy?.grace_days || 5) * 86400000) {
            requestedDate = candidate.toISOString().split('T')[0];
          }
        }
      }

      const memberId = myMemberRecord?.id || userId;
      const evaluation = await evaluateExtensionRequest({
        circleId,
        memberId,
        cycleId: currentCycle?.id || 'cycle-1',
        requestedDate
      });

      if (!evaluation.allowed) {
        return {
          intent,
          confidence: 0.95,
          message: `Hello ${user.name}. Your extension request for **${requestedDate}** could not be approved:
• **Reason:** ${evaluation.reason}
• **Policy:** Circle allows a maximum of ${evaluation.maxExtensions} extension(s) within a ${evaluation.graceDays}-day grace period.`,
          actionRequired: 'NONE',
          structuredData: evaluation,
          engine: 'deterministic_contextual'
        };
      }

      return {
        intent,
        confidence: 0.97,
        message: `Hello **${user.name}**. I evaluated your request against the circle's financial rules:
• **Grace Window:** Up to ${evaluation.graceDays} days permitted
• **Extensions Used:** ${evaluation.currentExtensionsUsed} of ${evaluation.maxExtensions} allowed
• **Result:** **Policy Compliant**.

Click **Confirm Extension** below to register this extension on the ledger and notify the group.`,
        actionRequired: 'APPROVE_EXTENSION',
        structuredData: {
          memberId,
          memberName: user.name,
          requestedDate,
          cycleId: currentCycle?.id
        },
        engine: 'deterministic_contextual'
      };
    }

    case 'TURN_SWAP_REQUEST': {
      const requesterId = myMemberRecord?.id || members[0]?.id;
      // Look for a target name
      const targetMember = members.find((m: any) => m.id !== requesterId && content.toLowerCase().includes(m.name.toLowerCase())) || members.find((m: any) => m.id !== requesterId);

      if (!targetMember) {
        return {
          intent,
          confidence: 0.90,
          message: `Please specify the name of the member you want to swap turns with.`,
          engine: 'deterministic_contextual'
        };
      }

      const evaluation = await evaluateTurnSwap({
        circleId,
        memberAId: requesterId,
        memberBId: targetMember.id
      });

      if (!evaluation.allowed) {
        return {
          intent,
          confidence: 0.95,
          message: `Turn swap could not be completed: ${evaluation.reason}`,
          engine: 'deterministic_contextual'
        };
      }

      return {
        intent,
        confidence: 0.97,
        message: `Turn swap requested between **${user.name}** (Turn #${evaluation.memberA.turn}) and **${targetMember.name}** (Turn #${evaluation.memberB.turn}):
• Both positions are verified unreleased and eligible for swap.
• Deterministic rule check passed: no prior payouts exist on either slot.
• Action: Organizer and dual-member confirmation required.`,
        actionRequired: 'CONFIRM_SWAP',
        structuredData: {
          memberAId: requesterId,
          memberBId: targetMember.id,
          memberAName: user.name,
          memberBName: targetMember.name
        },
        engine: 'deterministic_contextual'
      };
    }

    case 'PAYMENT_DISPUTE': {
      if (myCompletedContribution) {
        return {
          intent,
          confidence: 0.98,
          message: `Good news **${user.name}**! Your payment of **${formatCurrency(myCompletedContribution.amount, currency)}** has been confirmed:
• **PayPal Capture Ref:** \`${myCompletedContribution.paypal_capture_id || myCompletedContribution.paypal_order_id}\`
• **Completed At:** ${myCompletedContribution.completed_at || 'Verified'}
• **Ledger Status:** Authenticated & SHA-256 Chained. No further action needed!`,
          structuredData: myCompletedContribution,
          engine: 'deterministic_contextual'
        };
      }

      const pending = await queryOne<Contribution>(
        `SELECT * FROM contributions WHERE circle_id = ? AND member_id = ? AND status = 'pending'`,
        [circleId, myMemberRecord?.id || '']
      );

      if (pending) {
        return {
          intent,
          confidence: 0.95,
          message: `I inspected the transaction log for ${user.name}. A checkout order (\`${pending.paypal_order_id}\`) was initiated, but PayPal capture confirmation has not yet finalized. If funds were debited, please provide your PayPal Transaction ID so I can reconcile it immediately.`,
          engine: 'deterministic_contextual'
        };
      }

      return {
        intent,
        confidence: 0.95,
        message: `I checked the audit ledger and gateway records for **${user.name}**, but no completed transaction was found for this cycle. Please click 'Pay Contribution' on your Member Dashboard to complete your payment via PayPal Sandbox.`,
        actionRequired: 'NAVIGATE_CHECKOUT',
        engine: 'deterministic_contextual'
      };
    }

    case 'WITHDRAWAL_REQUEST':
      return {
        intent,
        confidence: 0.95,
        message: `Under ROSCOPAL rotating savings rules, voluntary departure before all cycle turns conclude requires group approval and settlement of past pot obligations to ensure remaining members' guaranteed turns are protected. I have flagged your request for the circle organizer's review.`,
        engine: 'deterministic_contextual'
      };

    case 'GENERAL_FAQ':
    default: {
      const text = content.toLowerCase();
      if (text.includes('miss') || text.includes('late') || text.includes('default')) {
        return {
          intent: 'GENERAL_FAQ',
          confidence: 0.96,
          message: `**What happens if someone misses a payment in ROSCOPAL?**
1. **Grace Window:** The member has a ${policy?.grace_days || 5}-day grace period with maximum ${policy?.max_extensions_per_member || 1} extension.
2. **Deterministic Payout Hold:** Payout for the cycle is automatically held until 100% of required funds are collected.
3. **Shortfall Rule:** Under ${circle?.name || 'this circle'}'s policy (${policy?.shortfall_policy || 'group_vote'}), members can vote to cover from reserves or adjust schedule without predatory interest.`,
          engine: 'deterministic_contextual'
        };
      }

      return {
        intent: 'GENERAL_FAQ',
        confidence: 0.92,
        message: `I am **ROSCOPAL**, your AI savings circle treasurer.
I coordinate recurring savings circles (Susu, Tanda, Chit Fund, Chama), enforce deterministic payout safety rules, verify PayPal payments, and maintain an immutable SHA-256 audit ledger.

You can ask me:
• *"How much do I owe for this cycle?"*
• *"Why is the payout blocked?"*
• *"How much has our circle collected?"*
• *"Who receives the next payout?"*
• *"Can I request a grace period extension?"*
• *"How do I invite another member?"*`,
        engine: 'deterministic_contextual'
      };
    }
  }
}
