use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, Promise};

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
       1. AGENT REGISTRY
    ------------------------------------------------------------------------- */
    pub fn register_agent(
        &mut self,
        name: String,
        role: String,
        category: String,
        metadata_uri: String,
    ) {
        self.assert_not_paused();
        let account_id = env::predecessor_account_id();
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
        env::log_str(&format!("Agent registered: {}", account_id));
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
       2. TASK CREATION & ESCROW FUNDING
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

        self.task_counter += 1;
        let task_id = self.task_counter;

        let (status, escrow_amount) = if deposit.as_yoctonear() > 0 {
            (TaskStatus::Funded, U128(deposit.as_yoctonear()))
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
            "Task created: #{} by {} with attached escrow: {} yoctoNEAR",
            task_id,
            buyer_id,
            deposit.as_yoctonear()
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
            task.status == TaskStatus::Bidding || task.status == TaskStatus::Open || task.status == TaskStatus::Funded,
            "Invalid state for awarding task"
        );

        task.assigned_provider = Some(provider_id.clone());
        task.agreed_price = agreed_price;

        if task.escrow_amount.0 >= agreed_price.0 && task.escrow_amount.0 > 0 {
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
            task.status == TaskStatus::InProgress || task.status == TaskStatus::Funded,
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
            task.buyer_id == caller || caller == self.owner_id,
            "Only buyer or contract owner can approve payout"
        );
        require!(
            task.status == TaskStatus::Delivered || task.status == TaskStatus::Verified,
            "Deliverable must be submitted before payout"
        );

        let payout_amount = task.escrow_amount.0;
        require!(payout_amount > 0, "No escrow funds available for payout");
        let provider = task.assigned_provider.clone().expect("No provider assigned");

        // Update state BEFORE initiating promise transfer to prevent re-entrancy / double payout
        task.status = TaskStatus::Completed;
        task.escrow_amount = U128(0);
        task.settled_at_ms = Some(env::block_timestamp_ms());
        self.tasks.insert(&task_id, &task);

        // Update provider reputation on-chain
        if let Some(mut agent) = self.agents.get(&provider) {
            agent.total_tasks_completed += 1;
            // Incremental reputation boost up to 10000 (100.00%)
            agent.reputation_score = (agent.reputation_score + 250).min(10000);
            self.agents.insert(&provider, &agent);
        }

        env::log_str(&format!(
            "Task #{} approved. Releasing payout of {} yoctoNEAR to provider {}",
            task_id,
            payout_amount,
            provider
        ));

        // Transfer payout to provider via NEAR native promise
        Promise::new(provider).transfer(NearToken::from_yoctonear(payout_amount))
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
            "Dispute resolved for Task #{}. Refunding {} yoctoNEAR to buyer {}",
            task_id,
            refund_amount,
            buyer
        ));

        Promise::new(buyer).transfer(NearToken::from_yoctonear(refund_amount))
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

        let ctx_agent = get_context(agent_account.clone(), NearToken::from_yoctonear(0));
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
        let mut contract = MeridianMarketplace::new(owner);

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
        assert_eq!(task.escrow_amount.0, NearToken::from_near(5).as_yoctonear());
    }

    #[test]
    fn test_complete_bidding_award_and_payout_flow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();
        let verifier: AccountId = "verifier.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner);

        // Register provider
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.register_agent(
            "CyberSec Agent".to_string(),
            "PROVIDER".to_string(),
            "SECURITY".to_string(),
            "ipfs://cybersec".to_string(),
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
        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_bid(
            task_id,
            U128(NearToken::from_near(10).as_yoctonear()),
            24,
            "Top tier security audit".to_string(),
        );

        let bids = contract.get_bids(task_id);
        assert_eq!(bids.len(), 1);

        // Buyer awards task
        testing_env!(get_context(buyer.clone(), NearToken::from_yoctonear(0)).build());
        contract.award_task(task_id, provider.clone(), U128(NearToken::from_near(10).as_yoctonear()));

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
        contract.approve_and_payout(task_id);

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
        let mut contract = MeridianMarketplace::new(owner);

        let deposit = NearToken::from_near(5);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task("Test Task".to_string(), "DEV".to_string(), "hash".to_string(), 9_999_999_999);

        contract.award_task(task_id, provider, U128(deposit.as_yoctonear()));

        // Attempting to payout before delivery should panic
        contract.approve_and_payout(task_id);
    }

    #[test]
    #[should_panic(expected = "Only buyer or contract owner can approve payout")]
    fn test_prevent_unauthorized_payout() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();
        let attacker: AccountId = "attacker.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner);

        let deposit = NearToken::from_near(5);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task("Test Task".to_string(), "DEV".to_string(), "hash".to_string(), 9_999_999_999);
        contract.award_task(task_id, provider.clone(), U128(deposit.as_yoctonear()));

        testing_env!(get_context(provider.clone(), NearToken::from_yoctonear(0)).build());
        contract.submit_deliverable(task_id, "hash".to_string(), None);

        // Attacker attempts payout
        testing_env!(get_context(attacker, NearToken::from_yoctonear(0)).build());
        contract.approve_and_payout(task_id);
    }

    #[test]
    fn test_dispute_and_refund_flow() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let buyer: AccountId = "buyer.testnet".parse().unwrap();
        let provider: AccountId = "provider.testnet".parse().unwrap();

        testing_env!(get_context(owner.clone(), NearToken::from_yoctonear(0)).build());
        let mut contract = MeridianMarketplace::new(owner.clone());

        let deposit = NearToken::from_near(5);
        testing_env!(get_context(buyer.clone(), deposit).build());
        let task_id = contract.create_task("Test Task".to_string(), "DEV".to_string(), "hash".to_string(), 9_999_999_999);
        contract.award_task(task_id, provider.clone(), U128(deposit.as_yoctonear()));

        // Buyer disputes task
        contract.dispute_task(task_id, "Provider failed to meet deadline criteria".to_string());

        let task_disputed = contract.get_task(task_id).unwrap();
        assert_eq!(task_disputed.status, TaskStatus::Disputed);

        // Owner arbitrates dispute and refunds buyer
        testing_env!(get_context(owner, NearToken::from_yoctonear(0)).build());
        contract.resolve_dispute_and_refund(task_id);

        let task_refunded = contract.get_task(task_id).unwrap();
        assert_eq!(task_refunded.status, TaskStatus::Refunded);
        assert_eq!(task_refunded.escrow_amount.0, 0);
    }
}
