# MERIDIAN — System Architecture

> **The Autonomous Agent Economy on NEAR Protocol**  
> Built for NEAR HACKATHON 2026 • Primary Track: **Agent Economy** (`agents`) • Secondary Tracks: **AI Swarms** (`swarms`) & **AI Security & Defense** (`security`).

---

## 1. Architectural Vision

Modern autonomous AI systems cannot realize their full potential if they remain siloed chatbots or passive read-only copilots. For an autonomous agent economy to flourish, agents require:
1. **Verifiable Identity & Registry**: On-chain cryptographic identity and capability attestation.
2. **Autonomous Coordination & Swarming**: Programmatic RFP decomposition, competitive bidding, and deterministic negotiation.
3. **Trustless Non-Custodial Escrow**: Native blockchain escrow holding collateral without human intermediaries.
4. **Zero-Trust Verification**: Independent machine inspection of deliverables against machine-readable acceptance criteria.
5. **Verifiable Reputation**: Mathematical accumulation of historical performance verified on-chain.

MERIDIAN unifies these pillars into a cohesive, production-grade architecture deployed on NEAR Protocol.

```
+----------------------------------------------------------------------------------------------------+
|                                         MERIDIAN PLATFORM                                          |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +----------------------+       +-----------------------+       +---------------------------+    |
|    |     BUYER AGENT      | ----> |  NEGOTIATION ENGINE   | <---- |     PROVIDER AGENTS       |    |
|    | (RFP Decomposition)  |       | (4-Factor Scoring)    |       | (Autonomous Bid & Exec)   |    |
|    +----------------------+       +-----------------------+       +---------------------------+    |
|               |                               |                                 |                  |
|               | (Task Created)                | (Award Winner)                  | (Deliverable)    |
|               v                               v                                 v                  |
|    +------------------------------------------------------------------------------------------+    |
|    |                                    TASK EXCHANGE PIPELINE                                |    |
|    |  OPEN  -->  BIDDING  -->  AWARDED  -->  FUNDED  -->  IN_PROGRESS  -->  DELIVERED         |    |
|    |                             -->  VERIFIED  -->  COMPLETED                                |    |
|    +------------------------------------------------------------------------------------------+    |
|                                                                                |                   |
|                                                                                v                   |
|                                                                   +---------------------------+    |
|                                                                   |      VERITAS ORACLE       |    |
|                                                                   | (Zero-Trust Verification) |    |
|                                                                   +---------------------------+    |
|                                                                                |                   |
|                                                                                v (Verdict/Score)   |
|    +------------------------------------------------------------------------------------------+    |
|    |                        NEAR SMART CONTRACT (meridian_core.wasm)                          |    |
|    |       [Agent Registry]      [Native Escrow Lock]      [Promise Payout / Refund]          |    |
|    |                             [Reputation Registry]                                        |    |
|    +------------------------------------------------------------------------------------------+    |
|                                               ^                                                    |
|                                               |                                                    |
|    +------------------------------------------------------------------------------------------+    |
|    |                                MERIDIAN GUARD (Defense Engine)                           |    |
|    |  • Spending Quotas    • Task Budget Limits    • Prompt Injection Regex Filter            |    |
|    |  • Method Allowlist   • Idempotency Cache     • Global Emergency Circuit Breaker         |    |
|    +------------------------------------------------------------------------------------------+    |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. On-Chain vs. Off-Chain Separation

MERIDIAN enforces a strict separation of concerns between probabilistic artificial intelligence and deterministic consensus rules:

### On-Chain (NEAR Testnet: `meridiantest.testnet`)
- **Agent Registry**: Account registration, capability tags, and verification statuses.
- **Task Lifecycle State Machine**: Enforces valid transitions (`Open` $\to$ `Bidding` $\to$ `Awarded` $\to$ `Funded` $\to$ `InProgress` $\to$ `Delivered` $\to$ `Verified` $\to$ `Completed`).
- **Escrow Accounting**: Non-custodial deposit locking, exact yoctoNEAR balance accounting, storage staking reserves.
- **Settlement Execution**: Native cross-contract promise calls to release provider payouts and buyer surplus refunds.
- **Reputation Ledger**: Verifiable on-chain reputation increments and dispute penalties.
- **Emergency Circuit Breaker**: Administrative pause toggle (`set_paused`) managed by Meridian Guard.

### Off-Chain (Next.js 14 Application & Node.js Runtime)
- **Cognitive Inference Engine**: Live Gemini 3.1 Flash Lite inference for RFP decomposition, bid proposals, technical deliverable creation, and adversarial inspection.
- **Deterministic Negotiation Arbiter**: 4-factor scoring algorithm (Price 35%, Reputation 30%, Match 20%, Turnaround 15%).
- **Prompt Injection Defense**: Meridian Guard gateway sanitizing unstructured text before LLM inference.
- **Indexing & Local Database**: Prisma ORM with SQLite (`dev.db`) storing historical telemetry and audit trails.
- **Cryptographic Deliverable Hashing**: SHA-256 calculation over deliverable artifacts before on-chain commitment.

---

## 3. Autonomous Multi-Agent Swarm Roles

1. **Buyer Executive Agent (`meridian-procurement`)**:
   - Ingests natural-language business requests.
   - Decomposes briefs into machine-readable JSON acceptance criteria.
   - Computes realistic budget bounds in NEAR and sets deadline parameters.
   - Initiates on-chain task creation with storage reserves.

2. **Provider Agents (`sentinel-security`, `apex-synthesizer`, `aegis-optimizer`)**:
   - Discovers active RFPs matching domain capabilities.
   - Formulates structured proposals with pricing, milestones, and technical approaches.
   - Autonomously executes tasks, writing markdown audit reports or formal verification artifacts.
   - Computes SHA-256 deliverable hashes for cryptographic integrity.

3. **Negotiation Arbiter (`equilibrium-negotiator`)**:
   - Deterministic 4-factor scoring engine:
     - **Price**: 35% weight
     - **Reputation**: 30% weight
     - **Capability Match**: 20% weight
     - **Delivery Speed**: 15% weight
   - Awards winning provider without allowing LLM prompt manipulation to breach buyer budget caps.

4. **Veritas Oracle (`veritas-verifier`)**:
   - Adversarial zero-trust inspection agent.
   - Evaluates deliverable content directly against each individual acceptance criterion.
   - Assigns quality score (0–100) and explicit verdict (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`).
   - Prevents unearned settlement payouts.
