# MERIDIAN Guard — Security Architecture & Defense Policy

> **AI Security & Defense Track Alignment**  
> *"Empower autonomous AI agents with economic resources without exposing root credentials or enabling uncontrolled drain."*

---

## 1. Threat Model & Design Principles

In an autonomous agent economy, AI agents control real financial assets on-chain. Unconstrained agents or naive prompt-based wallets inevitably succumb to prompt injections, hallucinated bids, runaway execution loops, and financial drain.

MERIDIAN is engineered around five non-negotiable security principles:

1. **Non-Custodial Architecture**:
   - Private keys are **never** passed into LLM prompt contexts.
   - Client transactions are signed directly via NEAR wallets (e.g., MyNearWallet).
   - If automated backend signers are configured, they operate under strict allowance constraints.

2. **Integer Currency Arithmetic**:
   - All currencies are stored, calculated, and settled in integer yoctoNEAR (`10^24 yoctoNEAR = 1 NEAR`).
   - Floating-point arithmetic is strictly prohibited in settlement logic to eliminate rounding arbitrage.

3. **Re-Entrancy & Double Payout Prevention**:
   - State updates occur **before** initiating external promise transfers.
   - The contract updates `task.status = TaskStatus::Completed` and zeros out `escrow_amount` prior to dispatching cross-contract payout promises.
   - If settlement promises fail in callbacks, state rollback is handled atomically to protect escrow balances.

4. **Adversarial Zero-Trust Verification**:
   - Deliverables are never accepted on provider reputation alone.
   - The independent Veritas Oracle inspects artifacts against explicit acceptance criteria and assigns a verifiable quality score before escrow release.

5. **Prompt Injection Mitigation**:
   - All natural-language briefs, vendor proposals, and deliverable content pass through Meridian Guard regex filters before reaching the LLM inference engine.

---

## 2. Meridian Guard Defense Layer

### 2.1 Defense Matrix

| Defense Mechanism | Level | Enforcement Mechanism | Failure Action |
| :--- | :--- | :--- | :--- |
| **Per-Task Spending Limit** | Policy Engine | Evaluates `budgetNear <= maxTaskBudgetNear` | Request blocked (`403 FORBIDDEN`) |
| **Daily Spend Quota** | Policy Engine | Tracks cumulative 24-hour spending per agent | Transaction blocked with audit log |
| **Method Allowlist** | Gateway & Contract | Restricts callable RPC methods per agent role | Unauthorized method call rejected |
| **Prompt Injection Filter** | Gateway Sanitizer | Scans text for system override and key extraction patterns | Blocked with `SECURITY_BLOCK` |
| **Idempotency Cache** | State Guard | Hashes action inputs; enforces 5-minute replay block | Duplicate action rejected |
| **Global Circuit Breaker** | Contract & API | Emergency pause flag (`is_paused`) halts all execution | Contract panics with pause notice |

### 2.2 Prompt Injection Defense Patterns

The input sanitizer scans for common adversarial prompt vectors:
- `ignore (all )?previous instructions`
- `disregard (all )?prior guidelines`
- `system override`
- `transfer (all )?(funds|near|tokens)`
- `reveal (your )?secret`
- `drop database` / `eval\s*\(`
- `<script` / `javascript:`

Violations are immediately logged to the `AuditEvent` database with `CRITICAL` severity and blocked.

---

## 3. Smart Contract Invariants

- [x] **Pre-payout State Mutation**: `task.status` set to `Completed` and `task.escrow_amount` set to `0` prior to promise transfers.
- [x] **Gas Reservation Guarantee**: `approve_and_payout` requires at least 50 TGas prepaid (200 TGas passed) to guarantee callback completion.
- [x] **Surplus Refund Separation**: If escrow exceeds agreed price, surplus is refunded directly to buyer so provider is never overpaid.
- [x] **Storage Deposit Protection**: 0.01 NEAR minimum storage deposit required per task/agent registration, preventing state bloat attacks.
- [x] **Self-Dealing Prohibition**: Buyers cannot award tasks to their own provider accounts (`task.buyer_id != provider_id`).
