import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nearClient } from "@/lib/near/client";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        provider: true,
        contract: true,
        deliverable: true,
      },
    });

    if (!task) {
      return NextResponse.json({ status: "ERROR", error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "DELIVERED" && task.status !== "VERIFIED") {
      return NextResponse.json(
        { status: "ERROR", error: `Cannot approve: Task is not yet delivered or verified (current: ${task.status})` },
        { status: 400 }
      );
    }

    if (!task.providerId || !task.provider) {
      return NextResponse.json({ status: "ERROR", error: "No provider assigned to task" }, { status: 400 });
    }

    // Attempt real NEAR blockchain payout transaction if backend signer is supplied
    let txHash: string | undefined;
    let blockchainSettled = false;

    if (process.env.NEAR_ACCOUNT_ID && process.env.NEAR_PRIVATE_KEY && process.env.NEAR_CONTRACT_ID) {
      const nearResult = await nearClient.callChangeMethod("approve_and_payout", {
        task_id: task.taskNumber,
      });

      if (nearResult.success && nearResult.txHash) {
        txHash = nearResult.txHash;
        blockchainSettled = true;

        // Record real on-chain transaction
        await prisma.blockchainTransaction.create({
          data: {
            taskId: task.id,
            txHash: nearResult.txHash,
            signerId: process.env.NEAR_ACCOUNT_ID,
            receiverId: process.env.NEAR_CONTRACT_ID,
            methodName: "approve_and_payout",
            depositYocto: "0",
            status: "SUCCESS",
            explorerUrl: `https://testnet.nearblocks.io/txns/${nearResult.txHash}`,
          },
        });
      }
    }

    // Update Task Status to COMPLETED
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "COMPLETED" },
    });

    // Update Contract Agreement status
    if (task.contract) {
      await prisma.contractAgreement.update({
        where: { id: task.contract.id },
        data: {
          status: "RELEASED",
          settledTxHash: txHash,
        },
      });
    }

    // Update Provider Reputation and Metrics
    const previousScore = task.provider.reputationScore;
    const newScore = Math.min(100.0, Number((previousScore + 2.4).toFixed(1)));
    const delta = Number((newScore - previousScore).toFixed(1));

    await prisma.agentProfile.update({
      where: { id: task.provider.id },
      data: {
        reputationScore: newScore,
        totalJobsCompleted: { increment: 1 },
        totalEarnedNear: String(
          Number(task.provider.totalEarnedNear || "0") + Number(task.budgetNear)
        ),
      },
    });

    // Record Reputation Update Receipt
    await prisma.reputationRecord.create({
      data: {
        agentId: task.provider.id,
        taskId: task.id,
        previousScore,
        newScore,
        scoreDelta: delta,
        reason: "TASK_SUCCESS",
        proofHash: txHash || `rep_proof_${task.id.slice(0, 8)}`,
      },
    });

    await MeridianGuard.logAudit({
      actionType: "PAYOUT_RELEASED",
      severity: "INFO",
      details: {
        taskId: task.id,
        provider: task.provider.name,
        amountNear: task.budgetNear,
        blockchainSettled,
        txHash,
      },
      taskId: task.id,
    });

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        taskId: task.id,
        taskStatus: "COMPLETED",
        blockchainSettled,
        txHash,
        newReputationScore: newScore,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Deliverable approval failed" },
      { status: 500 }
    );
  }
}
