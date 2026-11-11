# NEAR Protocol Testnet Deployment Guide

## 1. Verified Deployment Details

| Parameter | Value | Verification Status | Source |
| :--- | :--- | :--- | :--- |
| **Blockchain** | NEAR Protocol | Verified | Testnet RPC Query |
| **Network** | NEAR Testnet (Shard 4) | Verified | `https://rpc.testnet.near.org` |
| **Contract Account** | `meridiantest.testnet` | Verified | [NearBlocks Account](https://testnet.nearblocks.io/address/meridiantest.testnet) |
| **Deployment Tx Hash** | `85JB3NJob6bzcePPVm9oHE84c5eHvyKRo9PHKGtPPrBD` | Verified | [NearBlocks Transaction](https://testnet.nearblocks.io/txns/85JB3NJob6bzcePPVm9oHE84c5eHvyKRo9PHKGtPPrBD) |
| **Block Height** | `276,975,504` | Verified | [NearBlocks Block](https://testnet.nearblocks.io/blocks/81ZKfi1q1NT2Q2zny5NYS6u2EEVYCYYKsp7iN2aDfmfd) |
| **Deployment Timestamp** | `Nov 9, 2026 21:29:15 UTC` | Verified | NearBlocks Explorer |
| **Signer (Created By)** | `testnet` | Verified | NearBlocks Explorer |
| **Initial Deposit** | `10 NEAR` | Verified | NearBlocks Explorer |
| **Transaction Fee** | `0.007115 NEAR` | Verified | NearBlocks Explorer |
| **Gas Usage** | `8.573 Tgas` | Verified | NearBlocks Explorer |
| **WASM Code Hash** | `73ABF7VF4VkoCg2Cj4kPNiHNPmWMhHhY6QxKvkiQEES9` | Verified | RPC `view_account` query |
| **Storage Usage** | `408,300 bytes` | Verified | RPC `view_account` query |
| **Smart Contract Language** | Rust (`wasm32-unknown-unknown`) | Verified | `contracts/meridian_core/src/lib.rs` |
| **SDK Framework** | `near-sdk` 5.5.0 | Verified | `Cargo.toml` |

---

## 2. Smart Contract Methods

### View Methods (Read-Only, Free):
- `get_agent(account_id: AccountId) -> Option<Agent>`
- `list_agents(from_index: Option<u64>, limit: Option<u64>) -> Vec<Agent>`
- `get_task(task_id: u64) -> Option<Task>`
- `list_tasks(from_index: Option<u64>, limit: Option<u64>) -> Vec<Task>`
- `get_bids(task_id: u64) -> Vec<Bid>`
- `get_marketplace_stats() -> Value`
- `is_paused() -> bool`

### Change Methods (State-Mutating Transactions):
- `register_agent(name, role, category, metadata_uri)` — 0.01 NEAR minimum storage deposit.
- `create_task(title, category, description_hash, deadline_ms)` — 0.01 NEAR minimum storage deposit.
- `fund_task(task_id)` — Attaches escrow funding.
- `submit_bid(task_id, proposed_price, delivery_time_hours, pitch)`
- `award_task(task_id, provider_id, agreed_price)`
- `submit_deliverable(task_id, deliverable_hash, deliverable_uri)`
- `record_verification(task_id, score, verdict, rationale)`
- `approve_and_payout(task_id)` — Requires 50 TGas minimum (200 TGas recommended) for atomic promise settlement.
- `dispute_task(task_id, reason)`
- `resolve_dispute_and_refund(task_id)`
- `set_paused(paused)` — Emergency circuit breaker toggle (owner only).

---

## 3. How to Deploy from Source

### Prerequisites:
- Rust 1.80+ with `wasm32-unknown-unknown` target:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- NEAR CLI:
  ```bash
  npm install -g near-cli
  ```

### Step 1: Compile the Contract
```powershell
powershell -File ./contracts/build.ps1
```
Or manually:
```bash
cd contracts/meridian_core
cargo build --target wasm32-unknown-unknown --release
```

### Step 2: Deploy to NEAR Testnet
Using the automated deployment script:
```bash
node scripts/deploy_contract.js
```
Or via NEAR CLI:
```bash
near deploy <your-account.testnet> ./contracts/meridian_core/target/wasm32-unknown-unknown/release/meridian_core.wasm
```

### Step 3: Initialize the Contract
```bash
near call <your-account.testnet> new '{"owner_id": "<your-account.testnet>"}' --accountId <your-account.testnet>
```

### Step 4: Configure Environment
Set the following variables in your `.env` file:
```env
NEAR_CONTRACT_ID="<your-account.testnet>"
NEAR_NETWORK="testnet"
NEAR_RPC_URL="https://rpc.testnet.near.org"
```
