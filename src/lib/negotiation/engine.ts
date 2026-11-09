/**
 * MERIDIAN Negotiation Engine
 * Deterministic multi-factor scoring algorithm.
 * Business rules are strictly coded in deterministic TypeScript, NEVER left to LLM whim.
 */

export interface ScoringWeights {
  priceWeight: number; // default 0.35 (35%)
  reputationWeight: number; // default 0.30 (30%)
  capabilityWeight: number; // default 0.20 (20%)
  deliveryWeight: number; // default 0.15 (15%)
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  priceWeight: 0.35,
  reputationWeight: 0.30,
  capabilityWeight: 0.20,
  deliveryWeight: 0.15,
};

export interface CandidateBid {
  bidId: string;
  providerId: string;
  providerName: string;
  providerReputation: number; // 0 - 100
  providerCapabilities: string[];
  proposedPriceNear: number;
  deliveryTimeHours: number;
}

export interface TaskConstraints {
  maxBudgetNear: number;
  maxDeliveryHours: number;
  requiredSkills: string[];
}

export interface BidScoringBreakdown {
  bidId: string;
  providerId: string;
  providerName: string;
  eligible: boolean;
  disqualificationReason?: string;
  priceScore: number; // 0 - 100
  reputationScore: number; // 0 - 100
  capabilityScore: number; // 0 - 100
  deliveryScore: number; // 0 - 100
  compositeScore: number; // 0 - 100
  rationale: string;
}

export class NegotiationEngine {
  private weights: ScoringWeights;

  constructor(customWeights: Partial<ScoringWeights> = {}) {
    const merged = { ...DEFAULT_WEIGHTS, ...customWeights };
    const total =
      merged.priceWeight +
      merged.reputationWeight +
      merged.capabilityWeight +
      merged.deliveryWeight;

    // Normalise weights to ensure they sum strictly to 1.0
    this.weights = {
      priceWeight: merged.priceWeight / total,
      reputationWeight: merged.reputationWeight / total,
      capabilityWeight: merged.capabilityWeight / total,
      deliveryWeight: merged.deliveryWeight / total,
    };
  }

  getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  /**
   * Evaluates all candidate bids for a task and returns ranked scores with transparent breakdowns.
   */
  evaluateBids(bids: CandidateBid[], constraints: TaskConstraints): {
    rankedBids: BidScoringBreakdown[];
    selectedBid: BidScoringBreakdown | null;
  } {
    if (bids.length === 0) {
      return { rankedBids: [], selectedBid: null };
    }

    // Determine min/max across all eligible bids for normalization
    const eligibleBids = bids.filter((b) => b.proposedPriceNear <= constraints.maxBudgetNear);

    const minPrice = eligibleBids.length > 0
      ? Math.min(...eligibleBids.map((b) => b.proposedPriceNear))
      : 1;
    const maxPrice = Math.max(constraints.maxBudgetNear, ...bids.map((b) => b.proposedPriceNear));

    const minDelivery = Math.min(...bids.map((b) => b.deliveryTimeHours));
    const maxDelivery = Math.max(constraints.maxDeliveryHours, ...bids.map((b) => b.deliveryTimeHours));

    const evaluated: BidScoringBreakdown[] = bids.map((bid) => {
      // 1. Constraint enforcement (Rule: Never select provider outside buyer constraints)
      if (bid.proposedPriceNear > constraints.maxBudgetNear) {
        return {
          bidId: bid.bidId,
          providerId: bid.providerId,
          providerName: bid.providerName,
          eligible: false,
          disqualificationReason: `Proposed price (${bid.proposedPriceNear} NEAR) exceeds maximum budget limit (${constraints.maxBudgetNear} NEAR).`,
          priceScore: 0,
          reputationScore: 0,
          capabilityScore: 0,
          deliveryScore: 0,
          compositeScore: 0,
          rationale: "Disqualified: Exceeds buyer budget ceiling.",
        };
      }

      if (bid.deliveryTimeHours > constraints.maxDeliveryHours) {
        return {
          bidId: bid.bidId,
          providerId: bid.providerId,
          providerName: bid.providerName,
          eligible: false,
          disqualificationReason: `Delivery time (${bid.deliveryTimeHours}h) exceeds deadline ceiling (${constraints.maxDeliveryHours}h).`,
          priceScore: 0,
          reputationScore: 0,
          capabilityScore: 0,
          deliveryScore: 0,
          compositeScore: 0,
          rationale: "Disqualified: Exceeds buyer deadline constraint.",
        };
      }

      // 2. Price Score (35%): Lower price = Higher score (0 to 100)
      let priceScore = 100;
      if (maxPrice > minPrice) {
        priceScore = Math.max(0, Math.min(100, ((maxPrice - bid.proposedPriceNear) / (maxPrice - minPrice)) * 100));
      }

      // 3. Reputation Score (30%): Directly mapped (0 to 100)
      const reputationScore = Math.max(0, Math.min(100, bid.providerReputation));

      // 4. Capability Match Score (20%): Percentage of required skills satisfied
      let capabilityScore = 100;
      if (constraints.requiredSkills.length > 0) {
        const matched = constraints.requiredSkills.filter((req) =>
          bid.providerCapabilities.some((cap) =>
            cap.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(cap.toLowerCase())
          )
        );
        capabilityScore = (matched.length / constraints.requiredSkills.length) * 100;
      }

      // 5. Delivery Speed Score (15%): Faster delivery = Higher score (0 to 100)
      let deliveryScore = 100;
      if (maxDelivery > minDelivery) {
        deliveryScore = Math.max(0, Math.min(100, ((maxDelivery - bid.deliveryTimeHours) / (maxDelivery - minDelivery)) * 100));
      }

      // Calculate Weighted Composite Score
      const compositeScore = Number(
        (
          priceScore * this.weights.priceWeight +
          reputationScore * this.weights.reputationWeight +
          capabilityScore * this.weights.capabilityWeight +
          deliveryScore * this.weights.deliveryWeight
        ).toFixed(2)
      );

      const rationale = `Scored ${compositeScore}/100 [Price: ${priceScore.toFixed(1)} (35%), Rep: ${reputationScore.toFixed(1)} (30%), Match: ${capabilityScore.toFixed(1)} (20%), Speed: ${deliveryScore.toFixed(1)} (15%)].`;

      return {
        bidId: bid.bidId,
        providerId: bid.providerId,
        providerName: bid.providerName,
        eligible: true,
        priceScore: Number(priceScore.toFixed(2)),
        reputationScore: Number(reputationScore.toFixed(2)),
        capabilityScore: Number(capabilityScore.toFixed(2)),
        deliveryScore: Number(deliveryScore.toFixed(2)),
        compositeScore,
        rationale,
      };
    });

    // Sort descending by composite score
    evaluated.sort((a, b) => b.compositeScore - a.compositeScore);

    const eligibleSorted = evaluated.filter((b) => b.eligible);
    const selectedBid = eligibleSorted.length > 0 ? eligibleSorted[0] : null;

    return {
      rankedBids: evaluated,
      selectedBid,
    };
  }
}
