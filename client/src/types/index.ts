export interface User {
  id: string;
  name: string;
  email: string;
  role: 'organizer' | 'member';
  paypal_email: string;
  location: string;
  avatar_url?: string;
}

export interface CirclePolicy {
  circle_id: string;
  currency: string;
  contribution_amount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
  total_cycles: number;
  members_count: number;
  order_rule: string;
  grace_days: number;
  payout_condition: string;
  shortfall_policy: string;
  max_extensions_per_member: number;
}

export interface Circle {
  id: string;
  name: string;
  tagline?: string;
  organizer_id: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  current_cycle_number: number;
  created_at: string;
  policy?: CirclePolicy;
  membersCount?: number;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  turn_order: number;
  status: string;
  joined_at: string;
  name: string;
  email: string;
  paypal_email: string;
  location: string;
  role: string;
}

export interface Cycle {
  id: string;
  circle_id: string;
  cycle_number: number;
  recipient_member_id: string;
  due_date: string;
  payout_date: string;
  status: 'pending' | 'open' | 'funded' | 'paid_out' | 'overdue';
  target_pot_amount: number;
  collected_amount: number;
  paid_out_amount: number;
  recipient_name?: string;
  recipient_email?: string;
}

export interface Contribution {
  id: string;
  circle_id: string;
  cycle_id: string;
  member_id: string;
  amount: number;
  currency: string;
  status: string;
  paypal_order_id?: string;
  paypal_capture_id?: string;
  payment_method: string;
  completed_at?: string;
  created_at: string;
  member_name?: string;
  paypal_email?: string;
  turn_order?: number;
}

export interface LedgerEntry {
  id: string;
  entry_index: number;
  circle_id: string;
  timestamp: string;
  event_type: 'CONTRIBUTION_RECEIVED' | 'PAYOUT_INITIATED' | 'PAYOUT_COMPLETED' | 'TURN_SWAP' | 'EXTENSION_GRANTED' | 'DISPUTE_LOGGED' | 'GENESIS';
  member_name: string;
  recipient_name: string;
  cycle_number: number;
  amount: number;
  currency: string;
  payment_status: string;
  paypal_ref: string;
  audit_status: 'VERIFIED' | 'PENDING' | 'FLAGGED';
  previous_hash: string;
  entry_hash: string;
  metadata_json: string;
}

export interface SafetyCheckResult {
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
