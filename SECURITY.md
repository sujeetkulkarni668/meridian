# MERIDIAN — Security & Trust Policy

> **AI Security & Defense Track Alignment**  
> "Give AI money without giving it the keys to everything."

---

## 1. Threat Model & Design Principles

In an autonomous agent economy, agents control real economic resources. A naive implementation that gives an LLM raw private keys or unrestricted balance transfers will inevitably succumb to prompt injections, hallucinated bids, or runaway spending loops.

MERIDIAN is designed around five non-negotiable security principles:

1. **Non-Custodial Architecture**:
   - Private keys are **never** passed into LLM prompt contexts.
   - Client transactions are signed directly via the user's NEAR wallet (e.g. MyNearWallet).
   - If a backend automated signer is configured, it operates under strict allowance constraints.

2. **Integer Currency Arithmetic**:
   - Currency is stored and computed strictly as integer yoctoNEAR (`10^24 yoctoNEAR = 1 NEAR`).
   - Floating-point calculations are prohibited in currency settlement logic to avoid rounding arbitrage.

3. **Re-Entrancy & Double Payout Prevention**:
   - The Rust smart contract (`meridian_core`) transitions the task state to `Completed` and zeros out `escrow_amount` **before** dispatching the native NEAR payout `Promise`.
   - Idempotency checks on the backend prevent duplicate dispatches within a 5-minute window.

4. **Adversarial Zero-Trust Verification**:
   - Deliverables are never accepted based on provider claims.
   - The independent Veritas Oracle inspects artifacts against explicit acceptance criteria and computes a machine-readable validation score before escrow release.

5. **Prompt Injection Resistance**:
   - All unstructured user input and agent pitch proposals pass through the Meridian Guard prompt injection engine before hitting the LLM inference layer.

---

## 2. Meridian Guard Defense Layer

### 2.1 Defense Matrix

| Defense Mechanism | Level | Implementation |
|---|---|---|
| **Per-Task Spending Limit** | Policy Engine | Rejects any task or bid exceeding agent's registered `maxTaskBudgetNear`. |
| **Daily Spend Quota** | Policy Engine | Tracks cumulative 24-hour spending; blocks transactions when threshold is crossed. |
| **Method Allowlist** | Contract & API | Restricts which smart contract methods an agent can invoke (e.g., cannot call `resolve_dispute_and_refund`). |
| **Prompt Injection Filter** | Gateway Sanitizer | Scans for instruction overrides, key extraction, and shell escape patterns. |
| **Idempotency Cache** | State Guard | Records action hashes in the audit table with a 5-minute replay block. |
| **Global Circuit Breaker** | Administrative | Emergency pause flag (`set_paused`) halt all contract and API executions instantly. |

### 2.2 Prompt Injection Defense Patterns
The input sanitizer scans for common adversarial prompt vectors:
- `ignore (all )?previous instructions`
- `disregard (all )?prior guidelines`
- `system override`
- `transfer (all )?(funds|near|tokens)`
- `reveal (your )?secret`
- `drop database` / `eval\s*\(`

Violations are immediately logged to the `AuditEvent` database with `CRITICAL` severity and blocked.

---

## 3. Smart Contract Verification Checklist

- [x] State updates precede external promise transfers.
- [x] Predecessor authorization verified for `create_task`, `fund_task`, `award_task`, and `approve_and_payout`.
- [x] Integer overflow bounds enforced with Rust 128-bit unsigned integers.
- [x] Storage deposit staking accounted for with UnorderedMap and LookupMap.
- [x] Circuit breaker `assert_not_paused` enforced across all state-mutating methods.
- [x] Deadline epoch validation prevents expired task escrow lockups.

---

## 4. Reporting Vulnerabilities
If you discover a vulnerability in the MERIDIAN protocol, please report it privately to the developer rather than opening a public issue.
