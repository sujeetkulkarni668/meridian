const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MERIDIAN autonomous agent database...');

  // 1. Create System / Demo Users
  const systemBuyer = await prisma.user.upsert({
    where: { nearAccountId: 'meridian_buyer.testnet' },
    update: {},
    create: {
      nearAccountId: 'meridian_buyer.testnet',
      role: 'BUYER',
    },
  });

  const demoProviderUser = await prisma.user.upsert({
    where: { nearAccountId: 'meridian_dao.testnet' },
    update: {},
    create: {
      nearAccountId: 'meridian_dao.testnet',
      role: 'ADMIN',
    },
  });

  // 2. Clear previous seed data for fresh start
  await prisma.auditEvent.deleteMany({});
  await prisma.agentExecutionLog.deleteMany({});
  await prisma.reputationRecord.deleteMany({});
  await prisma.verificationResult.deleteMany({});
  await prisma.deliverable.deleteMany({});
  await prisma.contractAgreement.deleteMany({});
  await prisma.bid.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.agentCapability.deleteMany({});
  await prisma.securityPolicy.deleteMany({});
  await prisma.agentProfile.deleteMany({});

  // 3. Register Specialised Agents
  const agents = [
    {
      name: 'Sentinel Security Guard',
      slug: 'sentinel-security',
      tagline: 'Autonomous Smart Contract Security, Re-entrancy & Logic Auditing',
      description: 'Institutional-grade automated Rust security reviewer specialized in NEAR SDK contract audit, access-control proofing, and storage deposit staking verification.',
      ownerId: demoProviderUser.id,
      nearAccountId: 'sentinel.agent.testnet',
      role: 'PROVIDER',
      category: 'SECURITY_REVIEW',
      pricingModel: 'FIXED',
      basePriceNear: '4.5',
      availability: 'AVAILABLE',
      isDemo: true,
      reputationScore: 98.4,
      totalJobsCompleted: 142,
      totalEarnedNear: '639.0',
      capabilities: [
        { name: 'Rust Contract Audit', description: 'Deep static AST analysis for re-entrancy and integer overflow', skillTag: 'rust_security' },
        { name: 'NEAR SDK Inspection', description: 'Validates storage keys, gas allocations, and promise callbacks', skillTag: 'near_sdk_audit' },
        { name: 'Attack Vector Simulation', description: 'Automated fuzzing for unauthorized state transitions', skillTag: 'fuzzing_simulation' },
      ],
      policy: {
        maxTaskBudgetNear: 50.0,
        dailySpendLimitNear: 200.0,
        allowedMethodsJson: JSON.stringify(['register_agent', 'submit_bid', 'submit_deliverable']),
        requiresHumanConfirm: false,
        isPaused: false,
      },
    },
    {
      name: 'Apex Synthesizer',
      slug: 'apex-synthesizer',
      tagline: 'Cross-Chain Intent Execution & Market Making Strategy Engine',
      description: 'High-speed autonomous financial agent generating algorithmic execution routes, NEAR Intents solver integration, and liquidity yield optimization models.',
      ownerId: demoProviderUser.id,
      nearAccountId: 'apex.agent.testnet',
      role: 'PROVIDER',
      category: 'DATA_ANALYSIS',
      pricingModel: 'FIXED',
      basePriceNear: '6.0',
      availability: 'AVAILABLE',
      isDemo: true,
      reputationScore: 96.1,
      totalJobsCompleted: 88,
      totalEarnedNear: '528.0',
      capabilities: [
        { name: 'Intent Strategy Modeling', description: 'Near Intents optimal routing calculation across 35+ chains', skillTag: 'intents_routing' },
        { name: 'DeFi Risk Modeling', description: 'Value-at-Risk modeling and collateral liquidation alerts', skillTag: 'defi_risk' },
      ],
      policy: {
        maxTaskBudgetNear: 75.0,
        dailySpendLimitNear: 300.0,
        allowedMethodsJson: JSON.stringify(['register_agent', 'submit_bid', 'submit_deliverable']),
        requiresHumanConfirm: true,
        isPaused: false,
      },
    },
    {
      name: 'Aegis Gas & Storage Optimizer',
      slug: 'aegis-optimizer',
      tagline: 'NEAR Storage Staking & Compute Gas Optimization Engine',
      description: 'Specialist agent analyzing NEAR smart contracts to minimize state storage overhead, reclaim inactive account deposits, and optimize gas receipt execution trees.',
      ownerId: demoProviderUser.id,
      nearAccountId: 'aegis.agent.testnet',
      role: 'PROVIDER',
      category: 'CODE_AUDIT',
      pricingModel: 'FIXED',
      basePriceNear: '3.0',
      availability: 'AVAILABLE',
      isDemo: true,
      reputationScore: 94.7,
      totalJobsCompleted: 64,
      totalEarnedNear: '192.0',
      capabilities: [
        { name: 'Storage Reclaim Audit', description: 'Reclaims unnecessary NEAR storage staking byte deposits', skillTag: 'storage_optimization' },
        { name: 'Gas Profile Profiling', description: 'Identifies expensive receipt loops and cross-contract bottlenecking', skillTag: 'gas_profiling' },
      ],
      policy: {
        maxTaskBudgetNear: 40.0,
        dailySpendLimitNear: 150.0,
        allowedMethodsJson: JSON.stringify(['register_agent', 'submit_bid', 'submit_deliverable']),
        requiresHumanConfirm: false,
        isPaused: false,
      },
    },
    {
      name: 'Veritas Oracle Inspector',
      slug: 'veritas-verifier',
      tagline: 'Independent Zero-Trust Verification & Deliverable Validation Agent',
      description: 'Objective, adversarial evaluation agent that checks submitted deliverables against machine-readable acceptance criteria without bias or subjective trust.',
      ownerId: demoProviderUser.id,
      nearAccountId: 'veritas.verifier.testnet',
      role: 'VERIFIER',
      category: 'SECURITY_REVIEW',
      pricingModel: 'FIXED',
      basePriceNear: '1.5',
      availability: 'AVAILABLE',
      isDemo: true,
      reputationScore: 99.8,
      totalJobsCompleted: 310,
      totalEarnedNear: '465.0',
      capabilities: [
        { name: 'Zero-Trust Audit', description: 'Automated verification against requirements schema', skillTag: 'zero_trust_verification' },
        { name: 'Code AST Parsing', description: 'Syntax and security validation of delivered deliverables', skillTag: 'ast_parsing' },
      ],
      policy: {
        maxTaskBudgetNear: 25.0,
        dailySpendLimitNear: 100.0,
        allowedMethodsJson: JSON.stringify(['record_verification']),
        requiresHumanConfirm: false,
        isPaused: false,
      },
    },
    {
      name: 'Equilibrium Negotiator',
      slug: 'equilibrium-negotiator',
      tagline: 'Multi-Criteria Deterministic Scoring & Algorithmic Matching Engine',
      description: 'Autonomous negotiation agent enforcing strict buyer constraints and calculating deterministic scores: Price (35%), Reputation (30%), Capability (20%), Delivery (15%).',
      ownerId: demoProviderUser.id,
      nearAccountId: 'equilibrium.negotiator.testnet',
      role: 'NEGOTIATOR',
      category: 'DATA_ANALYSIS',
      pricingModel: 'FIXED',
      basePriceNear: '1.0',
      availability: 'AVAILABLE',
      isDemo: true,
      reputationScore: 99.5,
      totalJobsCompleted: 275,
      totalEarnedNear: '275.0',
      capabilities: [
        { name: 'Deterministic Scoring', description: 'Calculates 0-100 normalized score breakdowns with verifiable rationale', skillTag: 'bidding_arbitration' },
        { name: 'Constraint Enforcement', description: 'Strict budget and delivery window guardrails', skillTag: 'guardrail_enforcement' },
      ],
      policy: {
        maxTaskBudgetNear: 20.0,
        dailySpendLimitNear: 100.0,
        allowedMethodsJson: JSON.stringify(['negotiate_bids']),
        requiresHumanConfirm: false,
        isPaused: false,
      },
    },
    {
      name: 'Meridian Procurement Executive',
      slug: 'meridian-procurement',
      tagline: 'Autonomous Buyer Agent & RFP Requirement Decomposition Engine',
      description: 'Conversational and programmatic buyer agent transforming user natural language project briefs into structured RFPs, budgeting constraints, and milestone timelines.',
      ownerId: systemBuyer.id,
      nearAccountId: 'procurement.buyer.testnet',
      role: 'BUYER',
      category: 'RESEARCH',
      pricingModel: 'FIXED',
      basePriceNear: '1.0',
      availability: 'AVAILABLE',
      isDemo: true,
      reputationScore: 98.9,
      totalJobsCompleted: 189,
      totalEarnedNear: '189.0',
      capabilities: [
        { name: 'RFP Specification Decomposer', description: 'Translates high level goals into strict acceptance criteria JSON', skillTag: 'rfp_generator' },
        { name: 'Escrow Allocator', description: 'Calculates appropriate NEAR testnet escrow deposits', skillTag: 'escrow_management' },
      ],
      policy: {
        maxTaskBudgetNear: 100.0,
        dailySpendLimitNear: 500.0,
        allowedMethodsJson: JSON.stringify(['create_task', 'fund_task', 'award_task', 'approve_and_payout']),
        requiresHumanConfirm: true,
        isPaused: false,
      },
    },
  ];

  for (const agentData of agents) {
    const { capabilities, policy, ...baseData } = agentData;
    const createdAgent = await prisma.agentProfile.create({
      data: {
        ...baseData,
        capabilities: {
          create: capabilities,
        },
        securityPolicy: {
          create: policy,
        },
      },
    });

    console.log(`Registered agent: ${createdAgent.name} [${createdAgent.role}]`);
  }

  // 4. Create Initial Benchmark Tasks demonstrating Marketplace States
  const sentinelAgent = await prisma.agentProfile.findUnique({ where: { slug: 'sentinel-security' } });
  const veritasAgent = await prisma.agentProfile.findUnique({ where: { slug: 'veritas-verifier' } });

  // Sample Task 1: COMPLETED & VERIFIED Benchmark
  const deadline1 = Date.now() + 86400000 * 3;
  const task1 = await prisma.task.create({
    data: {
      taskNumber: 101,
      title: 'Full Vulnerability Audit of NEAR Intents Escrow Contract',
      description: 'Perform rigorous AST inspection, re-entrancy audit, and storage key collision verification on the core settlement smart contract.',
      requirementsJson: JSON.stringify([
        'Identify potential re-entrancy hazards in cross-contract promises',
        'Verify integer overflow protections using SafeMath / Borsh 128-bit checks',
        'Check storage deposit staking reimbursement logic',
        'Provide actionable remediation diffs in Markdown report',
      ]),
      category: 'SECURITY_REVIEW',
      budgetNear: '5.0',
      budgetYocto: '5000000000000000000000000',
      deadlineEpochMs: BigInt(deadline1),
      buyerId: systemBuyer.id,
      buyerAccountId: 'meridian_buyer.testnet',
      providerId: sentinelAgent.id,
      status: 'COMPLETED',
      onChainTaskId: '101',
    },
  });

  // Seed Contract Agreement & Escrow
  await prisma.contractAgreement.create({
    data: {
      taskId: task1.id,
      agreedPriceNear: '5.0',
      agreedPriceYocto: '5000000000000000000000000',
      escrowAddress: 'meridian_core.testnet',
      escrowFunded: true,
      fundedTxHash: '9mFvGq5V7zY2P8rW3kL4xT9bN8mK7jH6gD5sA4pE3oQ1',
      settledTxHash: '8nEwHp4U6yX1O7qV2jK3wS8aM7lJ6iG5fC4rB3nD2mP9',
      status: 'RELEASED',
    },
  });

  // Seed Deliverable
  await prisma.deliverable.create({
    data: {
      taskId: task1.id,
      content: `# Formal Security Audit Report: NEAR Intents Settlement Contract\n\n## Executive Summary\nSentinel Security Guard conducted an autonomous static AST and vulnerability simulation on the contract.\n\n- Re-entrancy checks: PASS\n- Integer overflow protection: PASS (128-bit Borsh)\n- Promise callback safety: PASS\n- Storage staking hygiene: OPTIMIZED (2.4 NEAR refundable state released)`,
      deliverableHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  });

  // Seed Independent Verification
  await prisma.verificationResult.create({
    data: {
      taskId: task1.id,
      verifierAgentId: veritasAgent.id,
      verdict: 'APPROVED',
      qualityScore: 98.0,
      criteriaMetJson: JSON.stringify({
        'Re-entrancy analysis': true,
        'Integer overflow': true,
        'Storage check': true,
        'Actionable diffs': true,
      }),
      verdictRationale: 'All 4 explicit acceptance criteria thoroughly validated. AST report contains verifiable proofs.',
    },
  });

  // Seed Reputation update
  await prisma.reputationRecord.create({
    data: {
      agentId: sentinelAgent.id,
      taskId: task1.id,
      previousScore: 96.0,
      newScore: 98.4,
      scoreDelta: 2.4,
      reason: 'TASK_SUCCESS',
      proofHash: 'rec_8nEwHp4U6yX1O7qV2jK3wS8aM7lJ6iG5fC4rB3nD2mP9',
    },
  });

  // Sample Task 2: OPEN for Bidding
  const deadline2 = Date.now() + 86400000 * 5;
  await prisma.task.create({
    data: {
      taskNumber: 102,
      title: 'Automated NEAR Intent Routing Strategy for USDT-USDC Swaps',
      description: 'Design and simulate an automated intent solving algorithm that finds minimal slippage routes across HOT protocol and Rhea DEX.',
      requirementsJson: JSON.stringify([
        'Benchmark slippage for 10,000 USDT trades across Rhea and HOT liquidity',
        'Provide JSON formatted routing graph with optimal route split',
        'Include execution gas cost breakdown',
      ]),
      category: 'DATA_ANALYSIS',
      budgetNear: '6.0',
      budgetYocto: '6000000000000000000000000',
      deadlineEpochMs: BigInt(deadline2),
      buyerId: systemBuyer.id,
      buyerAccountId: 'meridian_buyer.testnet',
      status: 'OPEN',
      onChainTaskId: '102',
    },
  });

  console.log('Database seeded successfully with benchmark agents, policies, and tasks.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
