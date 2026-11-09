import { describe, it, expect } from "vitest";
import { NegotiationEngine, CandidateBid, TaskConstraints } from "../src/lib/negotiation/engine";

describe("Negotiation Engine — Deterministic 4-Factor Scoring", () => {
  const engine = new NegotiationEngine();

  const constraints: TaskConstraints = {
    maxBudgetNear: 10.0,
    maxDeliveryHours: 48,
    requiredSkills: ["rust_security", "near_sdk"],
  };

  const sampleBids: CandidateBid[] = [
    {
      bidId: "bid-1",
      providerId: "agent-sentinel",
      providerName: "Sentinel Security Guard",
      providerReputation: 98.0,
      providerCapabilities: ["rust_security", "near_sdk", "fuzzing"],
      proposedPriceNear: 5.0,
      deliveryTimeHours: 24,
    },
    {
      bidId: "bid-2",
      providerId: "agent-apex",
      providerName: "Apex Synthesizer",
      providerReputation: 85.0,
      providerCapabilities: ["intents_routing"],
      proposedPriceNear: 8.0,
      deliveryTimeHours: 36,
    },
    {
      bidId: "bid-overbudget",
      providerId: "agent-expensive",
      providerName: "Expensive Auditor",
      providerReputation: 99.0,
      providerCapabilities: ["rust_security", "near_sdk"],
      proposedPriceNear: 15.0, // Exceeds 10.0 NEAR max budget
      deliveryTimeHours: 12,
    },
  ];

  it("calculates scores with weights: Price (35%), Rep (30%), Match (20%), Speed (15%)", () => {
    const weights = engine.getWeights();
    expect(weights.priceWeight).toBeCloseTo(0.35, 2);
    expect(weights.reputationWeight).toBeCloseTo(0.30, 2);
    expect(weights.capabilityWeight).toBeCloseTo(0.20, 2);
    expect(weights.deliveryWeight).toBeCloseTo(0.15, 2);
  });

  it("disqualifies providers exceeding buyer constraints", () => {
    const result = engine.evaluateBids(sampleBids, constraints);
    const overbudget = result.rankedBids.find((b) => b.bidId === "bid-overbudget");

    expect(overbudget?.eligible).toBe(false);
    expect(overbudget?.disqualificationReason).toContain("exceeds maximum budget");
    expect(overbudget?.compositeScore).toBe(0);
  });

  it("ranks the best eligible provider with deterministic scoring and explanations", () => {
    const result = engine.evaluateBids(sampleBids, constraints);

    expect(result.selectedBid).not.toBeNull();
    expect(result.selectedBid?.providerId).toBe("agent-sentinel");
    expect(result.selectedBid?.compositeScore).toBeGreaterThan(80);
    expect(result.selectedBid?.rationale).toContain("Price:");
  });

  it("normalizes scores to 0-100 bounds", () => {
    const result = engine.evaluateBids(sampleBids, constraints);
    for (const b of result.rankedBids) {
      expect(b.compositeScore).toBeGreaterThanOrEqual(0);
      expect(b.compositeScore).toBeLessThanOrEqual(100);
      expect(b.priceScore).toBeGreaterThanOrEqual(0);
      expect(b.priceScore).toBeLessThanOrEqual(100);
    }
  });
});
