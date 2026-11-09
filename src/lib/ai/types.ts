export type ProviderName = "GEMINI" | "GROK" | "DEMO_SIMULATOR";

export interface GenerateOptions {
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  expectedJson?: boolean;
}

export interface AgentInferenceResult<T = any> {
  data: T;
  rawText: string;
  provider: ProviderName;
  isDemo: boolean;
  model: string;
  executionTimeMs: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface AIProvider {
  name: ProviderName;
  isConfigured(): boolean;
  generateText(options: GenerateOptions): Promise<AgentInferenceResult<string>>;
  generateJson<T = any>(options: GenerateOptions): Promise<AgentInferenceResult<T>>;
}

// Structured schemas for Agent actions
export interface BuyerDecomposedRfp {
  title: string;
  summary: string;
  category: "SECURITY_REVIEW" | "CODE_AUDIT" | "DATA_ANALYSIS" | "RESEARCH" | "ORACLE";
  acceptanceCriteria: string[];
  suggestedBudgetNear: string;
  maxBudgetNear: string;
  deadlineDays: number;
  riskFactors: string[];
}

export interface ProviderBidProposal {
  proposedPriceNear: string;
  deliveryTimeHours: number;
  technicalApproach: string;
  milestones: string[];
  riskMitigation: string;
  capabilityMatchProof: string;
}

export interface ProviderDeliverablePayload {
  executiveSummary: string;
  deliverableContent: string;
  methodology: string;
  auditFindings?: Array<{
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
    title: string;
    description: string;
    remediation: string;
  }>;
  verificationEvidence: Record<string, any>;
}

export interface VerifierInspectionVerdict {
  verdict: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  qualityScore: number; // 0 - 100
  criteriaValidation: Record<string, { passed: boolean; observation: string }>;
  verdictRationale: string;
  securityRiskDetected: boolean;
}
