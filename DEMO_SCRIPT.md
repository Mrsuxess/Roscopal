# ROSCOPAL — Official Demo Video Script (Under 3 Minutes)

> **Product:** ROSCOPAL  
> **Tagline:** Everyone Takes a Turn.  
> **Target Duration:** 2 minutes 45 seconds  
> **Target Audience:** PayPal AI Hackathon Judges

---

### [0:00 – 0:25] THE HOOK & GLOBAL PROBLEM
*(Visual: Opening on ROSCOPAL landing page showing the global tradition map and logos of Susu, Tanda, Chit Fund, Chama, Stokvel, Paluwagan).*

**Narrator (Voiceover):**
"Around the world, millions of people save money together in rotating savings circles: Susu in West Africa, Tanda in Latin America, Chit funds in India, Chama in Kenya, and Stokvel in South Africa.
Members contribute a fixed amount each month, and one member takes home the accumulated pot. It runs on deep social trust and group chats.
The problem? Someone has to become an awkward, unpaid debt collector among friends and family.
Late payments break the circle, spreadsheets cause disputes, and cross-border families face endless friction.
Meet **ROSCOPAL** — the AI-powered treasurer for savings circles, built with PayPal and deterministic financial safety rules."

---

### [0:25 – 1:05] NATURAL LANGUAGE SETUP & CIRCLE ACTIVATION
*(Visual: Transitioning to the ROSCOPAL AI Assistant interface. Organizer Ada is logged in).*

**Narrator:**
"Setting up a circle takes one sentence. Ada organizes an eight-person diaspora savings circle with friends across London, Lagos, Houston, and Toronto.
Watch as Ada types:
*'Create a circle for eight people. Everyone contributes $100 monthly, starting Dec 1. Chidi needs the first pot for rent.'*
ROSCOPAL's AI agent parses the request in milliseconds:
- Eight members, $100 monthly, $800 target pot.
- 5-day grace period with deterministic payout conditions.
- And priority allocation: Chidi gets Turn #1 for his rent.
Ada reviews the structured policy card, clicks **Confirm & Initialize Circle**, and the circle is activated with a cryptographic Genesis block recorded in our audit ledger."

---

### [1:05 – 1:45] MEMBER EXPERIENCE & EXCEPTION HANDLING
*(Visual: Switching persona to Fatima Bello, member in London, then into the AI Assistant).*

**Narrator:**
"Each cycle, members receive one-click PayPal checkout requests. But life happens.
Member Fatima writes:
*'I can only pay on the 5th due to paycheck delay.'*
ROSCOPAL doesn't guess, and it never bypasses rules.
The AI agent inspects the circle's deterministic policy:
- Fatima has 0 of 1 permitted extensions used.
- The 4-day extension is within the 5-day grace window.
ROSCOPAL grants a provisional grace hold, notifies the group respectfully without public shaming, and locks the payout gate until conditions are satisfied."

---

### [1:45 – 2:20] DETERMINISTIC SAFETY GATE & PAYPAL PAYOUT
*(Visual: Switching back to Organizer Dashboard as Ada. Demonstrating the Safety Gate widget).*

**Narrator:**
"Here is the heart of ROSCOPAL: our **Deterministic Financial Safety Gate**.
Notice the eight non-bypassable programmatic checks:
- Circle Active
- Cycle Open
- Recipient Valid
- Contributions Confirmed
- Amount Exact
- Zero Duplicate Payouts
- Policy Satisfied
- Approvals Satisfied.
Because $200 is still pending, the payout gate is locked. The LLM cannot authorize money movement.
Now, watch: as Fatima and David complete their $100 contributions via PayPal Sandbox...
*BAM!* All eight checks turn green.
Ada clicks **Release Pot**. ROSCOPAL triggers the PayPal Payouts API, disburses the $800 pot directly to Chidi's PayPal account in Lagos, and posts the transaction receipt."

---

### [2:20 – 2:40] AG GRID SHA-256 HASH-CHAINED AUDIT LEDGER
*(Visual: Navigating to the Audit Ledger tab in AG Grid).*

**Narrator:**
"For complete group transparency, we built a shared financial ledger powered by **AG Grid**.
Members can sort, filter, and export the entire transaction history to CSV.
Every contribution, extension, and payout is cryptographically linked with SHA-256 hash chaining.
Watch as we click **Verify Chain Integrity** — our engine re-computes the cryptographic hash of every single block from Genesis to head, proving mathematically that the record is 100% tamper-proof."

---

### [2:40 – 2:55] SCENARIO RESULTS & PRODUCTION PATH
*(Visual: Switching to the Scenario Suite tab showing the 40/40 test results).*

**Narrator:**
"We tested ROSCOPAL against an automated 40-scenario suite:
- 100% intent classification accuracy.
- 100% policy compliance.
- And most importantly: **ZERO out-of-policy payouts.**
In production, custody would be administered through licensed payment institution partners or a direct-to-recipient peer escrow architecture.
ROSCOPAL brings dignity, clarity, and automation to billions of savers worldwide.
Everyone takes a turn."

---
*(End of video)*
