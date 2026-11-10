-- ============================================================
-- ROSCOPAL Cloudflare D1 Migration: 0001_initial_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  paypal_email TEXT NOT NULL,
  location TEXT NOT NULL,
  avatar_url TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS circles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  tradition TEXT DEFAULT 'General',
  country TEXT DEFAULT 'US',
  is_public INTEGER DEFAULT 0,
  invite_code TEXT UNIQUE,
  organizer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  current_cycle_number INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organizer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS circle_policies (
  circle_id TEXT PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT 'USD',
  contribution_amount REAL NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  start_date TEXT NOT NULL,
  total_cycles INTEGER NOT NULL,
  members_count INTEGER NOT NULL,
  order_rule TEXT NOT NULL DEFAULT 'draw_with_requests',
  grace_days INTEGER NOT NULL DEFAULT 5,
  payout_condition TEXT NOT NULL DEFAULT 'all_paid',
  shortfall_policy TEXT NOT NULL DEFAULT 'group_vote',
  max_extensions_per_member INTEGER NOT NULL DEFAULT 1,
  rules_raw_json TEXT,
  FOREIGN KEY (circle_id) REFERENCES circles(id)
);

CREATE TABLE IF NOT EXISTS circle_members (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  turn_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TEXT NOT NULL,
  FOREIGN KEY (circle_id) REFERENCES circles(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(circle_id, turn_order),
  UNIQUE(circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  cycle_number INTEGER NOT NULL,
  recipient_member_id TEXT,
  due_date TEXT NOT NULL,
  payout_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  target_pot_amount REAL NOT NULL,
  collected_amount REAL NOT NULL DEFAULT 0,
  paid_out_amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (circle_id) REFERENCES circles(id),
  FOREIGN KEY (recipient_member_id) REFERENCES circle_members(id),
  UNIQUE(circle_id, cycle_number)
);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'paypal',
  completed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (circle_id) REFERENCES circles(id),
  FOREIGN KEY (cycle_id) REFERENCES cycles(id),
  FOREIGN KEY (member_id) REFERENCES circle_members(id)
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  recipient_member_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  paypal_payout_batch_id TEXT,
  paypal_payout_item_id TEXT,
  failure_reason TEXT,
  audit_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  executed_at TEXT,
  FOREIGN KEY (circle_id) REFERENCES circles(id),
  FOREIGN KEY (cycle_id) REFERENCES cycles(id),
  FOREIGN KEY (recipient_member_id) REFERENCES circle_members(id)
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  paypal_invoice_id TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'member',
  content TEXT NOT NULL,
  intent TEXT,
  parsed_parameters TEXT,
  status TEXT NOT NULL DEFAULT 'processed',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_decisions (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  proposed_action TEXT NOT NULL,
  policy_check_result TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  rationale TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL,
  circle_id TEXT NOT NULL,
  approved_by_user_id TEXT NOT NULL,
  approval_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  status TEXT NOT NULL DEFAULT 'delivered'
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  entry_index INTEGER NOT NULL,
  circle_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  member_name TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  cycle_number INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_status TEXT NOT NULL,
  paypal_ref TEXT NOT NULL,
  audit_status TEXT NOT NULL DEFAULT 'VERIFIED',
  previous_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  UNIQUE(circle_id, entry_index)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT,
  payload_json TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 10,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  FOREIGN KEY (circle_id) REFERENCES circles(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for performance & integrity
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_circle ON cycles(circle_id);
CREATE INDEX IF NOT EXISTS idx_contributions_cycle ON contributions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_contributions_member ON contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_ledger_circle_idx ON ledger_entries(circle_id, entry_index);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
