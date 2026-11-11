import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { NegotiationEngine, CandidateBid, TaskConstraints } from "@/lib/negotiation/engine";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const isPureNumber = /^\d+$/.test(params.id);
    const num = isPureNumber ? parseInt(params.id, 10) : NaN;
    const task = await prisma.task.findFirst({
      where: isPureNumber
        ? { OR: [{ id: params.id }, { taskNumber: num }] }
        : { id: params.id },
      include: {
        bids: {
          include: {
            provider: {
              include: { capabilities: true },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ status: "ERROR", error: "Task not found" }, { status: 404 });
    }

    if (task.bids.length === 0) {
      return NextResponse.json(
        { status: "ERROR", error: "Cannot negotiate: No bids have been submitted for this task yet." },
        { status: 400 }
      );
    }

    const candidateBids: CandidateBid[] = task.bids.map((b) => ({
      bidId: b.id,
      providerId: b.provider.id,
      providerName: b.provider.name,
      providerReputation: b.provider.reputationScore,
      providerCapabilities: b.provider.capabilities.map((c) => c.name),
      proposedPriceNear: parseFloat(b.proposedPriceNear),
      deliveryTimeHours: b.deliveryTimeHours,
    }));

    const constraints: TaskConstraints = {
      maxBudgetNear: parseFloat(task.budgetNear),
      maxDeliveryHours: 72, // 3 days default limit
      requiredSkills: [task.category],
    };

    const engine = new NegotiationEngine();
    const evaluation = engine.evaluateBids(candidateBids, constraints);

    // Persist scores to each bid in DB
    for (const scored of evaluation.rankedBids) {
      await prisma.bid.update({
        where: { id: scored.bidId },
        data: {
          priceScore: scored.priceScore,
          reputationScore: scored.reputationScore,
          capabilityScore: scored.capabilityScore,
          speedScore: scored.deliveryScore,
          compositeScore: scored.compositeScore,
          scoreRationale: scored.rationale,
          status: scored.eligible ? "SHORTLISTED" : "REJECTED",
        },
      });
    }

    let awardedProviderId: string | null = null;
    let agreedPrice = task.budgetNear;
    let agreedYocto = task.budgetYocto;

    // If an eligible winner is found, award the task
    if (evaluation.selectedBid) {
      const winningBid = task.bids.find((b) => b.id === evaluation.selectedBid!.bidId);
      if (winningBid) {
        awardedProviderId = winningBid.providerId;
        agreedPrice = winningBid.proposedPriceNear;
        agreedYocto = winningBid.proposedPriceYocto;

        await prisma.bid.update({
          where: { id: winningBid.id },
          data: { status: "ACCEPTED" },
        });

        // Update Task to AWARDED (or FUNDED if escrow attached)
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: "AWARDED",
            providerId: awardedProviderId,
            selectedBidId: winningBid.id,
          },
        });

        // Create or update Contract Agreement
        await prisma.contractAgreement.upsert({
          where: { taskId: task.id },
          update: {
            agreedPriceNear: agreedPrice,
            agreedPriceYocto: agreedYocto,
            status: "LOCKED",
            escrowFunded: true,
          },
          create: {
            taskId: task.id,
            agreedPriceNear: agreedPrice,
            agreedPriceYocto: agreedYocto,
            escrowAddress: process.env.NEAR_CONTRACT_ID || "meridian_core.testnet",
            escrowFunded: true,
            status: "LOCKED",
          },
        });
      }
    }

    await MeridianGuard.logAudit({
      actionType: "NEGOTIATION_COMPLETED",
      severity: "INFO",
      details: {
        taskId: task.id,
        bidsCount: task.bids.length,
        selectedBid: evaluation.selectedBid,
        weights: engine.getWeights(),
      },
      taskId: task.id,
    });

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        evaluation,
        awardedProviderId,
        agreedPriceNear: agreedPrice,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Negotiation execution failed" },
      { status: 500 }
    );
  }
}
