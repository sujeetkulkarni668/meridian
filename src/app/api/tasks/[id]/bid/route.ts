import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseNearToYocto } from "@/lib/near/units";
import { getAIProvider } from "@/lib/ai/provider";
import { PROVIDER_AGENT_SYSTEM, buildProviderBidPrompt } from "@/lib/ai/prompts";
import { ProviderBidProposal } from "@/lib/ai/types";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      providerId,
      proposedPriceNear,
      deliveryTimeHours,
      proposalPitch,
      useAutonomousAI = false,
    } = body;

    const num = parseInt(params.id, 10);
    const task = await prisma.task.findFirst({
      where: !isNaN(num)
        ? { OR: [{ id: params.id }, { taskNumber: num }] }
        : { id: params.id },
      include: { buyer: true },
    });

    if (!task) {
      return NextResponse.json({ status: "ERROR", error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "OPEN" && task.status !== "BIDDING") {
      return NextResponse.json(
        { status: "ERROR", error: `Task is not accepting bids (current status: ${task.status})` },
        { status: 400 }
      );
    }

    const provider = await prisma.agentProfile.findUnique({
      where: { id: providerId },
      include: { capabilities: true, securityPolicy: true },
    });

    if (!provider) {
      return NextResponse.json({ status: "ERROR", error: "Provider agent not found" }, { status: 404 });
    }

    // Meridian Guard: check provider permissions
    const securityCheck = await MeridianGuard.validateAction({
      agentId: provider.id,
      methodName: "submit_bid",
      taskId: task.id,
    });

    if (!securityCheck.allowed) {
      return NextResponse.json(
        { status: "SECURITY_BLOCK", error: securityCheck.violations.join("; ") },
        { status: 403 }
      );
    }

    let finalPrice = proposedPriceNear || provider.basePriceNear;
    let finalHours = deliveryTimeHours || 24;
    let finalPitch = proposalPitch || `Autonomous proposal from ${provider.name}`;

    // Autonomous AI Bid Proposal
    if (useAutonomousAI) {
      const { provider: aiProvider } = getAIProvider();
      const capabilitiesList = provider.capabilities.map((c) => c.name);
      const requirements: string[] = JSON.parse(task.requirementsJson || "[]");

      const aiBid = await aiProvider.generateJson<ProviderBidProposal>({
        systemPrompt: PROVIDER_AGENT_SYSTEM,
        prompt: buildProviderBidPrompt(
          provider.name,
          capabilitiesList,
          task.title,
          task.description,
          requirements,
          task.budgetNear
        ),
        temperature: 0.3,
      });

      if (aiBid.data) {
        finalPrice = aiBid.data.proposedPriceNear || finalPrice;
        finalHours = aiBid.data.deliveryTimeHours || finalHours;
        finalPitch = `${aiBid.data.technicalApproach} Milestones: ${aiBid.data.milestones?.join(" -> ")}`;
      }

      // Log agent AI execution
      await prisma.agentExecutionLog.create({
        data: {
          agentId: provider.id,
          taskId: task.id,
          step: "BIDDING",
          llmProvider: aiBid.provider,
          executionTimeMs: aiBid.executionTimeMs,
          rawInputJson: JSON.stringify({ taskTitle: task.title, maxBudget: task.budgetNear }),
          rawOutputJson: aiBid.rawText,
          success: true,
        },
      });
    }

    // Convert price to integer yoctoNEAR
    const priceYocto = parseNearToYocto(String(finalPrice));

    const bid = await prisma.bid.create({
      data: {
        taskId: task.id,
        providerId: provider.id,
        proposedPriceNear: String(finalPrice),
        proposedPriceYocto: priceYocto,
        deliveryTimeHours: Number(finalHours),
        proposalPitch: finalPitch,
        status: "SUBMITTED",
      },
    });

    // Advance task status to BIDDING if OPEN
    if (task.status === "OPEN") {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "BIDDING" },
      });
    }

    await MeridianGuard.logAudit({
      actionType: "BID_SUBMITTED",
      severity: "INFO",
      details: { bidId: bid.id, provider: provider.name, priceNear: finalPrice },
      taskId: task.id,
    });

    return NextResponse.json({ status: "SUCCESS", data: bid }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to submit bid" },
      { status: 500 }
    );
  }
}
