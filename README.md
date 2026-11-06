# ROSCOPAL — Everyone Takes a Turn.

> **AI-Powered Treasurer for Rotating Savings Circles**  
> *PayPal AI Hackathon 2026 Entry*  
> Built with **PayPal Sandbox**, **AG Grid**, **TypeScript**, and **Deterministic Financial Rules**.

---

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

## 4. PayPal Sandbox Integration

- **Contributions:** Generated using PayPal Orders API (`/v2/checkout/orders`) and captured (`/capture`).
- **Payouts:** Batch payouts executed via PayPal Payouts API (`/v1/payments/payouts`).
- **Webhooks:** Automated event listener (`/api/paypal/webhook`) with signature verification and idempotency de-duplication.
- **Demo Mode Transparency:** Fully functional with or without sandbox credentials. In Demo Mode, the high-fidelity simulator generates authentic PayPal response envelopes and explicitly tags all records with `SIMULATED_SANDBOX` or `LIVE_SANDBOX`.

> **Regulatory Disclosure:** ROSCOPAL demonstrates rotating savings flows in the PayPal Sandbox. In commercial production, fund holding and settlement would operate via appropriately licensed payments partners or a direct-to-recipient peer escrow architecture.

---

## 5. Automated Scenario Test Suite (40 Synthetic Tests)

ROSCOPAL includes an automated 40-scenario evaluation suite testing edge cases, disputes, and policy violations.

### Test Results

| Metric | Target | Result | Status |
|---|---|---|---|
| **Total Test Scenarios** | 40 | 40 | Passed |
| **Message Classification Accuracy** | ≥ 90% | **100% (40/40)** | Verified |
| **Deterministic Policy Compliance** | 100% | **100%** | Verified |
| **Unauthorized Payouts Allowed** | **0** | **0 (ZERO)** | **Verified** |
| **Unauthorized Payouts Blocked** | 4 | 4 | Verified |
| **Duplicate Event De-duplication** | 1 | 1 | Verified |
| **SHA-256 Hash Chain Integrity** | Valid | **100% Valid** | Verified |
| **Evaluation Runtime** | < 1000ms | **347ms** | Instant |

---

## 6. Quick Start & Run Instructions

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
