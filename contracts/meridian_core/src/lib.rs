use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::{env, is_promise_success, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseResult};

pub const MIN_STORAGE_DEPOSIT: NearToken = NearToken::from_millinear(10); // 0.01 NEAR minimum storage staking deposit
pub const CALLBACK_GAS: Gas = Gas::from_tgas(15); // 15 TGas for promise callback handling
pub const MIN_SETTLEMENT_PREPAID_GAS: Gas = Gas::from_tgas(50); // Minimum 50 TGas prepaid for settlement
pub const MAX_BIDS_PER_TASK: usize = 50; // Guard against unbounded vector gas exhaustion
pub const ZERO_PRICE_MAX_REPUTATION: u32 = 6000; // Benchmark reputation ceiling: 60.00%
pub const ZERO_PRICE_REPUTATION_BOOST: u32 = 100; // Benchmark boost: +1.00% (100 bps)
pub const COMMERCIAL_REPUTATION_BOOST: u32 = 250; // Commercial boost: +2.50% (250 bps)

#[near(serializers = [borsh, json])]
#[derive(Clone, PartialEq, Debug)]
pub enum TaskStatus {
    Open,
    Bidding,
    Awarded,
    Funded,
    InProgress,
    Delivered,
    Verified,
    Completed,
    Disputed,
    Refunded,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Agent {
    pub account_id: AccountId,
    pub name: String,
    pub role: String,
    pub category: String,
    pub metadata_uri: String,
    pub reputation_score: u32, // Stored as 0-10000 (representing 0.00% to 100.00%)
    pub total_tasks_completed: u32,
    pub registered_at_ms: u64,
    pub active: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Bid {
    pub bid_id: u32,
    pub provider_id: AccountId,
    pub proposed_price: U128, // In yoctoNEAR
    pub delivery_time_hours: u32,
    pub pitch: String,
    pub submitted_at_ms: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Verification {
    pub verifier_id: AccountId,
    pub score: u8, // 0-100
    pub verdict: String, // "APPROVED" or "REJECTED"
    pub rationale: String,
    pub verified_at_ms: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Task {
    pub task_id: u64,
    pub buyer_id: AccountId,
    pub title: String,
    pub category: String,
    pub description_hash: String,
    pub deadline_ms: u64,
    pub status: TaskStatus,
    pub assigned_provider: Option<AccountId>,
    pub agreed_price: U128, // In yoctoNEAR
    pub escrow_amount: U128, // In yoctoNEAR
    pub deliverable_hash: Option<String>,
    pub deliverable_uri: Option<String>,
    pub verification: Option<Verification>,
    pub created_at_ms: u64,
    pub settled_at_ms: Option<u64>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct MeridianMarketplace {
    pub owner_id: AccountId,
    pub paused: bool,
    pub task_counter: u64,
    pub agents: UnorderedMap<AccountId, Agent>,
    pub tasks: UnorderedMap<u64, Task>,
    pub bids_by_task: LookupMap<u64, Vec<Bid>>,
}

#[near]
impl MeridianMarketplace {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        require!(!env::state_exists(), "Contract is already initialized");
        Self {
            owner_id,
            paused: false,
            task_counter: 0,
            agents: UnorderedMap::new(b"a"),
            tasks: UnorderedMap::new(b"t"),
            bids_by_task: LookupMap::new(b"b"),
        }
    }

    /* -------------------------------------------------------------------------
       SECURITY & EMERGENCY PAUSE (MERIDIAN GUARD)
    ------------------------------------------------------------------------- */
    pub fn set_paused(&mut self, paused: bool) {
        self.assert_owner();
        self.paused = paused;
        env::log_str(&format!("Emergency pause status updated: {}", paused));
    }

    pub fn is_paused(&self) -> bool {
        self.paused
    }

    fn assert_not_paused(&self) {
        require!(!self.paused, "Meridian Contract is currently paused by Meridian Guard circuit breaker");
    }

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner_id, "Caller is not contract owner");
    }

    /* -------------------------------------------------------------------------
       1. AGENT REGISTRY (WITH STORAGE DEPOSIT PROTECTION)
    ------------------------------------------------------------------------- */
    #[payable]
    pub fn register_agent(
        &mut self,
        name: String,
        role: String,
        category: String,
        metadata_uri: String,
    ) {
        self.assert_not_paused();
        let account_id = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        require!(
            deposit >= MIN_STORAGE_DEPOSIT,
            "Storage deposit required: at least 0.01 NEAR must be attached to register agent"
        );
        require!(
            role != "VERIFIER",
            "Unauthorized role: registration with VERIFIER role is restricted to governance authority"
        );
        require!(name.len() >= 2 && name.len() <= 64, "Agent name length invalid");
        require!(category.len() >= 2, "Category required");

        let agent = Agent {
            account_id: account_id.clone(),
            name,
            role,
            category,
            metadata_uri,
            reputation_score: 5000, // Default starting reputation: 50.00%
            total_tasks_completed: 0,
            registered_at_ms: env::block_timestamp_ms(),
            active: true,
        };

        self.agents.insert(&account_id, &agent);

        // Refund any excess deposit above MIN_STORAGE_DEPOSIT
        let excess = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        if excess.as_yoctonear() > 0 {
            let _ = Promise::new(account_id.clone()).transfer(excess);
        }

        env::log_str(&format!("Agent registered: {} with storage deposit", account_id));
    }

    pub fn register_verifier(
        &mut self,
        account_id: AccountId,
        name: String,
        metadata_uri: String,
    ) {
        self.assert_not_paused();
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only contract owner can register official verifier agents"
        );
        require!(name.len() >= 2 && name.len() <= 64, "Verifier name length invalid");

        let agent = Agent {
            account_id: account_id.clone(),
            name,
            role: "VERIFIER".to_string(),
            category: "VERIFICATION".to_string(),
            metadata_uri,
            reputation_score: 5000,
            total_tasks_completed: 0,
            registered_at_ms: env::block_timestamp_ms(),
            active: true,
        };

        self.agents.insert(&account_id, &agent);
        env::log_str(&format!("Official verifier registered: {}", account_id));
    }

    pub fn get_agent(&self, account_id: AccountId) -> Option<Agent> {
        self.agents.get(&account_id)
    }

    pub fn list_agents(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Agent> {
        let start = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(50).min(100);
        self.agents
            .iter()
            .map(|(_, a)| a)
            .skip(start as usize)
            .take(limit as usize)
            .collect()
    }

    /* -------------------------------------------------------------------------
       2. TASK CREATION & ESCROW FUNDING (WITH STORAGE PROTECTION)
    ------------------------------------------------------------------------- */
    #[payable]
    pub fn create_task(
        &mut self,
        title: String,
        category: String,
        description_hash: String,
        deadline_ms: u64,
    ) -> u64 {
        self.assert_not_paused();
        let buyer_id = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        require!(title.len() >= 3, "Task title must be at least 3 characters");
        require!(deadline_ms > env::block_timestamp_ms(), "Deadline must be in the future");
        require!(
            deposit >= MIN_STORAGE_DEPOSIT,
            "Storage deposit required: at least 0.01 NEAR must be attached for task state storage"
        );

        self.task_counter += 1;
        let task_id = self.task_counter;

        let escrow_deposit = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        let (status, escrow_amount) = if escrow_deposit.as_yoctonear() > 0 {
            (TaskStatus::Funded, U128(escrow_deposit.as_yoctonear()))
        } else {
            (TaskStatus::Open, U128(0))
        };

        let task = Task {
            task_id,
            buyer_id: buyer_id.clone(),
            title,
            category,
            description_hash,
            deadline_ms,
            status,
            assigned_provider: None,
            agreed_price: escrow_amount,
            escrow_amount,
            deliverable_hash: None,
            deliverable_uri: None,
            verification: None,
            created_at_ms: env::block_timestamp_ms(),
            settled_at_ms: None,
        };

        self.tasks.insert(&task_id, &task);
        self.bids_by_task.insert(&task_id, &Vec::new());

        env::log_str(&format!(
            "Task created: #{} by {} with attached escrow: {} yoctoNEAR (storage reserved: 0.01 NEAR)",
            task_id,
            buyer_id,
            escrow_amount.0
        ));

        task_id
    }

    #[payable]
    pub fn fund_task(&mut self, task_id: u64) {
        self.assert_not_paused();
        let buyer = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        require!(deposit.as_yoctonear() > 0, "Attached deposit must be greater than zero");

        let mut task = self.tasks.get(&task_id).expect("Task not found");
        require!(task.buyer_id == buyer, "Only task buyer can fund this task");
        require!(
            task.status == TaskStatus::Open || task.status == TaskStatus::Bidding || task.status == TaskStatus::Awarded,
            "Task is not in a fundable state"
        );

        let new_escrow = task.escrow_amount.0 + deposit.as_yoctonear();
        task.escrow_amount = U128(new_escrow);
        
        if task.status == TaskStatus::Awarded {
            task.status = TaskStatus::Funded;
        }

        self.tasks.insert(&task_id, &task);
        env::log_str(&format!("Task #{} funded with {} yoctoNEAR. Total escrow: {}", task_id, deposit.as_yoctonear(), new_escrow));
    }

    /* -------------------------------------------------------------------------
       3. BIDDING & AWARDING
    ------------------------------------------------------------------------- */
    pub fn submit_bid(
        &mut self,
        task_id: u64,
        proposed_price: U128,
        delivery_time_hours: u32,
        pitch: String,
    ) {
        self.assert_not_paused();
        let provider_id = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");

        require!(
            task.status == TaskStatus::Open || task.status == TaskStatus::Bidding || task.status == TaskStatus::Funded,
            "Task is no longer accepting bids"
        );
        require!(task.buyer_id != provider_id, "Buyer cannot bid on their own task");
        require!(proposed_price.0 > 0, "Proposed price must be positive");

        let mut bids = self.bids_by_task.get(&task_id).unwrap_or_default();
        require!(bids.len() < MAX_BIDS_PER_TASK, "Maximum bids per task reached (50 limit)");
        let bid_id = (bids.len() as u32) + 1;

        bids.push(Bid {
            bid_id,
            provider_id: provider_id.clone(),
            proposed_price,
            delivery_time_hours,
            pitch,
            submitted_at_ms: env::block_timestamp_ms(),
        });

        self.bids_by_task.insert(&task_id, &bids);

        if task.status == TaskStatus::Open {
            task.status = TaskStatus::Bidding;
            self.tasks.insert(&task_id, &task);
        }

        env::log_str(&format!("Bid #{} submitted for Task #{} by {}", bid_id, task_id, provider_id));
    }

    pub fn award_task(&mut self, task_id: u64, provider_id: AccountId, agreed_price: U128) {
        self.assert_not_paused();
        let caller = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");

        require!(task.buyer_id == caller, "Only task buyer can award the task");
        require!(
            task.buyer_id != provider_id,
            "Self-dealing prohibited: buyer cannot award task to self"
        );
        require!(
            task.status == TaskStatus::Bidding || task.status == TaskStatus::Open || task.status == TaskStatus::Funded,
            "Invalid state for awarding task"
        );

        task.assigned_provider = Some(provider_id.clone());
        task.agreed_price = agreed_price;

        if agreed_price.0 == 0 || (task.escrow_amount.0 >= agreed_price.0 && task.escrow_amount.0 > 0) {
            task.status = TaskStatus::InProgress;
        } else {
            task.status = TaskStatus::Awarded;
        }

        self.tasks.insert(&task_id, &task);
        env::log_str(&format!("Task #{} awarded to {}", task_id, provider_id));
    }

    /* -------------------------------------------------------------------------
       4. DELIVERABLE SUBMISSION & VERIFICATION
    ------------------------------------------------------------------------- */
    pub fn submit_deliverable(
        &mut self,
        task_id: u64,
        deliverable_hash: String,
        deliverable_uri: Option<String>,
    ) {
        self.assert_not_paused();
        let caller = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");

        require!(
            task.assigned_provider == Some(caller),
            "Only the assigned provider can submit deliverable"
        );
        require!(
            task.status == TaskStatus::InProgress || task.status == TaskStatus::Funded || task.status == TaskStatus::Awarded,
            "Task is not currently in progress"
        );
        require!(!deliverable_hash.is_empty(), "Deliverable hash cannot be empty");

        task.deliverable_hash = Some(deliverable_hash);
        task.deliverable_uri = deliverable_uri;
        task.status = TaskStatus::Delivered;

        self.tasks.insert(&task_id, &task);
        env::log_str(&format!("Deliverable submitted for Task #{}", task_id));
    }

    pub fn record_verification(
        &mut self,
        task_id: u64,
        score: u8,
        verdict: String,
        rationale: String,
    ) {
        self.assert_not_paused();
        let verifier_id = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");

        require!(task.status == TaskStatus::Delivered, "Deliverable must be submitted before verification");
        require!(score <= 100, "Score must be 0 to 100");
        require!(Some(&verifier_id) != task.assigned_provider.as_ref(), "Provider cannot verify own deliverable");

        let is_registered_verifier = self.agents.get(&verifier_id).map(|a| a.role == "VERIFIER" && a.active).unwrap_or(false);
        require!(
            verifier_id == task.buyer_id || verifier_id == self.owner_id || is_registered_verifier,
            "Unauthorized verifier: only buyer, contract owner, or registered VERIFIER agent can verify deliverables"
        );

        let verification = Verification {
            verifier_id: verifier_id.clone(),
            score,
            verdict,
            rationale,
            verified_at_ms: env::block_timestamp_ms(),
        };

        task.verification = Some(verification);
        task.status = TaskStatus::Verified;

        self.tasks.insert(&task_id, &task);
        env::log_str(&format!("Verification recorded for Task #{} by verifier {}", task_id, verifier_id));
    }

    /* -------------------------------------------------------------------------
       5. APPROVAL, PAYOUT & REPUTATION SETTLEMENT
    ------------------------------------------------------------------------- */
    pub fn approve_and_payout(&mut self, task_id: u64) -> Promise {
        self.assert_not_paused();
        let caller = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");

        require!(
            env::prepaid_gas() >= MIN_SETTLEMENT_PREPAID_GAS,
            "Insufficient prepaid gas: approve_and_payout requires at least 50 TGas to guarantee safe callback execution"
        );

        require!(
            task.buyer_id == caller || caller == self.owner_id,
            "Only buyer or contract owner can approve payout"
        );
        require!(
            task.status == TaskStatus::Delivered || task.status == TaskStatus::Verified,
            "Deliverable must be submitted before payout"
        );

        let total_escrow = task.escrow_amount.0;
        let agreed_price = task.agreed_price.0;
        require!(
            total_escrow > 0 || agreed_price == 0,
            "No escrow funds available for payout"
        );
        require!(
            agreed_price == 0 || total_escrow >= agreed_price,
            "Task is underfunded: escrow balance is less than agreed price"
        );
        let provider = task.assigned_provider.clone().expect("No provider assigned");

        // Provider is owed agreed_price. If escrow exceeds agreed_price,
        // surplus is refunded directly to buyer so provider is never overpaid.
        // For zero-price tasks, provider payout is strictly 0 and all escrow is refunded to buyer.
        let (payout_amount, surplus_refund) = if agreed_price > 0 {
            (agreed_price, total_escrow.saturating_sub(agreed_price))
        } else {
            (0, total_escrow)
        };

        // Update state BEFORE initiating promise transfer to prevent re-entrancy / double payout
        task.status = TaskStatus::Completed;
        task.escrow_amount = U128(0);
        task.settled_at_ms = Some(env::block_timestamp_ms());
        self.tasks.insert(&task_id, &task);

        // Compute reputation increment:
        // Zero-price benchmark tasks require valid verification (score >= 70) and are capped at ZERO_PRICE_MAX_REPUTATION (6000 bps)
        // Funded commercial tasks receive COMMERCIAL_REPUTATION_BOOST (250 bps) up to 10000 bps
        let rep_boost = if agreed_price == 0 {
            let is_verified_benchmark = task.verification.as_ref().map(|v| v.score).unwrap_or(0) >= 70;
            if is_verified_benchmark {
                ZERO_PRICE_REPUTATION_BOOST
            } else {
                0
            }
        } else {
            COMMERCIAL_REPUTATION_BOOST
        };

        // Update provider reputation on-chain
        if let Some(mut agent) = self.agents.get(&provider) {
            agent.total_tasks_completed += 1;
            if rep_boost > 0 {
                if agreed_price == 0 {
                    if agent.reputation_score < ZERO_PRICE_MAX_REPUTATION {
                        agent.reputation_score = (agent.reputation_score + rep_boost).min(ZERO_PRICE_MAX_REPUTATION);
                    }
                } else {
                    agent.reputation_score = (agent.reputation_score + rep_boost).min(10000);
                }
            }
            self.agents.insert(&provider, &agent);
        }

        env::log_str(&format!(
            "Task #{} approved. Initiating payout of {} yoctoNEAR to provider {}, surplus refund {} yoctoNEAR to buyer {}",
            task_id,
            payout_amount,
            provider,
            surplus_refund,
            task.buyer_id
        ));

        if payout_amount > 0 && surplus_refund > 0 {
            let payout_promise = Promise::new(provider.clone())
                .transfer(NearToken::from_yoctonear(payout_amount));
            let refund_promise = Promise::new(task.buyer_id.clone())
                .transfer(NearToken::from_yoctonear(surplus_refund));

            payout_promise
                .and(refund_promise)
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(CALLBACK_GAS)
                        .on_settlement_completed(
                            task_id,
                            provider,
                            U128(payout_amount),
                            task.buyer_id.clone(),
                            U128(surplus_refund),
                        )
                )
        } else if payout_amount > 0 {
            Promise::new(provider.clone())
                .transfer(NearToken::from_yoctonear(payout_amount))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(CALLBACK_GAS)
                        .on_payout_completed(task_id, provider, U128(payout_amount))
                )
        } else if surplus_refund > 0 {
            Promise::new(task.buyer_id.clone())
                .transfer(NearToken::from_yoctonear(surplus_refund))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(CALLBACK_GAS)
                        .on_surplus_refund_completed(task_id, task.buyer_id.clone(), U128(surplus_refund))
                )
        } else {
            // Zero-price task with zero escrow: reputation only, 0 NEAR transferred
            Promise::new(provider.clone())
                .transfer(NearToken::from_yoctonear(0))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(CALLBACK_GAS)
                        .on_payout_completed(task_id, provider, U128(0))
                )
        }
    }

    #[private]
    pub fn on_settlement_completed(
        &mut self,
        task_id: u64,
        provider: AccountId,
        payout_amount: U128,
        buyer: AccountId,
        surplus_amount: U128,
    ) -> bool {
        let mut payout_success = true;
        let mut surplus_success = true;

        if env::promise_results_count() >= 2 {
            match env::promise_result(0) {
                PromiseResult::Successful(_) => {
                    env::log_str(&format!(
                        "Payout of {} yoctoNEAR successfully settled to provider {}",
                        payout_amount.0, provider
                    ));
                }
                PromiseResult::Failed => {
                    payout_success = false;
                    env::log_str(&format!(
                        "CRITICAL: Payout promise to provider {} failed for Task #{}",
                        provider, task_id
                    ));
                }
            }
            match env::promise_result(1) {
                PromiseResult::Successful(_) => {
                    env::log_str(&format!(
                        "Surplus refund of {} yoctoNEAR successfully settled to buyer {}",
                        surplus_amount.0, buyer
                    ));
                }
                PromiseResult::Failed => {
                    surplus_success = false;
                    env::log_str(&format!(
                        "CRITICAL: Surplus refund promise to buyer {} failed for Task #{}. Preserving escrow for buyer claim.",
                        buyer, task_id
                    ));
                }
            }
        } else if env::promise_results_count() == 1 {
            let success = is_promise_success();
            payout_success = success;
            surplus_success = success;
        }

        if !payout_success {
            if let Some(mut task) = self.tasks.get(&task_id) {
                if task.status == TaskStatus::Completed {
                    task.status = TaskStatus::Verified;
                    task.settled_at_ms = Some(0); // Sentinel 0 indicates settlement attempted and failed
                }
                task.escrow_amount = U128(task.escrow_amount.0 + payout_amount.0);
                self.tasks.insert(&task_id, &task);
            }
            if let Some(mut agent) = self.agents.get(&provider) {
                let rollback_boost = if payout_amount.0 == 0 {
                    ZERO_PRICE_REPUTATION_BOOST
                } else {
                    COMMERCIAL_REPUTATION_BOOST
                };
                agent.total_tasks_completed = agent.total_tasks_completed.saturating_sub(1);
                agent.reputation_score = agent.reputation_score.saturating_sub(rollback_boost);
                self.agents.insert(&provider, &agent);
            }
        }

        if !surplus_success {
            if let Some(mut task) = self.tasks.get(&task_id) {
                task.escrow_amount = U128(task.escrow_amount.0 + surplus_amount.0);
                self.tasks.insert(&task_id, &task);
            }
        }

        payout_success && surplus_success
    }

    #[private]
    pub fn on_payout_completed(
        &mut self,
        task_id: u64,
        provider: AccountId,
        payout_amount: U128,
    ) -> bool {
        if is_promise_success() {
            env::log_str(&format!(
                "Payout of {} yoctoNEAR successfully settled for Task #{}",
                payout_amount.0, task_id
            ));
            true
        } else {
            env::log_str(&format!(
                "CRITICAL: Payout promise failed for Task #{}. Rolling back state to Verified to preserve escrow.",
                task_id
            ));
            if let Some(mut task) = self.tasks.get(&task_id) {
                if task.status == TaskStatus::Completed {
                    task.status = TaskStatus::Verified;
                    task.settled_at_ms = Some(0); // Sentinel 0 indicates settlement attempted and failed
                }
                task.escrow_amount = U128(task.escrow_amount.0 + payout_amount.0);
                self.tasks.insert(&task_id, &task);
            }
            if let Some(mut agent) = self.agents.get(&provider) {
                let rollback_boost = if payout_amount.0 == 0 {
                    ZERO_PRICE_REPUTATION_BOOST
                } else {
                    COMMERCIAL_REPUTATION_BOOST
                };
                agent.total_tasks_completed = agent.total_tasks_completed.saturating_sub(1);
                agent.reputation_score = agent.reputation_score.saturating_sub(rollback_boost);
                self.agents.insert(&provider, &agent);
            }
            false
        }
    }

    #[private]
    pub fn on_surplus_refund_completed(
        &mut self,
        task_id: u64,
        buyer: AccountId,
        surplus_amount: U128,
    ) -> bool {
        if is_promise_success() {
            env::log_str(&format!(
                "Surplus refund of {} yoctoNEAR successfully settled for Task #{} to buyer {}",
                surplus_amount.0, task_id, buyer
            ));
            true
        } else {
            env::log_str(&format!(
                "CRITICAL: Surplus refund promise failed for Task #{}. Preserving escrow for buyer claim.",
                task_id
            ));
            if let Some(mut task) = self.tasks.get(&task_id) {
                task.escrow_amount = U128(task.escrow_amount.0 + surplus_amount.0);
                self.tasks.insert(&task_id, &task);
            }
            false
        }
    }

    pub fn claim_surplus_refund(&mut self, task_id: u64) -> Promise {
        self.assert_not_paused();
        let caller = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");
        require!(task.buyer_id == caller || caller == self.owner_id, "Only buyer or owner can claim surplus refund");
        require!(
            task.status == TaskStatus::Completed || (task.status == TaskStatus::Verified && task.settled_at_ms == Some(0)),
            "Invalid task state for claiming refund: task must be completed or have failed settlement"
        );
        let claimable = task.escrow_amount.0;
        require!(claimable > 0, "No claimable surplus refund available");

        task.escrow_amount = U128(0);
        self.tasks.insert(&task_id, &task);

        env::log_str(&format!("Claiming surplus refund of {} yoctoNEAR for Task #{}", claimable, task_id));

        Promise::new(task.buyer_id.clone())
            .transfer(NearToken::from_yoctonear(claimable))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(CALLBACK_GAS)
                    .on_surplus_refund_completed(task_id, task.buyer_id.clone(), U128(claimable))
            )
    }

    /* -------------------------------------------------------------------------
       6. DISPUTES & REFUNDS
    ------------------------------------------------------------------------- */
    pub fn dispute_task(&mut self, task_id: u64, reason: String) {
        self.assert_not_paused();
        let caller = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");

        require!(
            task.buyer_id == caller || task.assigned_provider == Some(caller.clone()),
            "Only buyer or provider can dispute task"
        );
        require!(
            task.status == TaskStatus::InProgress
                || task.status == TaskStatus::Delivered
                || task.status == TaskStatus::Verified
                || (task.status == TaskStatus::Funded && env::block_timestamp_ms() > task.deadline_ms),
            "Task is not eligible for dispute"
        );

        task.status = TaskStatus::Disputed;
        self.tasks.insert(&task_id, &task);

        env::log_str(&format!("Task #{} marked as disputed by {}. Reason: {}", task_id, caller, reason));
    }

    pub fn resolve_dispute_and_refund(&mut self, task_id: u64) -> Promise {
        self.assert_not_paused();
        let caller = env::predecessor_account_id();
        let mut task = self.tasks.get(&task_id).expect("Task not found");

        require!(
            caller == self.owner_id || (task.buyer_id == caller && env::block_timestamp_ms() > task.deadline_ms && task.status != TaskStatus::Completed),
            "Unauthorized dispute resolution"
        );
        require!(
            task.status == TaskStatus::Disputed || task.status == TaskStatus::Open || task.status == TaskStatus::Awarded || task.status == TaskStatus::Funded,
            "Task cannot be refunded in its current state"
        );

        let refund_amount = task.escrow_amount.0;
        require!(refund_amount > 0, "No escrow funds available for refund");
        let buyer = task.buyer_id.clone();

        // Update state BEFORE refund transfer to prevent re-entrancy
        task.status = TaskStatus::Refunded;
        task.escrow_amount = U128(0);
        task.settled_at_ms = Some(env::block_timestamp_ms());
        self.tasks.insert(&task_id, &task);

        // Penalize provider reputation if dispute was resolved against them
        if let Some(provider) = &task.assigned_provider {
            if let Some(mut agent) = self.agents.get(provider) {
                agent.reputation_score = agent.reputation_score.saturating_sub(500);
                self.agents.insert(provider, &agent);
            }
        }

        env::log_str(&format!(
            "Dispute resolved for Task #{}. Initiating refund promise of {} yoctoNEAR to buyer {}",
            task_id,
            refund_amount,
            buyer
        ));

        Promise::new(buyer.clone())
            .transfer(NearToken::from_yoctonear(refund_amount))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(CALLBACK_GAS)
                    .on_refund_completed(task_id, buyer, U128(refund_amount))
            )
    }

    #[private]
    pub fn on_refund_completed(
        &mut self,
        task_id: u64,
        _buyer: AccountId,
        refund_amount: U128,
    ) -> bool {
        if is_promise_success() {
            env::log_str(&format!(
                "Refund of {} yoctoNEAR successfully settled for Task #{}",
                refund_amount.0, task_id
            ));
            true
        } else {
            env::log_str(&format!(
                "CRITICAL: Refund promise failed for Task #{}. Rolling back state to Disputed to preserve escrow.",
                task_id
            ));
            if let Some(mut task) = self.tasks.get(&task_id) {
                task.status = TaskStatus::Disputed;
                task.escrow_amount = refund_amount;
                task.settled_at_ms = None;
                self.tasks.insert(&task_id, &task);
            }
            false
        }
    }

    /* -------------------------------------------------------------------------
       7. VIEW METHODS
    ------------------------------------------------------------------------- */
    pub fn get_task(&self, task_id: u64) -> Option<Task> {
        self.tasks.get(&task_id)
    }

    pub fn list_tasks(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Task> {
        let start = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(50).min(100);
        self.tasks
            .iter()
            .map(|(_, t)| t)
            .skip(start as usize)
            .take(limit as usize)
            .collect()
    }

    pub fn get_bids(&self, task_id: u64) -> Vec<Bid> {
        self.bids_by_task.get(&task_id).unwrap_or_default()
    }

    pub fn get_marketplace_stats(&self) -> serde_json::Value {
        serde_json::json!({
            "total_agents": self.agents.len(),
            "total_tasks": self.tasks.len(),
            "contract_paused": self.paused,
            "owner_id": self.owner_id
        })
    }
}

/* -----------------------------------------------------------------------------
   UNIT TESTS
----------------------------------------------------------------------------- */
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId, attached_deposit: NearToken) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id("meridian.testnet".parse().unwrap())
            .signer_account_id(predecessor.clone())
            .predecessor_account_id(predecessor)
            .attached_deposit(attached_deposit)
            .prepaid_gas(Gas::from_tgas(300))
            .block_timestamp(1_700_000_000_000_000_000); // 1.7B seconds in ns
        builder
    }

    #[test]
    fn test_initialize_and_register_agent() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let agent_account: AccountId = "agent_sentinel.testnet".parse().unwrap();

        let ctx = get_context(owner.clone(), NearToken::from_yoctonear(0));
        testing_env!(ctx.build());

        let mut contract = MeridianMarketplace::new(owner);

        let ctx_agent = get_context(agent_account.clone(), MIN_STORAGE_DEPOSIT);
        testing_env!(ctx_agent.build());

        contract.register_agent(
            "Sentinel Security".to_string(),
            "PROVIDER".to_string(),
            "SECURITY_AUDIT".to_string(),
            "ipfs://sentinel_profile".to_string(),
        );

        let agent = contract.get_agent(agent_account.clone()).unwrap();
        assert_eq!(agent.name, "Sentinel Security");
        assert_eq!(agent.reputation_score, 5000);
        assert_eq!(agent.total_tasks_completed, 0);
    }

    #[test]
    fn test_create_and_fund_task() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let escrow = NearToken::from_near(5);
        let mut ctx = get_context(buyer.clone(), escrow);
        ctx.block_timestamp(1_000_000_000);
        testing_env!(ctx.build());

        let task_id = contract.create_task(
            "Rust Smart Contract Security Audit".to_string(),
            "SECURITY_AUDIT".to_string(),
            "sha256_requirements_hash".to_string(),
            2_000_000_000,
        );

        let task = contract.get_task(task_id).unwrap();
        assert_eq!(task.task_id, 1);
        assert_eq!(task.buyer_id, buyer);
        assert_eq!(task.status, TaskStatus::Funded);
        let expected_escrow = escrow.saturating_sub(MIN_STORAGE_DEPOSIT).as_yoctonear();
        assert_eq!(task.escrow_amount.0, expected_escrow);
    }

    #[test]
    fn test_complete_bidding_award_and_payout_flow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();
        let verifier: AccountId = "verifier.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Register provider
        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "CyberSec Agent".to_string(),
            "PROVIDER".to_string(),
            "SECURITY".to_string(),
            "ipfs://cybersec".to_string(),
        );

        // Owner registers official verifier
        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        contract.register_verifier(
            verifier.clone(),
            "Veritas Oracle".to_string(),
            "ipfs://veritas".to_string(),
        );

        // Buyer creates funded task (10 NEAR)
        let deposit = NearToken::from_near(10);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Protocol Audit".to_string(),
            "SECURITY".to_string(),
            "hash_123".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        // Provider submits bid
        let agreed_price = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_bid(
            task_id,
            U128(agreed_price.as_yoctonear()),
            24,
            "Top tier security audit".to_string(),
        );

        let bids = contract.get_bids(task_id);
        assert_eq!(bids.len(), 1);

        // Buyer awards task
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        let task = contract.get_task(task_id).unwrap();
        assert_eq!(task.status, TaskStatus::InProgress);
        assert_eq!(task.assigned_provider, Some(provider.clone()));

        // Provider submits deliverable
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "sha256_final_report".to_string(), Some("ipfs://report".to_string()));

        let task_delivered = contract.get_task(task_id).unwrap();
        assert_eq!(task_delivered.status, TaskStatus::Delivered);

        // Verifier inspects deliverable
        testing_env!(get_context(verifier.clone(), NearToken::from_yoctonear(0)).build());
        contract.record_verification(task_id, 96, "APPROVED".to_string(), "All 5 vulnerability checks cleared".to_string());

        let task_verified = contract.get_task(task_id).unwrap();
        assert_eq!(task_verified.status, TaskStatus::Verified);

        // Buyer approves and triggers payout
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        let task_final = contract.get_task(task_id).unwrap();
        assert_eq!(task_final.status, TaskStatus::Completed);
        assert_eq!(task_final.escrow_amount.0, 0); // Escrow emptied

        // Verify provider reputation was boosted
        let updated_agent = contract.get_agent(provider).unwrap();
        assert_eq!(updated_agent.total_tasks_completed, 1);
        assert!(updated_agent.reputation_score > 5000);
    }

    #[test]
    #[should_panic(expected = "Deliverable must be submitted before payout")]
    fn test_prevent_premature_payout() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let deposit = NearToken::from_near(5);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Test Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        contract.award_task(task_id, provider, U128(deposit.as_yoctonear()));

        // Attempting to payout before delivery should panic
        let _ = contract.approve_and_payout(task_id);
    }

    #[test]
    #[should_panic(expected = "Only buyer or contract owner can approve payout")]
    fn test_prevent_unauthorized_payout() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();
        let attacker: AccountId = "attacker.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let deposit = NearToken::from_near(5);
        let agreed_price = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Test Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        // Attacker attempts payout
        testing_env!(get_context(attacker, NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);
    }

    #[test]
    fn test_dispute_and_refund_flow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let deposit = NearToken::from_near(5);
        let agreed_price = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Test Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        // Buyer disputes task
        contract.dispute_task(task_id, "Provider failed to meet deadline criteria".to_string());

        let task_disputed = contract.get_task(task_id).unwrap();
        assert_eq!(task_disputed.status, TaskStatus::Disputed);

        // Owner arbitrates dispute and refunds buyer
        testing_env!(get_context(owner, NearToken::from_yoctonear(0)).build());
        let _ = contract.resolve_dispute_and_refund(task_id);

        let task_refunded = contract.get_task(task_id).unwrap();
        assert_eq!(task_refunded.status, TaskStatus::Refunded);
        assert_eq!(task_refunded.escrow_amount.0, 0);
    }

    #[test]
    fn test_exact_escrow_payout_and_surplus_refund() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Buyer registers agent with 0.01 NEAR storage deposit
        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Security Auditor".to_string(),
            "PROVIDER".to_string(),
            "SECURITY".to_string(),
            "ipfs://meta123".to_string(),
        );

        // 1. Buyer creates task with 0.015 NEAR:
        //    0.01 NEAR goes to MIN_STORAGE_DEPOSIT
        //    0.005 NEAR goes to initial escrow
        let initial_deposit = NearToken::from_millinear(15); // 0.015 NEAR
        testing_env!(get_context(buyer.clone(), initial_deposit).build());
        let task_id = contract.create_task(
            "Exact Accounting Audit Task".to_string(),
            "SECURITY".to_string(),
            "sha256_mock_hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        let task_created = contract.get_task(task_id).unwrap();
        assert_eq!(task_created.escrow_amount.0, NearToken::from_millinear(5).as_yoctonear()); // 0.005 NEAR

        // 2. Agreed price negotiated to 0.15 NEAR
        let agreed_price = NearToken::from_millinear(150); // 0.15 NEAR
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        // 3. Buyer adds 0.15 NEAR additional funding
        let additional_funding = NearToken::from_millinear(150);
        testing_env!(get_context(buyer.clone(), additional_funding).build());
        contract.fund_task(task_id);

        let task_funded = contract.get_task(task_id).unwrap();
        // Total escrow in task is now 0.005 + 0.15 = 0.155 NEAR
        assert_eq!(
            task_funded.escrow_amount.0,
            NearToken::from_millinear(155).as_yoctonear()
        );

        // 4. Provider delivers
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "actual_calculated_sha256_hash".to_string(), None);

        // 5. Buyer approves payout
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        let task_completed = contract.get_task(task_id).unwrap();
        assert_eq!(task_completed.status, TaskStatus::Completed);
        // Escrow emptied: provider was owed agreed_price (0.15 NEAR) and surplus (0.005 NEAR) was refunded
        assert_eq!(task_completed.escrow_amount.0, 0);

        // Verify provider reputation updated
        let agent = contract.get_agent(provider).unwrap();
        assert_eq!(agent.total_tasks_completed, 1);
    }

    #[test]
    #[should_panic(expected = "No escrow funds available for payout")]
    fn test_prevent_payout_zero_escrow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Buyer creates task with ONLY MIN_STORAGE_DEPOSIT (0.01 NEAR) -> escrow is 0
        testing_env!(get_context(buyer.clone(), MIN_STORAGE_DEPOSIT).build());
        let task_id = contract.create_task(
            "Zero Escrow Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        let task = contract.get_task(task_id).unwrap();
        assert_eq!(task.escrow_amount.0, 0); // 0 escrow

        // Agreed price is positive (0.1 NEAR), but task escrow is 0
        let agreed_price = NearToken::from_millinear(100);
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        testing_env!(get_context(provider, NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        testing_env!(get_context(buyer, NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id); // Should panic: No escrow funds available for payout
    }

    #[test]
    #[should_panic(expected = "Task is underfunded: escrow balance is less than agreed price")]
    fn test_prevent_payout_underfunded() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // 0.01 NEAR storage + 0.05 NEAR initial escrow = 0.06 NEAR
        let deposit = NearToken::from_millinear(60);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Underfunded Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        // Agreed price is 0.15 NEAR, but escrow is only 0.05 NEAR!
        let agreed_price = NearToken::from_millinear(150);
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        testing_env!(get_context(provider, NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        // Buyer attempts payout without adding the missing funding -> Should panic
        testing_env!(get_context(buyer, NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);
    }

    #[test]
    fn test_payout_exact_funding() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // 0.01 NEAR storage + 0.15 NEAR exact escrow = 0.16 NEAR
        let exact_deposit = NearToken::from_millinear(160);
        testing_env!(get_context(buyer.clone(), exact_deposit).build());
        let task_id = contract.create_task(
            "Exact Funding Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        let agreed_price = NearToken::from_millinear(150); // 0.15 NEAR
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        let task_awarded = contract.get_task(task_id).unwrap();
        assert_eq!(task_awarded.status, TaskStatus::InProgress);
        assert_eq!(task_awarded.escrow_amount.0, agreed_price.as_yoctonear());

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        let task_completed = contract.get_task(task_id).unwrap();
        assert_eq!(task_completed.status, TaskStatus::Completed);
        assert_eq!(task_completed.escrow_amount.0, 0);
    }

    #[test]
    fn test_storage_deposit_not_escrow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Task created with exact storage deposit (0.01 NEAR)
        testing_env!(get_context(buyer.clone(), MIN_STORAGE_DEPOSIT).build());
        let task_id = contract.create_task(
            "Storage Guard Task".to_string(),
            "SECURITY".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        let task = contract.get_task(task_id).unwrap();
        // Escrow MUST be 0 - storage deposit must never be treated as task escrow
        assert_eq!(task.escrow_amount.0, 0);
        assert_eq!(task.status, TaskStatus::Open);
    }

    #[test]
    fn test_simulate_payout_failure_rollback() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let deposit = NearToken::from_near(2);
        let agreed_price = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Rollback Test Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        let task_after_call = contract.get_task(task_id).unwrap();
        assert_eq!(task_after_call.status, TaskStatus::Completed);
        assert_eq!(task_after_call.escrow_amount.0, 0);

        // Now simulate asynchronous promise failure callback executed by contract account
        let failure_context = get_context("meridian.testnet".parse().unwrap(), NearToken::from_yoctonear(0));
        testing_env!(
            failure_context.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            Default::default(),
            vec![near_sdk::PromiseResult::Failed]
        );

        let callback_res = contract.on_payout_completed(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));
        assert!(!callback_res, "Callback should report false on promise failure");

        // Verify task state was rolled back to Verified and escrow was restored
        let task_rolled_back = contract.get_task(task_id).unwrap();
        assert_eq!(task_rolled_back.status, TaskStatus::Verified);
        assert_eq!(task_rolled_back.escrow_amount.0, agreed_price.as_yoctonear());
        assert_eq!(task_rolled_back.settled_at_ms, Some(0));

        // Buyer can safely recover the restored escrow
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.claim_surplus_refund(task_id);

        let task_claimed = contract.get_task(task_id).unwrap();
        assert_eq!(task_claimed.escrow_amount.0, 0);
    }

    #[test]
    fn test_simulate_surplus_refund_failure_recovery() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Initial deposit 0.015 NEAR (0.01 storage + 0.005 escrow)
        let initial_deposit = NearToken::from_millinear(15);
        testing_env!(get_context(buyer.clone(), initial_deposit).build());
        let task_id = contract.create_task(
            "Surplus Recovery Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        let agreed_price = NearToken::from_millinear(100); // 0.1 NEAR
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        // Additional funding 0.1 NEAR -> total escrow = 0.105 NEAR, surplus = 0.005 NEAR
        testing_env!(get_context(buyer.clone(), agreed_price).build());
        contract.fund_task(task_id);

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        // Simulate that surplus refund promise failed
        let failure_context = get_context("meridian.testnet".parse().unwrap(), NearToken::from_yoctonear(0));
        testing_env!(
            failure_context.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            Default::default(),
            vec![near_sdk::PromiseResult::Failed]
        );

        let surplus_amount = NearToken::from_millinear(5).as_yoctonear();
        let callback_res = contract.on_surplus_refund_completed(task_id, buyer.clone(), U128(surplus_amount));
        assert!(!callback_res);

        // Verify surplus is preserved in task escrow
        let task = contract.get_task(task_id).unwrap();
        assert_eq!(task.status, TaskStatus::Completed);
        assert_eq!(task.escrow_amount.0, surplus_amount);

        // Buyer can safely claim the surplus refund
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.claim_surplus_refund(task_id);

        let task_claimed = contract.get_task(task_id).unwrap();
        assert_eq!(task_claimed.escrow_amount.0, 0);
    }

    #[test]
    fn test_simulate_successful_settlement() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let deposit = NearToken::from_near(2);
        let agreed_price = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Success Settlement Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        let success_context = get_context("meridian.testnet".parse().unwrap(), NearToken::from_yoctonear(0));
        testing_env!(
            success_context.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            Default::default(),
            vec![near_sdk::PromiseResult::Successful(vec![])]
        );

        let callback_res = contract.on_payout_completed(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));
        assert!(callback_res, "Callback should report true on promise success");

        let task_settled = contract.get_task(task_id).unwrap();
        assert_eq!(task_settled.status, TaskStatus::Completed);
        assert_eq!(task_settled.escrow_amount.0, 0);
    }

    #[test]
    fn test_simulate_dispute_refund_failure_rollback() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let deposit = NearToken::from_near(2);
        let escrow = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Dispute Rollback Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.resolve_dispute_and_refund(task_id);

        let task_refunded = contract.get_task(task_id).unwrap();
        assert_eq!(task_refunded.status, TaskStatus::Refunded);
        assert_eq!(task_refunded.escrow_amount.0, 0);

        // Simulate that refund promise failed
        let failure_context = get_context("meridian.testnet".parse().unwrap(), NearToken::from_yoctonear(0));
        testing_env!(
            failure_context.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            Default::default(),
            vec![near_sdk::PromiseResult::Failed]
        );

        let callback_res = contract.on_refund_completed(task_id, buyer.clone(), U128(escrow.as_yoctonear()));
        assert!(!callback_res);

        // Assert rolled back to Disputed and escrow restored
        let task_rolled_back = contract.get_task(task_id).unwrap();
        assert_eq!(task_rolled_back.status, TaskStatus::Disputed);
        assert_eq!(task_rolled_back.escrow_amount.0, escrow.as_yoctonear());
    }

    #[test]
    fn test_zero_agreed_price_with_zero_escrow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Register provider
        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Trial Agent".to_string(),
            "PROVIDER".to_string(),
            "BENCHMARK".to_string(),
            "ipfs://meta_trial".to_string(),
        );

        // Buyer creates task with ONLY MIN_STORAGE_DEPOSIT (0 escrow)
        testing_env!(get_context(buyer.clone(), MIN_STORAGE_DEPOSIT).build());
        let task_id = contract.create_task(
            "Pro-Bono Benchmark Task".to_string(),
            "BENCHMARK".to_string(),
            "hash123".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        // Award task with agreed_price = 0
        contract.award_task(task_id, provider.clone(), U128(0));

        // Task advances immediately to InProgress because 0 funding is required
        let task_awarded = contract.get_task(task_id).unwrap();
        assert_eq!(task_awarded.status, TaskStatus::InProgress);
        assert_eq!(task_awarded.agreed_price.0, 0);
        assert_eq!(task_awarded.escrow_amount.0, 0);

        // Provider delivers
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash_deliv".to_string(), None);

        // Buyer approves deliverable with passing score
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        contract.record_verification(task_id, 85, "APPROVED".to_string(), "Benchmark passed".to_string());

        // Buyer approves zero-price task
        let _ = contract.approve_and_payout(task_id);

        let task_completed = contract.get_task(task_id).unwrap();
        assert_eq!(task_completed.status, TaskStatus::Completed);
        assert_eq!(task_completed.escrow_amount.0, 0);

        // Reputation awarded without paying tokens (5000 + 100 = 5100)
        let agent = contract.get_agent(provider).unwrap();
        assert_eq!(agent.total_tasks_completed, 1);
        assert_eq!(agent.reputation_score, 5100);
    }

    #[test]
    fn test_zero_agreed_price_with_nonzero_escrow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Register provider
        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Volunteer Agent".to_string(),
            "PROVIDER".to_string(),
            "BENCHMARK".to_string(),
            "ipfs://meta_vol".to_string(),
        );

        // Buyer creates task attaching 0.05 NEAR escrow (0.01 storage + 0.05 escrow = 0.06 NEAR)
        let deposit = NearToken::from_millinear(60);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Funded Volunteer Task".to_string(),
            "BENCHMARK".to_string(),
            "hash456".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        let task_init = contract.get_task(task_id).unwrap();
        let initial_escrow = NearToken::from_millinear(50).as_yoctonear();
        assert_eq!(task_init.escrow_amount.0, initial_escrow);

        // Volunteer agent agrees to do the task for 0 NEAR
        contract.award_task(task_id, provider.clone(), U128(0));

        let task_awarded = contract.get_task(task_id).unwrap();
        assert_eq!(task_awarded.status, TaskStatus::InProgress);

        // Provider delivers
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash_deliv".to_string(), None);

        // Buyer approves payout: provider receives 0 NEAR; all 0.05 NEAR is refunded to buyer as surplus!
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        let task_completed = contract.get_task(task_id).unwrap();
        assert_eq!(task_completed.status, TaskStatus::Completed);
        // Escrow emptied from task (refund promise dispatched to buyer)
        assert_eq!(task_completed.escrow_amount.0, 0);

        let agent = contract.get_agent(provider).unwrap();
        assert_eq!(agent.total_tasks_completed, 1);
    }

    #[test]
    #[should_panic(expected = "Self-dealing prohibited: buyer cannot award task to self")]
    fn test_prevent_self_dealing_award() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let agent: AccountId = "agent_self.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        testing_env!(get_context(agent.clone(), MIN_STORAGE_DEPOSIT).build());
        let task_id = contract.create_task(
            "Self Dealing Task".to_string(),
            "BENCHMARK".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        // Buyer attempts to award task to itself -> should panic
        contract.award_task(task_id, agent.clone(), U128(0));
    }

    #[test]
    fn test_zero_price_unverified_reputation_restricted() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Unverified Agent".to_string(),
            "PROVIDER".to_string(),
            "BENCHMARK".to_string(),
            "ipfs://meta".to_string(),
        );

        testing_env!(get_context(buyer.clone(), MIN_STORAGE_DEPOSIT).build());
        let task_id = contract.create_task(
            "Unverified Zero Task".to_string(),
            "BENCHMARK".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        contract.award_task(task_id, provider.clone(), U128(0));

        // Submit deliverable without verification
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        // Buyer approves without verification
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        let _ = contract.approve_and_payout(task_id);

        let agent = contract.get_agent(provider).unwrap();
        assert_eq!(agent.total_tasks_completed, 1);
        // Reputation score must NOT increase because deliverable was unverified (stays at base 5000)
        assert_eq!(agent.reputation_score, 5000);
    }

    #[test]
    fn test_zero_price_reputation_cap_and_repeated_abuse() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Benchmark Farmer Agent".to_string(),
            "PROVIDER".to_string(),
            "BENCHMARK".to_string(),
            "ipfs://meta".to_string(),
        );

        // Attempt to run 15 repeated zero-price verified benchmark tasks
        // Starting at 5000, each grants +100 bps, but MUST cap at ZERO_PRICE_MAX_REPUTATION (6000 bps)
        for i in 1..=15 {
            testing_env!(get_context(buyer.clone(), MIN_STORAGE_DEPOSIT).build());
            let task_id = contract.create_task(
                format!("Benchmark Task #{}", i),
                "BENCHMARK".to_string(),
                "hash".to_string(),
                env::block_timestamp_ms() + 100_000,
            );

            contract.award_task(task_id, provider.clone(), U128(0));

            testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
            contract.submit_deliverable(task_id, "hash".to_string(), None);

            testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
            contract.record_verification(task_id, 95, "APPROVED".to_string(), "Benchmark passed".to_string());
            let _ = contract.approve_and_payout(task_id);
        }

        let agent = contract.get_agent(provider).unwrap();
        assert_eq!(agent.total_tasks_completed, 15);
        // Firm cap at ZERO_PRICE_MAX_REPUTATION (6000 bps = 60.00%)
        // Cannot farm to 6500 or 10000 using free benchmark tasks!
        assert_eq!(agent.reputation_score, ZERO_PRICE_MAX_REPUTATION);
    }

    #[test]
    #[should_panic(expected = "Provider cannot verify own deliverable")]
    fn test_prevent_provider_self_verification() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Self Verifying Provider".to_string(),
            "PROVIDER".to_string(),
            "BENCHMARK".to_string(),
            "ipfs://meta".to_string(),
        );

        testing_env!(get_context(buyer.clone(), MIN_STORAGE_DEPOSIT).build());
        let task_id = contract.create_task(
            "Self Verification Task".to_string(),
            "BENCHMARK".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );

        contract.award_task(task_id, provider.clone(), U128(0));

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        // Provider tries to verify their own deliverable -> MUST PANIC
        contract.record_verification(task_id, 100, "APPROVED".to_string(), "I verified myself".to_string());
    }

    #[test]
    #[should_panic(expected = "Unauthorized role: registration with VERIFIER role is restricted to governance authority")]
    fn test_unauthorized_user_cannot_register_as_verifier() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let rogue: AccountId = "rogue_agent.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Rogue account attempts to register as VERIFIER
        testing_env!(get_context(rogue.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Fake Oracle".to_string(),
            "VERIFIER".to_string(),
            "SECURITY".to_string(),
            "ipfs://fake".to_string(),
        );
    }

    #[test]
    #[should_panic(expected = "Only contract owner can register official verifier agents")]
    fn test_unauthorized_user_cannot_call_register_verifier() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let rogue: AccountId = "rogue_agent.testnet".parse().unwrap();
        let fake_verifier: AccountId = "fake_verifier.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Non-owner attempts to call register_verifier -> MUST PANIC
        testing_env!(get_context(rogue.clone(), NearToken::from_yoctonear(0)).build());
        contract.register_verifier(
            fake_verifier,
            "Rogue Verifier".to_string(),
            "ipfs://rogue".to_string(),
        );
    }

    #[test]
    #[should_panic(expected = "Invalid task state for claiming refund: task must be completed or have failed settlement")]
    fn test_prevent_claim_refund_before_payout() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        testing_env!(get_context(provider.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Worker Agent".to_string(),
            "PROVIDER".to_string(),
            "DEV".to_string(),
            "ipfs://meta".to_string(),
        );

        let deposit = NearToken::from_near(2);
        let agreed_price = deposit.saturating_sub(MIN_STORAGE_DEPOSIT);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task(
            "Theft Prevention Task".to_string(),
            "DEV".to_string(),
            "hash".to_string(),
            env::block_timestamp_ms() + 100_000,
        );
        contract.award_task(task_id, provider.clone(), U128(agreed_price.as_yoctonear()));

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        contract.record_verification(task_id, 95, "APPROVED".to_string(), "Great work".to_string());

        let task = contract.get_task(task_id).unwrap();
        assert_eq!(task.status, TaskStatus::Verified);
        assert_eq!(task.settled_at_ms, None); // Payout has not occurred yet

        // Dishonest buyer attempts to drain escrow before calling approve_and_payout -> MUST PANIC
        let _ = contract.claim_surplus_refund(task_id);
    }

    #[test]
    fn test_simulate_reciprocal_commercial_farming() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let agent_a: AccountId = "agent_a.testnet".parse().unwrap();
        let agent_b: AccountId = "agent_b.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        // Register both agents (0.01 NEAR storage deposit each)
        testing_env!(get_context(agent_a.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Agent Alpha".to_string(),
            "HYBRID".to_string(),
            "DEV".to_string(),
            "ipfs://alpha".to_string(),
        );

        testing_env!(get_context(agent_b.clone(), MIN_STORAGE_DEPOSIT).build());
        contract.register_agent(
            "Agent Beta".to_string(),
            "HYBRID".to_string(),
            "DEV".to_string(),
            "ipfs://beta".to_string(),
        );

        // Cycle 1: Agent A hires Agent B for 1 NEAR (0.01 storage + 1 NEAR escrow = 1.01 NEAR)
        let deposit = NearToken::from_millinear(1010);
        let price = NearToken::from_near(1);
        testing_env!(get_context(agent_a.clone(), deposit).build());
        let task_1 = contract.create_task(
            "Task A->B".to_string(),
            "DEV".to_string(),
            "hash_ab".to_string(),
            env::block_timestamp_ms() + 100_000,
        );
        contract.award_task(task_1, agent_b.clone(), U128(price.as_yoctonear()));

        testing_env!(get_context(agent_b.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_1, "hash_deliv_ab".to_string(), None);

        testing_env!(get_context(agent_a.clone(), NearToken::from_yoctonear(0)).build());
        contract.record_verification(task_1, 95, "APPROVED".to_string(), "Verified by A".to_string());
        let _ = contract.approve_and_payout(task_1);

        // Agent B reputation boosted: 5000 + 250 = 5250
        let b_profile = contract.get_agent(agent_b.clone()).unwrap();
        assert_eq!(b_profile.reputation_score, 5250);
        assert_eq!(b_profile.total_tasks_completed, 1);

        // Cycle 2: Reciprocal hiring - Agent B hires Agent A for 1 NEAR
        testing_env!(get_context(agent_b.clone(), deposit).build());
        let task_2 = contract.create_task(
            "Task B->A".to_string(),
            "DEV".to_string(),
            "hash_ba".to_string(),
            env::block_timestamp_ms() + 100_000,
        );
        contract.award_task(task_2, agent_a.clone(), U128(price.as_yoctonear()));

        testing_env!(get_context(agent_a.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_2, "hash_deliv_ba".to_string(), None);

        testing_env!(get_context(agent_b.clone(), NearToken::from_yoctonear(0)).build());
        contract.record_verification(task_2, 95, "APPROVED".to_string(), "Verified by B".to_string());
        let _ = contract.approve_and_payout(task_2);

        // Agent A reputation boosted: 5000 + 250 = 5250
        let a_profile = contract.get_agent(agent_a.clone()).unwrap();
        assert_eq!(a_profile.reputation_score, 5250);
        assert_eq!(a_profile.total_tasks_completed, 1);
    }
}
