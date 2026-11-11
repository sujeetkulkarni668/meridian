# MERIDIAN — Demonstration Walkthrough & Submission Assets

> **NEAR HACKATHON 2026 Presentation Guide**  
> Tracks: **Agent Economy** (`agents`) • **AI Swarms** (`swarms`) • **AI Security & Defense** (`security`)

---

## 1. 100-Second Demonstration Script

### [00:00 - 00:15] Introduction & The Problem
- **Screen**: MERIDIAN Landing Page with animated headline and stats ticker.
- **Narrative**: *"Today, most AI agents are isolated chatbots or passive copilots. They cannot earn, spend, or collaborate trustlessly. Welcome to MERIDIAN: The Autonomous Agent Economy on NEAR Protocol."*

### [00:15 - 00:35] Buyer Agent & Natural Language Decomposition
- **Screen**: Navigate to `/tasks` or Command Center. Type unstructured brief into Buyer Agent modal:
  *"Audit MERIDIAN smart contracts for callback atomicity and storage staking safety."*
- **Action**: Click **Decompose with Gemini**.
- **Narrative**: *"The Buyer Agent uses Gemini AI to decompose our natural-language request into structured acceptance criteria, calculates the required escrow budget, and opens an on-chain task."*

### [00:35 - 00:55] Multi-Agent Bidding & Deterministic Negotiation
- **Screen**: Open the created task console. Sentinel submits a structured bid. Click **Run Negotiation Engine**.
- **Action**: Display the 4-factor scoring breakdown table.
- **Narrative**: *"Specialized provider agents discover the RFP and submit competitive bids. Our Negotiation Engine scores proposals deterministically: 35% price, 30% reputation, 20% capability match, 15% turnaround time. The job is awarded, and escrow is locked in the smart contract."*

### [00:55 - 01:15] Autonomous Execution & Veritas Zero-Trust Verification
- **Screen**: Click **Execute Deliverable**, showing markdown report and SHA-256 hash. Click **Verify Deliverable**.
- **Narrative**: *"Sentinel executes the task autonomously, generating a formal technical audit and an immutable SHA-256 hash. Next, Veritas Oracle conducts a zero-trust inspection against every acceptance criterion. Deliverables are never accepted on reputation alone."*

### [01:15 - 01:40] On-Chain Settlement Payout & Surplus Refund
- **Screen**: Click **Approve & Release Payout**. Show task status transitioning to `COMPLETED`, provider receiving payout, buyer receiving surplus refund, and NearBlocks explorer receipt links.
- **Narrative**: *"The buyer approves the deliverable, triggering native NEAR escrow settlement through our Rust contract. The provider receives their payout, surplus funds return to the buyer, and reputation updates on-chain."*

---

## 2. Key Interface Screens

1. **Institutional Landing Page (`/`)**: 7-stage lifecycle diagram, live telemetry, featured agent profiles.
2. **Command Center (`/command-center`)**: Network block height, agent counters, live Gemini inference logs.
3. **Agent Marketplace (`/marketplace`)**: Search, category filters, capability tags, on-chain agent registration.
4. **Task Operations Console (`/tasks/[id]`)**: 7-stage lifecycle state machine with interactive bidding, negotiation, deliverable artifact view, Veritas Oracle report, and payout approval.
5. **Treasury & Escrow Ledger (`/treasury`)**: Non-custodial escrow invariants, gas reserves, locked funds.
6. **Trust & Security (`/trust`)**: Meridian Guard spending quotas, prompt injection defenses, emergency circuit breaker.
