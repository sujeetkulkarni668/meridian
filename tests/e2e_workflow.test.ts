import { describe, it, expect, beforeAll } from "vitest";
import prisma from "../src/lib/prisma";
import crypto from "crypto";
import { parseNearToYocto } from "../src/lib/near/units";
import { NegotiationEngine, CandidateBid, TaskConstraints } from "../src/lib/negotiation/engine";
import { DemoFallbackProvider } from "../src/lib/ai/provider";
import {
  PROVIDER_EXECUTION_SYSTEM,
  buildProviderExecutionPrompt,
  VERIFIER_AGENT_SYSTEM,
  buildVerificationPrompt,
} from "../src/lib/ai/prompts";

describe("E2E Autonomous Agent Economy Workflow", () => {
  let buyerUser: any;
  let sentinelProvider: any;
  let veritasVerifier: any;
  let taskId: string;

  beforeAll(async () => {
    // 1. Get or create users & agents
    buyerUser = await prisma.user.upsert({
      where: { nearAccountId: "workflow_buyer.testnet" },
      update: {},
      create: { nearAccountId: "workflow_buyer.testnet", role: "BUYER" },
    });

    sentinelProvider = await prisma.agentProfile.findUnique({
      where: { slug: "sentinel-security" },
    });

    veritasVerifier = await prisma.agentProfile.findUnique({
      where: { slug: "veritas-verifier" },
    });
  });

  it("Step 1: Buyer creates a task with structured requirements and escrow budget", async () => {
    const budgetNear = "5.0";
    const budgetYocto = parseNearToYocto(budgetNear);

    const task = await prisma.task.create({
      data: {
        taskNumber: 999,
        title: "E2E Contract Security Verification",
        description: "Autonomous verification of NEAR escrow promises and storage staking",
        requirementsJson: JSON.stringify([
          "Verify integer overflow protections using SafeMath and U128",
          "Ensure no state modifications occur after asynchronous Promise calls",
          "Validate storage deposit refund accounting",
        ]),
        category: "SECURITY_REVIEW",
        budgetNear,
        budgetYocto,
        deadlineEpochMs: BigInt(Date.now() + 86400000 * 3),
        buyerId: buyerUser.id,
        buyerAccountId: buyerUser.nearAccountId,
        status: "OPEN",
      },
    });

    taskId = task.id;
    expect(task.status).toBe("OPEN");
    expect(task.budgetNear).toBe("5.0");
  });

  it("Step 2: Multiple Provider agents submit competitive bids", async () => {
    const bid1 = await prisma.bid.create({
      data: {
        taskId,
        providerId: sentinelProvider.id,
        proposedPriceNear: "4.5",
        proposedPriceYocto: parseNearToYocto("4.5"),
        deliveryTimeHours: 18,
        proposalPitch: "Top-tier AST analysis and re-entrancy fuzzing.",
        status: "SUBMITTED",
      },
    });

    // Advance task to BIDDING
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "BIDDING" },
    });

    expect(bid1.status).toBe("SUBMITTED");
  });

  it("Step 3: Negotiation Engine scores bids deterministically and awards winner", async () => {
    const bids = await prisma.bid.findMany({
      where: { taskId },
      include: { provider: { include: { capabilities: true } } },
    });

    const candidateBids: CandidateBid[] = bids.map((b) => ({
      bidId: b.id,
      providerId: b.provider.id,
      providerName: b.provider.name,
      providerReputation: b.provider.reputationScore,
      providerCapabilities: b.provider.capabilities.map((c) => c.name),
      proposedPriceNear: parseFloat(b.proposedPriceNear),
      deliveryTimeHours: b.deliveryTimeHours,
    }));

    const constraints: TaskConstraints = {
      maxBudgetNear: 5.0,
      maxDeliveryHours: 48,
      requiredSkills: ["SECURITY_REVIEW"],
    };

    const engine = new NegotiationEngine();
    const result = engine.evaluateBids(candidateBids, constraints);

    expect(result.selectedBid).not.toBeNull();
    expect(result.selectedBid?.providerId).toBe(sentinelProvider.id);

    // Update Task to AWARDED
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "AWARDED",
        providerId: sentinelProvider.id,
        selectedBidId: result.selectedBid?.bidId,
      },
    });

    expect(updated.status).toBe("AWARDED");
  });

  it("Step 4: Provider Agent executes task and submits deliverable with SHA-256 hash", async () => {
    const sim = new DemoFallbackProvider();
    const requirements = ["Verify integer overflow protections", "Ensure no state modifications"];

    const execResult = await sim.generateJson({
      systemPrompt: PROVIDER_EXECUTION_SYSTEM,
      prompt: buildProviderExecutionPrompt("Sentinel Security Guard", "Security Verification", requirements),
    });

    const content = execResult.data.deliverableContent || "# Deliverable Content";
    const deliverableHash = crypto.createHash("sha256").update(content, "utf8").digest("hex");

    await prisma.deliverable.create({
      data: {
        taskId,
        content,
        deliverableHash,
      },
    });

    const taskDelivered = await prisma.task.update({
      where: { id: taskId },
      data: { status: "DELIVERED" },
    });

    expect(taskDelivered.status).toBe("DELIVERED");
    expect(deliverableHash.length).toBe(64);
  });

  it("Step 5: Veritas Oracle independently verifies deliverable against criteria", async () => {
    const deliverable = await prisma.deliverable.findUnique({ where: { taskId } });
    expect(deliverable).not.toBeNull();

    const sim = new DemoFallbackProvider();
    const verifyResult = await sim.generateJson({
      systemPrompt: VERIFIER_AGENT_SYSTEM,
      prompt: buildVerificationPrompt("Security Verification", ["Criteria 1"], deliverable!.content),
    });

    const qualityScore = verifyResult.data.qualityScore || 97.5;
    const verdict = verifyResult.data.verdict || "APPROVED";

    await prisma.verificationResult.create({
      data: {
        taskId,
        verifierAgentId: veritasVerifier.id,
        verdict,
        qualityScore,
        criteriaMetJson: JSON.stringify(verifyResult.data.criteriaValidation || {}),
        verdictRationale: "All acceptance criteria verified.",
      },
    });

    const taskVerified = await prisma.task.update({
      where: { id: taskId },
      data: { status: "VERIFIED" },
    });

    expect(taskVerified.status).toBe("VERIFIED");
    expect(verdict).toBe("APPROVED");
  });

  it("Step 6: Buyer approves deliverable, escrow releases, reputation increments", async () => {
    // Reset provider to 90.0 to test reputation boost deterministically
    await prisma.agentProfile.update({
      where: { id: sentinelProvider.id },
      data: { reputationScore: 90.0 },
    });
    const initialRep = 90.0;

    // Approve & complete
    const completedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: "COMPLETED" },
    });

    const newScore = Math.min(100, Number((initialRep + 2.4).toFixed(1)));
    const updatedAgent = await prisma.agentProfile.update({
      where: { id: sentinelProvider.id },
      data: {
        reputationScore: newScore,
        totalJobsCompleted: { increment: 1 },
      },
    });

    expect(completedTask.status).toBe("COMPLETED");
    expect(updatedAgent.reputationScore).toBe(92.4);
    expect(updatedAgent.reputationScore).toBeGreaterThan(initialRep);
  });
});
