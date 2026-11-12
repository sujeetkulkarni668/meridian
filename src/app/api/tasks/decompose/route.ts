import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { BUYER_AGENT_SYSTEM, buildBuyerPrompt } from "@/lib/ai/prompts";
import { BuyerDecomposedRfp } from "@/lib/ai/types";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userBrief } = body;

    if (!userBrief || typeof userBrief !== "string" || userBrief.trim().length < 5) {
      return NextResponse.json(
        { status: "ERROR", error: "Please provide a descriptive business brief (minimum 5 characters)." },
        { status: 400 }
      );
    }

    // Security check against prompt injection
    const securityCheck = await MeridianGuard.validateAction({
      agentId: "meridian-procurement",
      methodName: "decompose_rfp",
      rawInput: userBrief,
    });

    if (!securityCheck.allowed) {
      return NextResponse.json(
        { status: "SECURITY_BLOCK", error: securityCheck.violations.join("; ") },
        { status: 403 }
      );
    }

    const { provider, isLive } = getAIProvider();
    const aiResult = await provider.generateJson<BuyerDecomposedRfp>({
      systemPrompt: BUYER_AGENT_SYSTEM,
      prompt: buildBuyerPrompt(userBrief),
      temperature: 0.2,
    });

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        title: aiResult.data.title || "Autonomous Task RFP",
        summary: aiResult.data.summary || userBrief,
        category: aiResult.data.category || "SECURITY_REVIEW",
        suggestedBudgetNear: aiResult.data.suggestedBudgetNear || "5.0",
        acceptanceCriteria: aiResult.data.acceptanceCriteria || [
          "Deliverable satisfies all specifications in the project brief.",
          "Clear executive summary and methodology documentation provided.",
          "Verifiable evidence and reproducible test artifacts included.",
        ],
        inferenceModel: aiResult.model,
        executionTimeMs: aiResult.executionTimeMs,
        isLiveInference: isLive,
      },
    });
  } catch (err: any) {
    console.error("AI RFP Decomposition error:", err);
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to decompose requirements with AI" },
      { status: 500 }
    );
  }
}
