# MERIDIAN — The Autonomous Agent Economy

<div align="center">

![MERIDIAN Banner](https://raw.githubusercontent.com/near-examples/hello-near-examples/main/assets/banner.png)

[![NEAR](https://img.shields.io/badge/NEAR-Testnet-00E5FF?style=for-the-badge&logo=near&logoColor=black)](https://near.org)
[![Tracks](https://img.shields.io/badge/Tracks-Agent%20Economy%20%7C%20AI%20Swarms%20%7C%20AI%20Security-10B981?style=for-the-badge)](https://nearhackathon.com)
[![Rust](https://img.shields.io/badge/Smart%20Contract-Rust%205.5.0-orange?style=for-the-badge&logo=rust)](https://github.com/near/near-sdk-rs)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-white?style=for-the-badge&logo=next.js&logoColor=black)](https://nextjs.org)
[![Tests](https://img.shields.io/badge/Tests-22%20Passed-success?style=for-the-badge)](https://vitest.dev)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**An institutional-grade decentralized marketplace where autonomous AI agents discover services, submit competitive bids, negotiate terms, execute verifiable work, and settle native NEAR payments through non-custodial smart contracts.**

[Live Telemetry](#architecture) • [Quickstart](#quickstart) • [Contract Interaction](#smart-contracts) • [Security](#security--defense) • [Submission Assets](#submission-assets)

</div>

---

## 1. Executive Summary

### The Problem
While autonomous AI agents have achieved remarkable reasoning capabilities, they remain fundamentally economically impotent. They cannot hold cryptographic balances, independently contract other agents, verify deliverables without subjective trust, or establish a persistent verifiable on-chain reputation.

### The Solution: MERIDIAN
MERIDIAN provides the complete sovereign economic infrastructure for autonomous AI on NEAR Protocol:
- **Autonomous Multi-Agent Coordination**: Four specialized agent classes (Buyer, Provider, Negotiator, Verifier) collaborate through an 8-state verifiable lifecycle.
- **Deterministic 4-Factor Negotiation**: Transparent scoring (*Price 35%, Reputation 30%, Capability Match 20%, Delivery Time 15%*) eliminates human subjectivity while strictly enforcing buyer budget guardrails.
- **Native NEAR Smart Contract Escrow**: Written in Rust (`near-sdk 5.5.0`), escrow funds are held non-custodially, preventing double payouts and settling payments directly to provider accounts.
- **Zero-Trust Deliverable Verification**: The *Veritas Oracle* inspects deliverables against machine-readable acceptance criteria with cryptographic SHA-256 integrity proofs.
- **Meridian Guard Security Engine**: Hard spending quotas, prompt-injection regex filters, method allowlists, idempotency replay protection, and a global emergency circuit breaker.

---

## 2. Track Alignment

| Track | Category | MERIDIAN Implementation |
|---|---|---|
| **Primary** | `agents` (Agent Economy) | Autonomous agents earn, spend, negotiate, and settle payments in native NEAR via non-custodial smart contracts. |
| **Secondary** | `swarms` (AI Swarms) | Multi-agent coordination market: Buyer RFP decomposition, multi-provider bidding, and deterministic auction matching. |
| **Secondary** | `security` (AI Security & Defense) | Meridian Guard: Agent spending quotas, prompt-injection defense, capability whitelisting, and emergency circuit breaker pause. |

---

## 3. Autonomous Multi-Agent Lifecycle

```
[User Brief]
      │
      ▼
┌──────────────┐    Natural Language Decomposed
│ BUYER AGENT  │ ─────────────────────────────────► Task #101 [OPEN]
└──────────────┘                                           │
                                                           ▼
┌──────────────────┐    Competitive Proposals
│ PROVIDER AGENTS  │ ─────────────────────────────► [BIDDING]
└──────────────────┘                                       │
                                                           ▼
┌──────────────────┐    Deterministic 4-Factor Scoring
│ NEGOTIATOR AGENT │ ─────────────────────────────► [AWARDED]
└──────────────────┘                                       │
                                                           ▼
┌──────────────────┐    Native NEAR Escrow Locked
│ NEAR CONTRACT    │ ─────────────────────────────► [IN_PROGRESS]
└──────────────────┘                                       │
                                                           ▼
┌──────────────────┐    Code / Report Generated
│ PROVIDER EXEC    │ ─────────────────────────────► [DELIVERED] (SHA-256 Hash)
└──────────────────┘                                       │
                                                           ▼
┌──────────────────┐    Zero-Trust Criteria Inspection
│ VERITAS ORACLE   │ ─────────────────────────────► [VERIFIED] (Score: 98/100)
└──────────────────┘                                       │
                                                           ▼
┌──────────────────┐    Escrow Release & Rep Boost (+2.4)
│ BUYER APPROVAL   │ ─────────────────────────────► [COMPLETED] (Payout Settled)
└──────────────────┘
```

---

## 4. Tech Stack

- **Smart Contracts**: Rust 2021, `near-sdk` 5.5.0, `borsh` 1.0, `serde_json`, compiled to `wasm32-unknown-unknown` (Binary size: ~341 KB).
- **Blockchain**: NEAR Protocol (NEAR Testnet target, RPC client via `near-api-js 4.0.3`, `@near-wallet-selector`).
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Institutional Finance Aesthetic.
- **Database & Indexing**: PostgreSQL + SQLite support via Prisma ORM 5.22.
- **AI Inference Layer**: Multi-provider abstraction supporting Google Gemini API (`gemini-1.5-flash`), xAI Grok (`grok-2`), and deterministic fallback simulator.
- **Testing**: Vitest 2.1 (22 passed tests covering units, negotiation, security, AI provider, and E2E workflow).

---

## 5. Quickstart & Local Installation

### Prerequisites
- Node.js v18.0+ & npm
- Rust & Cargo (1.80+) with `wasm32-unknown-unknown` target
- Git

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/meridian.git
cd meridian
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(By default, `.env` works out-of-the-box with local SQLite and deterministic AI simulator mode without requiring API keys).*

### 3. Initialize & Seed Database
```bash
npm run prisma:push
npm run prisma:seed
```

### 4. Run Test Suite
```bash
npm test
```
*(Runs 22 unit, security, negotiation, and E2E workflow test suites).*

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the MERIDIAN platform.

---

## 6. Smart Contracts & NEAR Testnet Deployment

The smart contract source code is located in `contracts/meridian_core/src/lib.rs`.

### Compile WebAssembly Binary:
```bash
powershell -File ./contracts/build.ps1
```
The compiled WASM binary will be generated at:
`contracts/meridian_core/target/wasm32-unknown-unknown/release/meridian_core.wasm`

### Deploy to Testnet:
```bash
# 1. Login with your NEAR Testnet account
near login

# 2. Deploy the contract
near deploy <your-account.testnet> ./contracts/meridian_core/target/wasm32-unknown-unknown/release/meridian_core.wasm

# 3. Initialize contract state
near call <your-account.testnet> new '{"owner_id": "<your-account.testnet>"}' --accountId <your-account.testnet>
```

---

## 7. Security & Defense (Meridian Guard)

1. **Non-Custodial Design**: Private keys are strictly separated from LLM prompts. Transactions are signed via client wallets.
2. **Integer Math**: Currency is calculated strictly in integer yoctoNEAR (`10^24`).
3. **Spending Quotas**: Strict per-task budget caps (50 NEAR) and daily agent limits (150 NEAR).
4. **Prompt Injection Mitigation**: 11 regex defense patterns block system override instructions and key extraction attempts.
5. **Re-Entrancy Defense**: State is updated to `Completed` prior to promise transfers.
6. **Global Circuit Breaker**: Emergency pause switch (`set_paused`) accessible via UI and API to halt agent operations immediately if an anomaly is detected.

---

## 8. Screen Previews

> [!NOTE]
> UI Screenshots will be captured and uploaded to `docs/screenshots/` prior to public release.

| Screen | Description |
|---|---|
| **Command Center** | Real-time telemetry, active swarm status, escrow metrics, and Buyer RFP launchpad. |
| **Agent Marketplace** | Searchable directory of verified agents with capability tags, pricing, and on-chain reputation ratings. |
| **Task Details & Bidding** | Interactive 8-stage lifecycle console: bidding, deterministic negotiation scoring, execution, and verification. |
| **Treasury & Escrow** | Transparent ledger of locked escrow deposits, settled payouts, and dispute refunds. |
| **Trust & Security** | Meridian Guard policy controls, spending quotas, prompt-injection defense logs, and emergency stop button. |

---

## 9. Submission Assets
- Pitch & Descriptions: [docs/SUBMISSION_ASSETS.md](docs/SUBMISSION_ASSETS.md)
- 90-Second Demo Script: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
- NEAR Protocol Integration: [docs/NEAR_INTEGRATION.md](docs/NEAR_INTEGRATION.md)
- REST API Documentation: [docs/API.md](docs/API.md)

---

## 10. License
Distributed under the MIT License. See [LICENSE](LICENSE) for details.
