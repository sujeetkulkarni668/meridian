import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIProvider,
  GenerateOptions,
  AgentInferenceResult,
  BuyerDecomposedRfp,
  ProviderBidProposal,
  ProviderDeliverablePayload,
  VerifierInspectionVerdict,
} from "./types";

/**
 * 1. Google Gemini Provider (Primary)
 */
export class GeminiProvider implements AIProvider {
  name: "GEMINI" = "GEMINI";
  private client: GoogleGenerativeAI | null = null;
  private modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim() !== "") {
      this.client = new GoogleGenerativeAI(key);
    }
  }

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");
  }

  async generateText(options: GenerateOptions): Promise<AgentInferenceResult<string>> {
    if (!this.client) throw new Error("Gemini API key is not configured.");
    const startTime = Date.now();

    const candidateModels = Array.from(new Set([
      "gemini-3.1-flash-lite",
      this.modelName,
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ]));

    let lastError: any = null;
    for (const modelToTry of candidateModels) {
      try {
        const modelParams: any = {
          model: modelToTry,
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxTokens ?? 2048,
          },
        };
        if (options.systemPrompt && options.systemPrompt.trim() !== "") {
          modelParams.systemInstruction = options.systemPrompt;
        }

        const model = this.client.getGenerativeModel(modelParams);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini inference request timed out")), options.timeoutMs ?? 45000)
        );

        const result = await Promise.race([model.generateContent(options.prompt), timeoutPromise]);
        const rawText = result.response.text();

        return {
          data: rawText,
          rawText,
          provider: "GEMINI",
          isDemo: false,
          model: modelToTry,
          executionTimeMs: Date.now() - startTime,
        };
      } catch (err: any) {
        lastError = err;
        // Brief pause before trying next candidate on transient network/load errors
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
    }

    throw lastError || new Error("Failed to generate content with available Gemini models");
  }

  async generateJson<T = any>(options: GenerateOptions): Promise<AgentInferenceResult<T>> {
    const textRes = await this.generateText(options);
    const parsed = cleanAndParseJson<T>(textRes.rawText);
    return {
      ...textRes,
      data: parsed,
    };
  }
}

/**
 * 2. xAI Grok Provider (Secondary Optional)
 */
export class GrokProvider implements AIProvider {
  name: "GROK" = "GROK";
  private apiKey = process.env.GROK_API_KEY;
  private modelName = "grok-2-latest";

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== "");
  }

  async generateText(options: GenerateOptions): Promise<AgentInferenceResult<string>> {
    if (!this.isConfigured()) throw new Error("xAI Grok API key is not configured.");
    const startTime = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);

    try {
      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      messages.push({ role: "user", content: options.prompt });

      const resp = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2048,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Grok API returned HTTP ${resp.status}: ${await resp.text()}`);
      }

      const json = await resp.json();
      const rawText = json.choices?.[0]?.message?.content || "";

      return {
        data: rawText,
        rawText,
        provider: "GROK",
        isDemo: false,
        model: this.modelName,
        executionTimeMs: Date.now() - startTime,
        promptTokens: json.usage?.prompt_tokens,
        completionTokens: json.usage?.completion_tokens,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateJson<T = any>(options: GenerateOptions): Promise<AgentInferenceResult<T>> {
    const textRes = await this.generateText(options);
    const parsed = cleanAndParseJson<T>(textRes.rawText);
    return {
      ...textRes,
      data: parsed,
    };
  }
}

/**
 * 3. High-Fidelity Deterministic Simulator (Demo Mode)
 * Used when no live API keys are supplied so developers and judges
 * can test the full autonomous economy without blockers.
 */
export class DemoFallbackProvider implements AIProvider {
  name: "DEMO_SIMULATOR" = "DEMO_SIMULATOR";

  isConfigured(): boolean {
    return true;
  }

  async generateText(options: GenerateOptions): Promise<AgentInferenceResult<string>> {
    const startTime = Date.now();
    const text = `[DEMO SIMULATOR RESPONSE]\n${options.prompt.slice(0, 300)}... Output verified deterministically.`;
    return {
      data: text,
      rawText: text,
      provider: "DEMO_SIMULATOR",
      isDemo: true,
      model: "meridian-deterministic-sim-v1",
      executionTimeMs: 120,
    };
  }

  async generateJson<T = any>(options: GenerateOptions): Promise<AgentInferenceResult<T>> {
    const startTime = Date.now();
    let sampleData: any;

    if (options.prompt.includes("decompose it into an RFP")) {
      sampleData = {
        title: "NEAR Rust Smart Contract AST & Access-Control Verification",
        summary: "Autonomous formal verification of contract storage keys, promise callbacks, and re-entrancy defenses.",
        category: "SECURITY_REVIEW",
        acceptanceCriteria: [
          "Verify integer overflow protections using SafeMath and 128-bit types",
          "Ensure no state modifications occur after asynchronous Promise calls",
          "Validate storage deposit refund accounting for detached state keys",
          "Deliver reproducible unit tests and Markdown security assessment",
        ],
        suggestedBudgetNear: "4.5",
        maxBudgetNear: "6.0",
        deadlineDays: 3,
        riskFactors: [
          "Cross-contract promise re-entrancy if callbacks mutate state post-execution",
          "Under-collateralized storage deposits causing transaction aborts",
        ],
      } as BuyerDecomposedRfp;
    } else if (options.prompt.includes("Formulate a competitive bid")) {
      sampleData = {
        proposedPriceNear: "4.2",
        deliveryTimeHours: 18,
        technicalApproach: "Automated AST parsing via Syn crate, symbolic fuzzing of promise execution trees, and manual inspection of gas allocation parameters.",
        milestones: [
          "Static AST parsing & re-entrancy graph generation",
          "Borsh serialization bounds testing",
          "Synthesis of final audit report with remediation patches",
        ],
        riskMitigation: "Run parallel execution on NEAR Sandbox to verify storage staking byte thresholds.",
        capabilityMatchProof: "142 verified jobs completed on NEAR Testnet with 98.4% reputation index.",
      } as ProviderBidProposal;
    } else if (options.prompt.includes("Generate the comprehensive deliverable")) {
      sampleData = {
        executiveSummary: "Institutional security audit completed with zero high-severity vulnerabilities remaining unaddressed.",
        deliverableContent: `# Formal Security Audit & Verification Report\n\n## 1. Scope\nTarget: Meridian Settlement & Escrow Contract (near-sdk 5.5.0)\n\n## 2. Findings\n- **Re-entrancy Checks**: PASS. State updates strictly precede Promise dispatch.\n- **Storage Staking Accounting**: PASS. 0.05 NEAR storage staked per agent registration.\n- **Integer Overflow**: PASS. YoctoNEAR amounts handled exclusively via 128-bit integers.\n\n## 3. Remediation\nAdded explicit assertion check on \`deadline_ms > env::block_timestamp_ms()\` to prevent expired task lockups.`,
        methodology: "Symbolic execution, AST analysis, and isolated NEAR Sandbox state testing.",
        auditFindings: [
          {
            severity: "LOW",
            title: "Storage Key Namespace Collision Guard",
            description: "Prefixes 'a', 't', 'b' must remain strictly unique across state versions.",
            remediation: "Documented in contract layout constants.",
          },
        ],
        verificationEvidence: {
          astParsed: true,
          unitTestCoveragePct: 100,
          proofHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
      } as ProviderDeliverablePayload;
    } else if (options.prompt.includes("Evaluate each criterion rigorously")) {
      sampleData = {
        verdict: "APPROVED",
        qualityScore: 97.5,
        criteriaValidation: {
          "Verify integer overflow protections": {
            passed: true,
            observation: "Verified: All amounts handled using U128 and native NearToken types.",
          },
          "Ensure no state modifications occur after asynchronous Promise calls": {
            passed: true,
            observation: "Verified: Task state updated to Completed/Refunded prior to Promise transfer.",
          },
          "Validate storage deposit refund accounting": {
            passed: true,
            observation: "Verified: UnorderedMap key storage costs correctly bounded.",
          },
          "Deliver reproducible unit tests": {
            passed: true,
            observation: "Verified: 5 comprehensive unit tests provided covering all edge conditions.",
          },
        },
        verdictRationale: "All 4 acceptance criteria independently validated. Output conforms to institutional standards.",
        securityRiskDetected: false,
      } as VerifierInspectionVerdict;
    } else {
      sampleData = {
        status: "SUCCESS",
        output: "Processed by Meridian Demo Engine",
      };
    }

    return {
      data: sampleData as T,
      rawText: JSON.stringify(sampleData, null, 2),
      provider: "DEMO_SIMULATOR",
      isDemo: true,
      model: "meridian-deterministic-sim-v1",
      executionTimeMs: 95,
    };
  }
}

/**
 * Clean and robustly parse JSON from LLM output.
 */
function cleanAndParseJson<T>(raw: string): T {
  let cleaned = raw.trim();
  // Strip markdown code fences if model enclosed JSON in ```json ... ```
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    // Attempt to extract the first balanced JSON object
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const sub = cleaned.substring(startIdx, endIdx + 1);
      return JSON.parse(sub);
    }
    throw new Error(`Failed to parse AI output into JSON: ${err.message}. Raw output: ${raw.slice(0, 300)}`);
  }
}

/**
 * AI Provider Factory
 * Automatically selects Gemini if configured, then Grok, or falls back to Demo Simulator with full transparency.
 */
export function getAIProvider(): { provider: AIProvider; isLive: boolean } {
  const gemini = new GeminiProvider();
  if (gemini.isConfigured()) {
    return { provider: gemini, isLive: true };
  }

  const grok = new GrokProvider();
  if (grok.isConfigured()) {
    return { provider: grok, isLive: true };
  }

  return { provider: new DemoFallbackProvider(), isLive: false };
}
