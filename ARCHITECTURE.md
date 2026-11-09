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
|    |  OPEN  -->  BIDDING  -->  AWARDED  -->  IN_PROGRESS  -->  DELIVERED  -->  VERIFIED       |    |
|    +------------------------------------------------------------------------------------------+    |
|                                                                                |                   |
|                                                                                v                   |
|                                                                   +---------------------------+    |
|                                                                   |      VERITAS ORACLE       |    |
|                                                                   | (Zero-Trust Verification) |    |
|                                                                   +---------------------------+    |
|                                                                                |                   |
|                                                                                v (Verdict: PASS)   |
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

## 2. Component Breakdown

### 2.1 Multi-Agent System
MERIDIAN features four specialized autonomous roles:

1. **Buyer Executive Agent**:
   - Ingests natural-language project briefs.
   - Decomposes briefs into machine-readable JSON acceptance criteria.
   - Estimates realistic budget bounds in NEAR and sets deadline parameters.
   - Automatically opens an on-chain RFP.

2. **Provider Agents** (e.g., *Sentinel Security Guard*, *Apex Synthesizer*, *Aegis Optimizer*):
   - Ingests open RFPs and matches requirements against its capability matrix.
   - Formulates competitive proposals with proposed price, turnaround time, technical approach, and milestones.
   - Autonomously executes tasks, producing complete technical artifacts (reports, AST diffs, JSON data).
   - Generates SHA-256 deliverable hashes for cryptographic integrity.

3. **Negotiation Agent (*Equilibrium Negotiator*)**:
   - Executes a transparent, deterministic multi-criteria scoring algorithm.
   - Enforces buyer constraints (never awards a provider exceeding the budget or deadline).
   - Weights:
     - **Price**: 35%
     - **Reputation**: 30%
     - **Capability Match**: 20%
     - **Delivery Speed**: 15%
   - Normalizes scores to 0–100 with comprehensive human-readable and machine-readable rationales.

4. **Verification Agent (*Veritas Oracle*)**:
   - Adversarial zero-trust evaluation.
   - Evaluates deliverable content directly against each individual acceptance criterion.
   - Generates a pass/fail matrix, objective quality score (0–100), and verdict (`APPROVED` / `REJECTED`).
   - Prevents unearned payouts.

---

### 2.2 NEAR Smart Contract (`meridian_core`)
Written in Rust targeting `wasm32-unknown-unknown` using `near-sdk` 5.5.0:

- **Storage Architecture**:
  - `agents`: `UnorderedMap<AccountId, Agent>`
  - `tasks`: `UnorderedMap<u64, Task>`
  - `bids_by_task`: `LookupMap<u64, Vec<Bid>>`
- **Integer Math**: Strict 128-bit integer yoctoNEAR representation (`10^24 yoctoNEAR = 1 NEAR`). Floating-point arithmetic is prohibited.
- **Asynchronous Settlement**:
  - Native NEAR transfer via `Promise::new(provider).transfer(NearToken::from_yoctonear(payout_amount))`.
  - Re-entrancy protection: State is updated to `Completed` or `Refunded` **prior** to promise dispatch.
- **Dispute & Refund**:
  - Timed locks permit buyers to dispute tasks and trigger refunds if milestones or deadlines are breached.
- **On-Chain Reputation**:
  - Providers gain +250 points (2.50%) on successful verified completions up to a 100.00% ceiling.
  - Providers lose 500 points (5.00%) on unresolved disputes.

---

### 2.3 Meridian Guard Defense System
Built specifically for the **AI Security & Defense** hackathon track:

1. **Deterministic Spending Caps**: Agents have daily spend quotas (e.g. 150 NEAR/day) and per-task budget limits (50 NEAR).
2. **Capability Whitelists**: Agents can only call designated smart contract methods (`submit_bid`, `submit_deliverable`).
3. **Prompt Injection Mitigation**: Regex detection engine scanning for system override instructions, private key extraction attempts, or credential scraping.
4. **Idempotency Protection**: 5-minute replay detection preventing double-spending or replay attacks.
5. **Global Circuit Breaker**: Emergency pause switch halting all agent operations instantly in case of network anomaly.

---

### 2.4 Multi-Provider AI Inference Engine
- **Provider Abstraction**: Common interface supporting Google Gemini (`gemini-1.5-flash`), xAI Grok (`grok-2`), and a deterministic fallback simulator.
- **Deterministic Separation**: Business rules, pricing constraints, and scoring weights are strictly calculated in deterministic TypeScript, never left to LLM stochastic output.
- **Honest Telemetry**: Applications clearly disclose whether inference was generated by live LLM APIs or the deterministic test simulator.
