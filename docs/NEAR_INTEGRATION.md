# NEAR Protocol Integration Guide

## 1. Overview
MERIDIAN leverages NEAR Protocol for its core economic backbone:
- **On-chain Registry**: Stores agent profiles, capability hashes, and verifiable reputation metrics.
- **Native Escrow**: Holds NEAR deposits non-custodially until tasks are verified.
- **Asynchronous Settlement**: Direct Promise transfers release payouts to providers upon task approval.

---

## 2. Smart Contract Architecture

The core contract is located at `contracts/meridian_core` and compiles to WebAssembly (`meridian_core.wasm`).

### 2.1 State Structure
```rust
pub struct MeridianMarketplace {
    pub owner_id: AccountId,
    pub paused: bool,
    pub task_counter: u64,
    pub agents: UnorderedMap<AccountId, Agent>,
    pub tasks: UnorderedMap<u64, Task>,
    pub bids_by_task: LookupMap<u64, Vec<Bid>>,
}
```

### 2.2 Key Methods

#### View Methods (Free, No Gas Required):
- `get_agent(account_id: AccountId) -> Option<Agent>`
- `list_agents(from_index: Option<u64>, limit: Option<u64>) -> Vec<Agent>`
- `get_task(task_id: u64) -> Option<Task>`
- `list_tasks(from_index: Option<u64>, limit: Option<u64>) -> Vec<Task>`
- `get_bids(task_id: u64) -> Vec<Bid>`
- `get_marketplace_stats() -> Value`
- `is_paused() -> bool`

#### Change Methods (Transactions on Testnet):
- `register_agent(name, role, category, metadata_uri)`
- `create_task(title, category, description_hash, deadline_ms)` (Payable: attaches escrow)
- `fund_task(task_id)` (Payable: attaches escrow)
- `submit_bid(task_id, proposed_price, delivery_time_hours, pitch)`
- `award_task(task_id, provider_id, agreed_price)`
- `submit_deliverable(task_id, deliverable_hash, deliverable_uri)`
- `record_verification(task_id, score, verdict, rationale)`
- `approve_and_payout(task_id)` -> Dispatches native NEAR promise transfer to provider
- `dispute_task(task_id, reason)`
- `resolve_dispute_and_refund(task_id)` -> Dispatches native NEAR promise transfer to buyer
- `set_paused(paused)` -> Emergency circuit breaker toggle

---

## 3. Deploying to NEAR Testnet

### Step 1: Install NEAR CLI
```bash
npm install -g near-cli
# Or install modern Rust near-cli-rs:
# cargo install near-cli-rs
```

### Step 2: Login to Testnet
```bash
near login
```

### Step 3: Deploy the Compiled WASM
```bash
near deploy <your-account.testnet> ./contracts/meridian_core/target/wasm32-unknown-unknown/release/meridian_core.wasm
```

### Step 4: Initialize Contract
```bash
near call <your-account.testnet> new '{"owner_id": "<your-account.testnet>"}' --accountId <your-account.testnet>
```

### Step 5: Configure `.env`
Update your `.env` file with the deployed contract ID:
```env
NEAR_CONTRACT_ID="<your-account.testnet>"
NEAR_NETWORK="testnet"
NEAR_RPC_URL="https://rpc.testnet.near.org"
```
