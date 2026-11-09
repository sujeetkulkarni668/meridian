import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseNearToYocto } from "@/lib/near/units";
import { getAIProvider } from "@/lib/ai/provider";
import { BUYER_AGENT_SYSTEM, buildBuyerPrompt } from "@/lib/ai/prompts";
import { BuyerDecomposedRfp } from "@/lib/ai/types";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        provider: true,
        bids: {
          include: {
            provider: true,
          },
        },
        deliverable: true,
        verification: true,
        contract: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // BigInt serialization fix for JSON
    const safeTasks = tasks.map((t) => ({
      ...t,
      deadlineEpochMs: t.deadlineEpochMs.toString(),
    }));

    return NextResponse.json({ status: "SUCCESS", data: safeTasks });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category = "SECURITY_REVIEW",
      budgetNear = "5.0",
      deadlineDays = 3,
      buyerAccountId = "meridian_buyer.testnet",
      useAiDecomposition = false,
      userBrief,
    } = body;

    let finalTitle = title;
    let finalDescription = description;
    let finalCategory = category;
    let finalBudget = budgetNear;
    let criteria: string[] = [];

    // Buyer Agent Requirement Decomposition
    if (useAiDecomposition && userBrief) {
      // Validate prompt against Meridian Guard injection detector
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

      const { provider } = getAIProvider();
      const aiResult = await provider.generateJson<BuyerDecomposedRfp>({
        systemPrompt: BUYER_AGENT_SYSTEM,
        prompt: buildBuyerPrompt(userBrief),
        temperature: 0.2,
      });

      const decomposed = aiResult.data;
      finalTitle = decomposed.title || finalTitle;
      finalDescription = decomposed.summary || finalDescription;
      finalCategory = decomposed.category || finalCategory;
      finalBudget = decomposed.suggestedBudgetNear || finalBudget;
      criteria = decomposed.acceptanceCriteria || [];
    } else {
      criteria = [
        "Deliver verifiable artifact meeting stated requirements",
        "Pass independent verification score threshold (>= 80/100)",
        "Provide reproducibility documentation and evidence hash",
      ];
    }

    // Get or create buyer user
    let user = await prisma.user.findFirst({
      where: { nearAccountId: buyerAccountId },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { nearAccountId: buyerAccountId, role: "BUYER" },
      });
    }

    const budgetYocto = parseNearToYocto(finalBudget);
    const deadlineMs = Date.now() + Number(deadlineDays) * 86400000;
    const taskCount = await prisma.task.count();

    const task = await prisma.task.create({
      data: {
        taskNumber: 100 + taskCount + 1,
        title: finalTitle,
        description: finalDescription,
        requirementsJson: JSON.stringify(criteria),
        category: finalCategory,
        budgetNear: String(finalBudget),
        budgetYocto,
        deadlineEpochMs: BigInt(deadlineMs),
        buyerId: user.id,
        buyerAccountId,
        status: "OPEN",
        onChainTaskId: String(100 + taskCount + 1),
      },
    });

    await MeridianGuard.logAudit({
      actionType: "TASK_CREATED",
      severity: "INFO",
      details: { taskId: task.id, title: task.title, budgetNear: finalBudget },
      userId: user.id,
      taskId: task.id,
    });

    return NextResponse.json(
      {
        status: "SUCCESS",
        data: {
          ...task,
          deadlineEpochMs: task.deadlineEpochMs.toString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to create task" },
      { status: 500 }
    );
  }
}
