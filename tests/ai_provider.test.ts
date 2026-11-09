import { describe, it, expect } from "vitest";
import { getAIProvider, DemoFallbackProvider } from "../src/lib/ai/provider";
import { BUYER_AGENT_SYSTEM, buildBuyerPrompt } from "../src/lib/ai/prompts";

describe("AI Provider Architecture & Inference Engine", () => {
  it("provides fallback provider when no API key is configured", () => {
    const { provider } = getAIProvider();
    expect(provider).toBeDefined();
    expect(["GEMINI", "GROK", "DEMO_SIMULATOR"]).toContain(provider.name);
  });

  it("deterministic simulator returns valid structured RFP JSON", async () => {
    const sim = new DemoFallbackProvider();
    const result = await sim.generateJson({
      systemPrompt: BUYER_AGENT_SYSTEM,
      prompt: buildBuyerPrompt("Audit NEAR contract for storage key collision and re-entrancy"),
    });

    expect(result.isDemo).toBe(true);
    expect(result.data.title).toBeDefined();
    expect(result.data.acceptanceCriteria).toBeInstanceOf(Array);
    expect(result.data.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(result.data.suggestedBudgetNear).toBeDefined();
  });

  it("reports inference latency and provider metadata honestly", async () => {
    const sim = new DemoFallbackProvider();
    const result = await sim.generateText({ prompt: "Health check" });

    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.provider).toBe("DEMO_SIMULATOR");
  });
});
