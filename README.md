# ROSCOPAL — Everyone Takes a Turn.

> **AI-Powered Treasurer for Rotating Savings Circles**  
> *PayPal AI Hackathon 2026 Entry*  
> Built with **PayPal Sandbox**, **AG Grid**, **TypeScript**, and **Deterministic Financial Rules**.

---
<img width="1358" height="690" alt="image" src="https://github.com/user-attachments/assets/38f828dc-12ff-44e9-882c-1b4205ae6415" />
link: https://roscopal.suxess.workers.dev/

## 1. Executive Summary

Around the world, billions of people participate in informal rotating savings and credit associations (ROSCAs), known across cultures as:
- **Susu / Esusu / Ajo** (West Africa & Caribbean)
- **Tanda / Cundina** (Latin America)
- **Chit Fund** (India & South Asia)
- **Chama** (East Africa)
- **Stokvel** (South Africa)
- **Hui / Paluwagan** (East & Southeast Asia)

Members contribute a fixed amount each cycle, and one member receives the accumulated pot. While built on deep community trust, the weak link is always administrative: **someone has to chase friends and family for money, resolve late-payment friction, navigate turn swaps, and maintain transparent records.**

**ROSCOPAL** automates this social coordination using AI, PayPal, and a deterministic financial rules engine.

```
┌────────────────────────────────────────────────────────┐
│                      ROSCOPAL AI                       │
│     Conversational Setup • Exception Negotiation       │
│        Turn Swaps • Respectful Late Reminders          │
└──────────────────────────┬─────────────────────────────┘
                           │ Proposes Actions
                           ▼
┌────────────────────────────────────────────────────────┐
│           DETERMINISTIC FINANCIAL SAFETY GATE          │
│          8 Programmatic Checks Prior to Release        │
│          ZERO OUT-OF-POLICY PAYOUTS GUARANTEE          │
└──────────────────────────┬─────────────────────────────┘
                           │ Authorizes Money Movement
                           ▼
┌────────────────────────────────────────────────────────┐
│                     PAYPAL REST API                    │
│      Member Checkouts • Webhooks • Batch Payouts       │
└──────────────────────────┬─────────────────────────────┘
                           │ Records Immutable Event
                           ▼
┌────────────────────────────────────────────────────────┐
│            AG GRID SHA-256 HASH-CHAINED LEDGER         │
│          Full Group Transparency • Instant Export      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### A. The AI Proposes. The Rules Decide.
The central financial safety principle of ROSCOPAL is strict separation of concerns:
1. **The AI Agent** parses messages, classifies intents, structures circle configurations, drafts respectful reminders, and negotiates exceptions.
2. **The Rules Engine** deterministically validates all financial invariants. **The AI CANNOT independently authorize money movement.**

### B. The 8 Deterministic Payout Gate Rules
Every payout must pass 8 consecutive non-bypassable programmatic checks:
1. **Circle Active:** Circle exists and status is `'active'`.
2. **Cycle Open/Funded:** Target cycle is active and not previously disbursed.
3. **Recipient Valid:** Recipient is an active member designated for this turn.
4. **Contributions Confirmed:** 100% of required cycle contributions verified via PayPal.
5. **Amount Exact:** Collected balance matches exact target pot ($100 × 8 = $800).
6. **Zero Duplicate Payouts:** Idempotency key and database validation prevent double payouts.
7. **Circle Policy Satisfied:** Payout conditions (`all_paid`) satisfied.
8. **Approvals Satisfied:** Pending disputes or grace extensions formally reconciled.

If any check fails, **the payout is immediately blocked and logged to the audit ledger.**

---

## 3. Product Experience

### 1. Organizer Dashboard (Ada's View)
- Real-time circle overview ($800 pot, 8 global members).
- Visual contribution progress bar with member payment status pills.
- Deterministic Payout Gate widget displaying the live status of all 8 checks.
- 1-click simulation buttons for sandbox testing (`Simulate PayPal Contribution`).
- Pot release trigger with celebratory confetti upon 100% verified funding.
- AI-generated cycle treasury summary.

### 2. Member Dashboard (Chidi / Fatima / David)
- Individualized contribution obligation ($100 USD due Dec 1, 2026).
- One-click PayPal Sandbox payment integration.
- Turn schedule indicator (Recipient turn vs. current pot beneficiary).
- Self-service grace extension request modal.
- Peer turn-swap proposal modal.

### 3. ROSCOPAL AI Assistant
- Conversational circle setup:
  > *"Create a savings circle for eight people. Everyone contributes $100 monthly, starting December 1. Chidi should receive the first payout because he needs money for rent."*
- Extracts structured parameters, validates inputs, and presents an interactive **"Confirm & Initialize Circle"** card.
- Intent classification across 7 categories:
  - `CIRCLE_SETUP`
  - `EXTENSION_REQUEST`
  - `TURN_SWAP_REQUEST`
  - `PAYMENT_DISPUTE`
  - `CONTRIBUTION_INQUIRY`
  - `WITHDRAWAL_REQUEST`
  - `GENERAL_FAQ`

### 4. AG Grid Shared Financial Ledger
- **Judging Focus:** Built with `ag-grid-react` and `ag-theme-quartz-dark`.
- Columns: Index, Timestamp, Event Type, Initiator, Recipient, Cycle, Amount, Status, PayPal Ref, Audit Shield, and SHA-256 Hash.
- Features: Quick filter search, multi-column sorting, pagination, and CSV export.
- **Cryptographic Hash Chaining:** Every block contains the SHA-256 hash of the previous block.
- **Live Chain Verification:** An interactive button recalculates the cryptographic integrity of all blocks from Genesis to head in real time.

---

## 4. PayPal Sandbox Integration & Developer Setup Guide

ROSCOPAL supports both live PayPal Sandbox REST APIs and high-fidelity transparent simulation fallback.

### A. Automatic Mode Selection
- **Mode 1: LIVE_SANDBOX** — Activated when valid `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are configured in `.env`. Calls real PayPal REST endpoints (`api-m.sandbox.paypal.com`), uses the official PayPal JavaScript SDK button for checkout, and authenticates webhook signatures.
- **Mode 2: SIMULATED_SANDBOX** — Operates out-of-the-box when credentials are not supplied. Generates realistic PayPal envelope IDs (`ORDER-PP-SANDBOX-...`, `CAP-PP-SANDBOX-...`, `BATCH-PP-SANDBOX-...`), executing identical deterministic financial state transitions and cryptographic ledger commits.

### B. Configuring Real PayPal Sandbox Credentials

1. **Create Developer Account & App:**
   - Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
   - Under **Apps & Credentials**, select **Sandbox** and click **Create App**.
   - Copy the **Client ID** and **Secret Key**.
2. **Enable PayPal Payouts in Sandbox:**
   - In your app settings on the PayPal Developer dashboard, scroll to **Features**.
   - Ensure the **Payouts** checkbox is selected and saved (requires business sandbox account).
3. **Configure Webhook Listener (Local Testing via Tunnel):**
   - In a terminal, expose your local port 5000 using ngrok:
     ```bash
     ngrok http 5000
     ```
   - In your PayPal App settings, click **Add Webhook**.
   - Set URL to: `https://<your-ngrok-subdomain>.ngrok-free.app/api/paypal/webhook`
   - Select event types:
     - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
     - `Payment capture denied` (`PAYMENT.CAPTURE.DENIED`)
     - `Payment capture reversed` (`PAYMENT.CAPTURE.REVERSED`)
     - `Payouts batch success` (`PAYMENT.PAYOUTSBATCH.SUCCESS`)
     - `Payouts batch denied` (`PAYMENT.PAYOUTSBATCH.DENIED`)
   - Copy the generated **Webhook ID** into your `.env` file as `PAYPAL_WEBHOOK_ID`.

4. **Update your `.env`:**
   ```env
   PAYPAL_CLIENT_ID=your_actual_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_actual_sandbox_client_secret
   PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
   PAYPAL_WEBHOOK_ID=your_actual_webhook_id
   ```

> **Regulatory Disclosure:** ROSCOPAL demonstrates rotating savings flows in the PayPal Sandbox. In commercial production, fund holding and settlement would operate via appropriately licensed payments partners or a direct-to-recipient peer escrow architecture.

---

## 5. Automated Scenario & Integration Test Suites

ROSCOPAL features a comprehensive multi-tier automated test suite:

```bash
# 1. PayPal Sandbox & Webhook Integration Suite (15 Tests)
npm run test:paypal

# 2. Concurrency, Race Condition & Cold Persistence Suite (4 Tests)
npm run test:security

# 3. 40-Scenario Autonomous AI & Policy Evaluation Suite (40 Tests)
npm run test:scenarios
```

### Comprehensive Test & Audit Results

| Suite / Metric | Scenarios / Target | Result | Status |
|---|---|---|---|
| **PayPal Sandbox Order Creation & Capture** | Valid order | **Verified (`ORDER-PP-...`)** | **Passed** |
| **PayPal Order Capture Idempotency** | Prevent double credit | **Pot unchanged ($700)** | **Passed** |
| **Webhook `PAYMENT.CAPTURE.COMPLETED`** | Atomic pot credit | **Verified & Ledger Chained** | **Passed** |
| **Webhook Duplicate Replay Protection** | Prevent replay attack | **Replay ignored ($800 stable)**| **Passed** |
| **Webhook `PAYMENT.CAPTURE.DENIED`** | Unfunded rejection | **Failed status / 0 credit** | **Passed** |
| **Webhook `PAYMENT.CAPTURE.REVERSED`** | Chargeback handling | **Pot debited ($800 → $700)** | **Passed** |
| **Webhook `PAYMENT.PAYOUTSBATCH.SUCCESS`**| Status reconciliation | **Status updated to completed** | **Passed** |
| **8 Deterministic Safety Check Rules** | Block premature payout | **Blocked ($600/$800 incomplete)**| **Passed** |
| **Payout Organizer Authorization Gate** | Non-organizer denied | **HTTP 403 Forbidden** | **Passed** |
| **Authorized Payout Execution** | Turn 1 (Chidi) $800 | **Executed & Recorded** | **Passed** |
| **Duplicate Payout Protection** | Zero repeat payouts | **Rejected: Already paid_out** | **Passed** |
| **Autonomous AI Scenario Tests** | 40 Scenarios | **40 / 40 Passed (100%)** | **Passed** |
| **Message Classification Accuracy** | ≥ 90% | **100% (40/40)** | **Verified** |
| **Unauthorized Payouts Allowed** | **0** | **0 (ZERO)** | **Verified** |
| **Unauthorized Payouts Blocked** | 4 | **4 (100%)** | **Verified** |
| **Concurrency Race Mutex Lock** | 2 concurrent payouts | **1 accepted / 1 rejected** | **Verified** |
| **Cold Database Crash Persistence** | 100% data integrity | **100% Data Preserved** | **Verified** |
| **Member PII Privacy Masking** | Masked | **`ch***@domain.com`** | **Verified** |
| **SHA-256 Cryptographic Hash Chain** | Valid tamper-proof chain | **100% Valid Chain** | **Verified** |

---

## 6. Security Hardening & Concurrency Architecture

- **In-Flight Mutex & State Compare-and-Swap (CAS):** Payouts are guarded by both an atomic process mutex and an immediate database transaction transition (`UPDATE cycles SET status = 'processing'`). Two simultaneous payout calls will never double-disburse funds.
- **Strict Role Authorization:** Only the designated Circle Organizer has authority to execute cycle payouts. Calls from non-organizer members are rejected with HTTP 403 Forbidden.
- **Member Privacy Boundary:** Sensitive personal emails and PayPal accounts are dynamically masked for non-organizer members to prevent IDOR and information leakage.
- **Cryptographic Chaining:** Each ledger block hashes the previous block's SHA-256 digest, providing mathematical tamper-evidence for all group members.

---

## 7. Quick Start & Run Instructions

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/roscopal.git
cd roscopal

# Install all dependencies (backend & frontend)
npm run install:all
```

### Running Locally
```bash
# Start backend API (Port 5000)
npm run dev:server

# In a separate terminal, start frontend (Port 5173)
npm run dev:client
```
Visit `http://localhost:5173` in your browser.

### Running the Scenario Test Suite
```bash
npm run test:scenarios
```

### Building for Production
```bash
npm run build
npm --prefix server start
```
The Express server will serve both the REST API and the optimized React client on Port 5000.

---

## 7. License

MIT License. See [LICENSE](file:///home/suxess/Desktop/ROSCOPAL/LICENSE) for details.
