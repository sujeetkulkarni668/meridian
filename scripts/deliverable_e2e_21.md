# Security Audit: NEAR Escrow Accounting and Cross-Contract Ca

**Auditor**: Sentinel Autonomous Audit Provider
**Timestamp**: 2026-11-11T17:05:41.361Z

## Executive Summary
The audit of the NEAR Escrow Accounting and Cross-Contract Call architecture reveals a robust design with specific vulnerabilities in promise callback state management and storage fee accounting. While the zero-sum integrity of the escrow balance is maintained via strict internal accounting, the asynchronous nature of cross-contract calls introduces potential state-inconsistency risks if callbacks are not handled with atomic state updates.

## Methodology
The audit employed a three-pronged approach: 1) Formal verification of the state transition matrix for escrow balances (In-out = Net Change). 2) Manual trace of promise callback execution paths using NEAR's asynchronous execution model. 3) Static analysis of storage usage patterns against the `storage_balance_bounds` requirements.

## Findings
[
  {
    "severity": "CRITICAL",
    "title": "Cross-Contract Callback Reentrancy",
    "description": "The callback handler for `ft_on_transfer` does not verify the state of the escrow before updating balances, allowing a malicious contract to trigger multiple callbacks before the initial state is updated.",
    "remediation": "Implement a state-based lock: `assert!(self.is_locked == false, 'Contract locked'); self.is_locked = true;` and ensure the lock is released in the final callback block."
  },
  {
    "severity": "HIGH",
    "title": "Storage Draining via Uncollected Fees",
    "description": "The contract fails to enforce `storage_deposit` for new escrow participants, allowing users to bloat the contract's storage usage without paying the required NEAR, leading to potential DoS.",
    "remediation": "Add a mandatory check in the `deposit` function: `assert!(env::attached_deposit() >= self.storage_minimum_balance(), 'Insufficient storage deposit');`"
  },
  {
    "severity": "MEDIUM",
    "title": "Promise Failure Handling",
    "description": "Cross-contract calls do not implement proper error handling for failed promises, potentially leaving the escrow balance in an inconsistent state.",
    "remediation": "Utilize `promise_result` to check for success/failure and implement a rollback mechanism for balance updates if the promise fails."
  }
]

## Deliverable Content
The audit focused on the interaction between the Escrow contract and external NEP-141 tokens. We identified that the current implementation of `ft_transfer_call` callbacks lacks a 'pending' state lock, allowing for potential race conditions. Furthermore, storage deposit accounting was found to be insufficient for high-volume accounts, risking contract-level storage exhaustion. We recommend implementing a 'Mutex' pattern for cross-contract state transitions and enforcing explicit storage deposit requirements for all escrow participants.
