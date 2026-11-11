if (process.loadEnvFile) process.loadEnvFile();

const { getAIProvider } = require('../src/lib/ai/provider');
const { BUYER_AGENT_SYSTEM, buildBuyerPrompt } = require('../src/lib/ai/prompts');

async function main() {
  console.log("==========================================================================");
  console.log("  MERIDIAN LIVE AI INFERENCE & ORCHESTRATION VERIFICATION");
  console.log("==========================================================================");

  const { provider, isLive } = getAIProvider();
  console.log(`[1/4] Provider Resolution:`);
  console.log(` - Active Provider: ${provider.name}`);
  console.log(` - isLive:          ${isLive}`);
  console.log(` - Provider Class:  ${provider.constructor.name}`);

  if (!isLive || provider.name !== "GEMINI") {
    throw new Error(`Expected live GEMINI provider, got: ${provider.name} (isLive=${isLive})`);
  }

  // 1. Live Text Generation
  console.log(`\n[2/4] Testing Live Text Inference with Gemini...`);
  const textPrompt = "Explain in one clear sentence how autonomous AI agents utilize NEAR Protocol escrow for decentralized service exchange.";
  const textResult = await provider.generateText({
    prompt: textPrompt,
    temperature: 0.2,
  });
  console.log(` - Execution Time: ${textResult.executionTimeMs}ms`);
  console.log(` - Model:          ${textResult.model}`);
  console.log(` - isDemo:         ${textResult.isDemo}`);
  console.log(` - Live Text:      "${textResult.data.trim()}"`);

  if (textResult.isDemo) {
    throw new Error("Text inference returned isDemo=true!");
  }

  // 2. Live JSON Structured Generation (Buyer Agent RFP Decomposition)
  console.log(`\n[3/4] Testing Structured JSON Reasoning (Buyer Agent Decomposition)...`);
  const userBrief = "Perform formal AST analysis and storage deposit accounting verification for our NEAR smart contract.";
  const jsonPrompt = buildBuyerPrompt(userBrief);
  const jsonResult = await provider.generateJson({
    systemPrompt: BUYER_AGENT_SYSTEM,
    prompt: jsonPrompt,
    temperature: 0.2,
  });
  console.log(` - Execution Time: ${jsonResult.executionTimeMs}ms`);
  console.log(` - Model:          ${jsonResult.model}`);
  console.log(` - isDemo:         ${jsonResult.isDemo}`);
  console.log(` - Structured RFP Title:    ${jsonResult.data.title}`);
  console.log(` - Suggested Budget:        ${jsonResult.data.suggestedBudgetNear} NEAR`);
  console.log(` - Acceptance Criteria (${jsonResult.data.acceptanceCriteria?.length || 0}):`);
  jsonResult.data.acceptanceCriteria?.forEach((c, i) => console.log(`   ${i + 1}. ${c}`));

  // 3. Verify Server-Side Secret Protection
  console.log(`\n[4/4] Verifying Server-Side Secret Protection:`);
  const envContent = require('fs').readFileSync('.env', 'utf-8');
  const hasClientKey = envContent.includes('NEXT_PUBLIC_GEMINI_API_KEY');
  console.log(` - NEXT_PUBLIC_GEMINI_API_KEY exposed in .env: ${hasClientKey ? 'YES (UNSAFE)' : 'NO (SAFE)'}`);
  if (hasClientKey) {
    throw new Error("CRITICAL: GEMINI_API_KEY must never be prefixed with NEXT_PUBLIC_");
  }

  console.log(`\n==========================================================================`);
  console.log(`  LIVE GEMINI INFERENCE & AGENT WORKFLOW VERIFIED SUCCESSFULLY!`);
  console.log(`==========================================================================`);
}

main().catch(err => {
  console.error("Live AI Verification Failed:", err);
  process.exit(1);
});
