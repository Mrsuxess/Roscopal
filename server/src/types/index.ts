export type CircleStatus = 'draft' | 'active' | 'completed' | 'paused';
export type MemberStatus = 'invited' | 'joined' | 'active' | 'swapped' | 'departed';
export type CycleStatus = 'pending' | 'open' | 'funded' | 'paid_out' | 'overdue';
export type ContributionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'blocked' | 'failed';
export type IntentType = 
  | 'CIRCLE_SETUP'
  | 'CONTRIBUTION_INQUIRY'
  | 'PAYMENT_DISPUTE'
  | 'EXTENSION_REQUEST'
  | 'TURN_SWAP_REQUEST'
  | 'WITHDRAWAL_REQUEST'
  | 'GENERAL_FAQ';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'organizer' | 'member';
  paypal_email: string;
  location: string;
  avatar_url?: string;
  created_at: string;
}

export interface CirclePolicy {
  circle_id: string;
  currency: string;
  contribution_amount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
  total_cycles: number;
  members_count: number;
  order_rule: 'draw_with_requests' | 'fixed_priority' | 'random_draw' | 'bidding';
  grace_days: number;
  payout_condition: 'all_paid' | 'majority_paid' | 'scheduled_date';
  shortfall_policy: 'group_vote' | 'organizer_cover' | 'hold_payout';
  max_extensions_per_member: number;
  rules_raw_json?: string;
}

export interface Circle {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  tradition?: string;
  country?: string;
  is_public?: number;
  invite_code?: string;
  organizer_id: string;
  status: CircleStatus;
  current_cycle_number: number;
  created_at: string;
  policy?: CirclePolicy;
  membersCount?: number;
}

export interface Invitation {
  id: string;
  circle_id: string;
  code: string;
  created_by: string;
  max_uses: number;
  uses_count: number;
  expires_at?: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  turn_order: number;
  status: MemberStatus;
  joined_at: string;
  user?: User;
}

export interface Cycle {
  id: string;
  circle_id: string;
  cycle_number: number;
  recipient_member_id: string;
  due_date: string;
  payout_date: string;
  status: CycleStatus;
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
  status: ContributionStatus;
  paypal_order_id?: string;
  paypal_capture_id?: string;
  payment_method: string;
  completed_at?: string;
  created_at: string;
  member_name?: string;
}

export interface Payout {
  id: string;
  circle_id: string;
  cycle_id: string;
  recipient_member_id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  paypal_payout_batch_id?: string;
  paypal_payout_item_id?: string;
  failure_reason?: string;
  audit_status: string;
  created_at: string;
  executed_at?: string;
  recipient_name?: string;
}

export interface LedgerEntry {
  id: string;
  entry_index: number;
  circle_id: string;
  timestamp: string;
  event_type: 'CONTRIBUTION_RECEIVED' | 'PAYOUT_INITIATED' | 'PAYOUT_COMPLETED' | 'TURN_SWAP' | 'EXTENSION_GRANTED' | 'DISPUTE_LOGGED' | 'GENESIS' | 'CIRCLE_INITIALIZED' | 'MEMBER_JOINED' | 'CONTRIBUTION_REVERSED';
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

export interface AgentDecision {
  id: string;
  circle_id: string;
  trigger_event: string;
  proposed_action: string;
  policy_check_result: string;
  status: 'proposed' | 'approved' | 'rejected' | 'executed';
  rationale: string;
  created_at: string;
}
