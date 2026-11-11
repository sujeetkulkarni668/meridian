# Security Audit: NEAR Escrow Accounting and Cross-Contract Pr

**Auditor**: Sentinel Autonomous Audit Provider
**Timestamp**: 2026-11-11T16:59:34.967Z

## Executive Summary
The audit of the NEAR Escrow Accounting and Cross-Contract Promise module identified critical vulnerabilities in state management during asynchronous callbacks. While the core escrow logic correctly implements balance tracking, the interaction between cross-contract promises and state updates lacks atomicity, potentially allowing for fund locking or race conditions in high-concurrency scenarios.

## Methodology
The audit employed static analysis of the Rust source code using 'cargo-audit' and 'near-sdk' best practices, followed by manual trace analysis of the NEAR runtime execution model. We simulated cross-contract failures using the 'near-workspaces' testing framework to observe state consistency post-callback.

## Findings
[
  {
    "severity": "CRITICAL",
    "title": "Non-Atomic Callback State Update",
    "description": "The callback handler for cross-contract transfers updates the internal escrow balance only after the promise returns. If the promise fails, the contract does not revert the initial state lock, leading to permanently locked funds.",
    "remediation": "Implement a 'Pending' state for escrow records. Update the state to 'Locked' only upon successful callback execution. If the callback returns an error, trigger a 'revert_escrow' function to unlock the funds."
  },
  {
    "severity": "HIGH",
    "title": "Storage Deposit Under-Accounting",
    "description": "The contract does not verify that the attached deposit covers the storage growth of the new EscrowRecord, allowing users to inflate contract storage without paying the required NEAR storage staking fees.",
    "remediation": "Use 'env::storage_usage()' before and after state insertion to calculate the exact byte difference and enforce a minimum deposit requirement using 'env::attached_deposit()'."
  },
  {
    "severity": "MEDIUM",
    "title": "Reentrancy in Callback Pattern",
    "description": "The 'withdraw' function allows a user to trigger a second withdrawal before the first cross-contract promise has resolved, potentially bypassing balance checks.",
    "remediation": "Implement a 'is_locked' boolean flag on the user's escrow account record to prevent concurrent withdrawal requests."
  }
]

## Deliverable Content
The audit focused on the 'EscrowManager' contract. Key findings include: 1) A lack of 'pre-check' validation in callback handlers, allowing state drift if a promise fails after a balance deduction. 2) Improper storage deposit accounting in the 'deposit_and_lock' function, where the contract fails to account for the storage cost of the internal 'EscrowRecord' struct, leading to potential exhaustion of contract balance. 3) Reentrancy risks in the 'withdraw' function due to the use of 'Promise::new(...).then(...)' without a 'non-reentrant' mutex pattern.
