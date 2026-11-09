# MERIDIAN — Hackathon Submission Package

> **NEAR HACKATHON 2026 Submission Document**  
> Tracks: **Agent Economy** (`agents`) • **AI Swarms** (`swarms`) • **AI Security & Defense** (`security`)  
> Event Guidelines Ref: `https://nearhackathon.com/HACKATHON.md`

---

## 1. Project Pitch & Descriptions

### Concise Tagline
**MERIDIAN: The Autonomous Agent Economy on NEAR Protocol.**

### Pitch (30-Second Elevator Summary)
Most AI agents today are isolated chatbots unable to conduct sovereign economic trade. MERIDIAN is a complete, functioning autonomous agent economy where specialized AI agents discover services, submit competitive bids, negotiate terms using deterministic multi-factor scoring, execute tasks, verify deliverables via adversarial zero-trust oracles, and settle native NEAR payments through non-custodial Rust escrow smart contracts—safeguarded by the Meridian Guard security engine.

### Hackathon Submission Description (1,250 Characters)
MERIDIAN solves the critical bottleneck preventing AI from achieving economic autonomy: the absence of verifiable identity, transparent negotiation, and trustless financial settlement.

Built from scratch for NEAR HACKATHON 2026, MERIDIAN delivers a functioning multi-agent marketplace:
1. **Buyer Executive Agent**: Decomposes unstructured briefs into machine-readable acceptance criteria and budgets.
2. **Provider Agents**: Formulate competitive proposals and execute deep technical deliverables with cryptographic SHA-256 integrity proofs.
3. **Equilibrium Negotiator**: Scores bids deterministically across 4 weighted factors (Price 35%, Reputation 30%, Capability 20%, Delivery 15%) without LLM tampering.
4. **Veritas Oracle**: Adversarial verifier independently inspecting deliverables against criteria to prevent unearned payouts.
5. **NEAR Smart Contracts**: Rust contract (`near-sdk 5.5.0`) managing on-chain registry, non-custodial escrow locking, integer yoctoNEAR promise transfers, and verifiable reputation tracking.
6. **Meridian Guard**: Per-task spending quotas, capability whitelists, prompt-injection defense, and a global emergency pause circuit breaker.

---

## 2. X (Twitter) Demo Post Draft

```
🚀 Introducing MERIDIAN: The Autonomous Agent Economy, built from scratch for the @NEARProtocol NEAR HACKATHON!

AI agents shouldn't just chat—they should earn, spend, negotiate, and settle trustlessly.

✨ Multi-Agent Coordination: Buyer, Provider, Negotiator & Verifier
⚡ Deterministic 4-Factor Bidding & Scoring Engine
🔐 Non-custodial NEAR Smart Contract Escrow (near-sdk 5.5.0)
🛡️ Meridian Guard: Spending limits, prompt-injection defense & circuit breaker
⭐ Verifiable On-Chain Reputation Index

Watch the 90s demo video below to see autonomous agents hire each other and settle natively on NEAR Testnet! 👇

#NEARHackathon @NEARProtocol @NearBuilders @NearLegion #AI #AgentEconomy #Web3
```

---

## 3. Demo Video Recording Checklist

- [ ] Resolution: 1080p or 4K at 60fps.
- [ ] Duration: 90 to 120 seconds.
- [ ] Show Landing Page headline and live metrics.
- [ ] Show Command Center: Enter prompt into Buyer Agent Launchpad.
- [ ] Show Task Exchange: Open task with decomposed criteria.
- [ ] Show Provider Bids and click **Run Negotiation Engine** (show score breakdown).
- [ ] Show **Execute Task** (show deliverable preview and SHA-256 hash).
- [ ] Show **Verify Deliverable** (show Veritas Oracle validation pass/fail table).
- [ ] Show **Approve & Settle Payout** (show status change to `COMPLETED` and reputation boost).
- [ ] Show **Trust & Security** page with Meridian Guard spending quotas and circuit breaker button.
- [ ] Export as MP4 and upload to YouTube (unlisted/public) or attach directly to X demo post.

---

## 4. Screenshot Checklist (for X Post & Submission)

1. **`01_command_center.png`**: High-level view of Command Center with active agents, tasks, and escrow locked.
2. **`02_marketplace.png`**: Agent directory displaying Sentinel Security Guard, Apex Synthesizer, and Veritas Oracle.
3. **`03_task_lifecycle.png`**: Task Details view displaying the 8-state lifecycle pipeline and acceptance criteria.
4. **`04_negotiation_scores.png`**: Close-up of deterministic 4-factor scoring breakdown table.
5. **`05_veritas_verification.png`**: Veritas Oracle zero-trust pass/fail verification report.
6. **`06_meridian_guard.png`**: Trust & Security dashboard with spending quotas and circuit breaker toggle.

---

## 5. Official Submission Payload Schema

When ready to submit to `POST https://nearhackathon.com/api/applications`, the payload format is:

```json
{
  "requestId": "<generate-unique-uuid-v4>",
  "projectName": "MERIDIAN",
  "leadName": "<HUMAN_DEVELOPER_NAME>",
  "email": "<HUMAN_DEVELOPER_EMAIL>",
  "size": "1",
  "tracks": ["agents", "swarms", "security"],
  "nearAddress": "<HUMAN_MAINNET_PRIZE_WALLET_ACCOUNT>.near",
  "projectUrl": "https://github.com/<YOUR_GITHUB>/meridian",
  "demoUrl": "https://x.com/<YOUR_HANDLE>/status/<POST_ID>",
  "idea": "MERIDIAN is an institutional-grade autonomous agent marketplace on NEAR Protocol. It enables AI agents to discover services, submit competitive bids, negotiate terms using deterministic 4-factor scoring, execute tasks, verify deliverables via zero-trust inspection, and settle native NEAR payments through non-custodial smart contracts—safeguarded by the Meridian Guard security engine.",
  "consent": true
}
```

> [!IMPORTANT]
> **REMINDER**: Never submit the payload without explicit human confirmation. The prize wallet account must be a valid **NEAR Mainnet** named account (e.g. `yourname.near`) or 64-character implicit account.
