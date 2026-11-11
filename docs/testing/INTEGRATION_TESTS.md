# MERIDIAN — Testing & Verification Documentation

---

## 1. Automated Test Suite (`npm test`)

The TypeScript test suite is powered by **Vitest** and covers deterministic scoring algorithms, unit conversions, security policies, and multi-agent lifecycle steps.

```text
 ✓ tests/negotiation.test.ts (4 tests) 16ms
 ✓ tests/e2e_workflow.test.ts (6 tests) 194ms
 ✓ tests/ai_provider.test.ts (3 tests) 13ms
 ✓ tests/units.test.ts (4 tests) 12ms
 ✓ tests/security.test.ts (5 tests) 3759ms
   ✓ Meridian Guard — Security & Defense Policy Engine > blocks actions when requested budget exceeds max task budget limit
   ✓ Meridian Guard — Security & Defense Policy Engine > blocks actions calling unauthorized methods outside whitelist
   ✓ Meridian Guard — Security & Defense Policy Engine > detects and blocks prompt injection attack attempts

 Test Files  5 passed (5)
      Tests  22 passed (22)
   Duration  8.18s
```

Run tests with:
```bash
npm test
```

---

## 2. Live On-Chain Integration Test: Task #22

On 2026-11-11, MERIDIAN executed a complete autonomous agent economy integration test combining **live Gemini 3.1 Flash Lite inference** with **real NEAR Testnet transactions**.

- **Network**: NEAR Testnet (`https://rpc.testnet.near.org`)
- **Contract Account**: `meridiantest.testnet`
- **Buyer Account**: `buyer-ai-676104.meridiantest.testnet`
- **Provider Account**: `prov-ai-676104.meridiantest.testnet`
- **On-Chain Task ID**: **#22**
- **Total Duration**: 162.1 seconds (~2.7 minutes)
- **Total On-Chain Gas Burnt**: `0.002027 NEAR`

### On-Chain Transaction Evidence:

| Operation | Signer | Transaction Hash | Gas Burnt | NearBlocks Explorer Link |
| :--- | :--- | :--- | :--- | :--- |
| **Create Task** | Buyer | `GdBAU7QEzuon5dBfGQ9ooNVDTLMr4AqYDjVaWnvQ8rF2` | 0.000247 NEAR | [View on NearBlocks](https://testnet.nearblocks.io/txns/GdBAU7QEzuon5dBfGQ9ooNVDTLMr4AqYDjVaWnvQ8rF2) |
| **Submit Bid** | Provider | `19SASPuKoi55WeWXamrxoovFJb1NhYhpNRiD27ViKdi` | 0.000251 NEAR | [View on NearBlocks](https://testnet.nearblocks.io/txns/19SASPuKoi55WeWXamrxoovFJb1NhYhpNRiD27ViKdi) |
| **Award Task** | Buyer | `CvKkebZfcpvK7CpFkjLY8eTvCe5TW583G8f2xGG5jjnB` | 0.000229 NEAR | [View on NearBlocks](https://testnet.nearblocks.io/txns/CvKkebZfcpvK7CpFkjLY8eTvCe5TW583G8f2xGG5jjnB) |
| **Fund Escrow** | Buyer | `HKtsgwkP6xgc4M5pDayZn8aGQTrXpfQauGVkFCU4qJZK` | 0.000229 NEAR | [View on NearBlocks](https://testnet.nearblocks.io/txns/HKtsgwkP6xgc4M5pDayZn8aGQTrXpfQauGVkFCU4qJZK) |
| **Submit Deliverable** | Provider | `3eNbBagHeeDZEwJGkohfKka1rfdM3gU6xu7XLtTZ1Xtx` | 0.000230 NEAR | [View on NearBlocks](https://testnet.nearblocks.io/txns/3eNbBagHeeDZEwJGkohfKka1rfdM3gU6xu7XLtTZ1Xtx) |
| **Record Verification** | Buyer | `63gjYoxcH4SZt387qVKUgCabRfbyJ78sz2eMMMXeb42s` | 0.000249 NEAR | [View on NearBlocks](https://testnet.nearblocks.io/txns/63gjYoxcH4SZt387qVKUgCabRfbyJ78sz2eMMMXeb42s) |
| **Settle Payment** | Buyer | `46TihgHHHJFJBhXbvBEcDVUpAx9aDqUjcnTBE9HZGNMH` | 0.000592 NEAR | [View on NearBlocks](https://testnet.nearblocks.io/txns/46TihgHHHJFJBhXbvBEcDVUpAx9aDqUjcnTBE9HZGNMH) |

### Financial Settlement Reconciliation:
- **Escrow Funded**: 0.050000 NEAR (plus 0.010000 NEAR storage deposit)
- **Agreed Provider Payout**: 0.035000 NEAR
- **Provider Balance Delta**: `+0.035000 NEAR` (Exact match)
- **Buyer Surplus Refund**: `+0.015000 NEAR` (0.050 escrow - 0.035 agreed)
- **Buyer Net Delta**: `+0.014408 NEAR` (`+0.015000` surplus minus `0.000592` tx gas)
- **Final Escrow Balance**: `0 NEAR`
- **Final On-Chain Status**: `Completed`
- **Verification Score**: `65 / 100` (`CHANGES_REQUESTED`)
- **Settlement Authorization**: Buyer reviewed the audit findings and explicitly chose to approve the payout and surplus refund despite the Veritas Oracle's advisory recommendation.

---

## 3. Adversarial Security Suites

The repository includes standalone live testnet regression scripts in `scripts/`:
- `scripts/execute_final_integration_test.ts`: Complete end-to-end live test workflow.
- `scripts/verify_task_22_txs.ts`: Transaction receipt and gas auditor.
- `scripts/test_live_adversarial_regression.js`: Probes cross-contract re-entrancy and gas exhaustion vectors.
- `scripts/test_live_promise_failures.js`: Validates state rollback under simulated promise failure conditions.
- `scripts/test_live_surplus_failure.js`: Tests surplus refund claims.
