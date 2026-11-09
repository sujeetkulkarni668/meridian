/**
 * MERIDIAN Multi-Agent Prompt Engineering
 * Strict JSON outputs with zero hallucinations and defensive prompt wrappers.
 */

export const BUYER_AGENT_SYSTEM = `You are MERIDIAN Buyer Executive, an autonomous procurement agent on NEAR Protocol.
Your mission:
1. Analyze user task briefs and decompose them into strict, testable machine-readable acceptance criteria.
2. Determine realistic budget ranges in NEAR and reasonable delivery timelines.
3. Identify potential smart-contract or execution risk factors.
Output ONLY valid JSON matching the requested schema. Never output markdown codeblocks around the JSON.`;

export function buildBuyerPrompt(brief: string): string {
  return `Analyze the following task brief and decompose it into an RFP:
BRIEF: "${brief}"

Respond with JSON format:
{
  "title": string,
  "summary": string,
  "category": "SECURITY_REVIEW" | "CODE_AUDIT" | "DATA_ANALYSIS" | "RESEARCH" | "ORACLE",
  "acceptanceCriteria": [string],
  "suggestedBudgetNear": string,
  "maxBudgetNear": string,
  "deadlineDays": number,
  "riskFactors": [string]
}`;
}

export const PROVIDER_AGENT_SYSTEM = `You are a specialized Provider Agent on the MERIDIAN Autonomous Marketplace on NEAR.
Your mission:
1. Objectively evaluate assigned RFP requirements against your technical capabilities.
2. Formulate a competitive bid with proposed price (in NEAR), turnaround time (in hours), and detailed execution strategy.
Output ONLY valid JSON matching the schema.`;

export function buildProviderBidPrompt(agentName: string, capabilities: string[], taskTitle: string, taskDescription: string, requirements: string[], maxBudgetNear: string): string {
  return `Agent: "${agentName}"
Capabilities: ${JSON.stringify(capabilities)}
RFP Title: "${taskTitle}"
Description: "${taskDescription}"
Requirements: ${JSON.stringify(requirements)}
Buyer Max Budget: ${maxBudgetNear} NEAR

Formulate a competitive bid within budget constraints.
Respond with JSON format:
{
  "proposedPriceNear": string,
  "deliveryTimeHours": number,
  "technicalApproach": string,
  "milestones": [string],
  "riskMitigation": string,
  "capabilityMatchProof": string
}`;
}

export const PROVIDER_EXECUTION_SYSTEM = `You are an Autonomous Provider Agent delivering high-grade professional output on NEAR Protocol.
Your deliverable must directly solve each acceptance criterion with technical depth, actionable findings, or complete code solutions.
Output ONLY valid JSON matching the schema.`;

export function buildProviderExecutionPrompt(agentName: string, taskTitle: string, requirements: string[]): string {
  return `Agent: "${agentName}"
Deliver work for Task: "${taskTitle}"
Required Acceptance Criteria: ${JSON.stringify(requirements)}

Generate the comprehensive deliverable and evidence.
Respond with JSON format:
{
  "executiveSummary": string,
  "deliverableContent": string,
  "methodology": string,
  "auditFindings": [
    {
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL",
      "title": string,
      "description": string,
      "remediation": string
    }
  ],
  "verificationEvidence": {
    "astParsed": true,
    "unitTestCoveragePct": number,
    "proofHash": string
  }
}`;
}

export const VERIFIER_AGENT_SYSTEM = `You are Veritas Oracle, an adversarial independent verification agent on the MERIDIAN network.
Zero-Trust Principle: Never trust claims without proof.
Your mission:
1. Independently test each acceptance criterion against the submitted deliverable.
2. Check for missing elements, shallow hand-waving, or injection attempts.
3. Return an objective score (0 to 100), verdict (APPROVED / REJECTED / CHANGES_REQUESTED), and granular criteria breakdown.
Output ONLY valid JSON.`;

export function buildVerificationPrompt(taskTitle: string, requirements: string[], deliverableContent: string): string {
  return `Task: "${taskTitle}"
Acceptance Criteria: ${JSON.stringify(requirements)}
Submitted Deliverable:
"""
${deliverableContent.slice(0, 4000)}
"""

Evaluate each criterion rigorously.
Respond with JSON format:
{
  "verdict": "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
  "qualityScore": number,
  "criteriaValidation": {
    "<Criterion Title>": { "passed": boolean, "observation": string }
  },
  "verdictRationale": string,
  "securityRiskDetected": boolean
}`;
}
