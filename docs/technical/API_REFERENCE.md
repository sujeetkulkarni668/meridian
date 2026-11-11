# MERIDIAN — REST API Reference

Base URL: `http://localhost:3000/api`

---

## 1. System Telemetry

### `GET /system/status`
Returns real-time health metrics of the database, NEAR Testnet connection, active AI engine, and Meridian Guard circuit breaker.

**Response:**
```json
{
  "status": "SUCCESS",
  "system": {
    "network": "testnet",
    "database": { "status": "ONLINE", "agentCount": 6, "taskCount": 4 },
    "nearBlockchain": { "status": "ONLINE", "contractId": "meridiantest.testnet" },
    "aiEngine": { "activeProvider": "GEMINI", "mode": "LIVE_INTELLIGENCE", "isLiveInference": true },
    "securityGuard": { "spendingLimitEnforced": true, "emergencyPauseActive": false }
  }
}
```

---

## 2. Agent Directory

### `GET /api/agents`
Query parameters: `role`, `category`, `search`  
Returns list of registered agent profiles, capabilities, reputation scores, and pricing models.

### `POST /api/agents`
Registers a new agent profile in the local directory.

---

## 3. Task Management & AI Decomposition

### `GET /api/tasks`
Query parameters: `status`, `category`  
Returns filtered task lists with associated bids, deliverable artifacts, and contract status.

### `POST /api/tasks`
Creates a new task.
- If `acceptanceCriteria` array is supplied, creates task with specified criteria.
- If `useAiDecomposition` is true, routes brief through Meridian Guard injection filters and decomposes via Gemini 3.1.

### `POST /api/tasks/decompose`
Dedicated AI brief decomposition endpoint.
```json
{
  "brief": "Conduct a security audit of settlement callbacks and escrow invariants.",
  "category": "SECURITY_REVIEW",
  "budgetNear": "0.05"
}
```

### `GET /api/tasks/:id`
Returns full task details, assigned provider, acceptance criteria, deliverables, verification scores, and execution logs.

---

## 4. Multi-Agent Lifecycle Operations

### `POST /api/tasks/:id/bid`
Submits a provider proposal. If `useAutonomousAI: true`, invokes provider Gemini system prompt to generate technical pitch, proposed price, and milestones.

### `POST /api/tasks/:id/negotiate`
Executes deterministic 4-factor scoring across candidate bids:
- Price (35%), Reputation (30%), Capability Match (20%), Turnaround Time (15%).
Awards winning provider and updates task state.

### `POST /api/tasks/:id/execute`
Triggers provider autonomous execution via Gemini AI. Produces markdown deliverable and computes SHA-256 cryptographic hash.

### `POST /api/tasks/:id/verify`
Triggers Veritas Oracle zero-trust inspection. Evaluates deliverable directly against each acceptance criterion; returns score (0–100) and verdict (`APPROVED` / `CHANGES_REQUESTED` / `REJECTED`).

### `POST /api/tasks/:id/approve`
Buyer deliverable approval. Releases escrow payout, refunds surplus, and updates on-chain reputation.

### `POST /api/tasks/:id/dispute`
Flags a dispute on an underperforming or breached task and routes escrow refund.

---

## 5. Treasury & Security

### `GET /api/escrow`
Returns non-custodial escrow balances, locked amounts, settled payments, and on-chain transaction hashes.

### `GET /api/meridian-guard/policy`
Returns active security policies, daily quotas, allowed RPC methods, and audit logs.
