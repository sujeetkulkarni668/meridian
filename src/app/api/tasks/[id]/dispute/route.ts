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
    const body = await request.json();
    const { reason = "Deliverable did not meet acceptance criteria", resolveRefund = false } = body;

    const isPureNumber = /^\d+$/.test(params.id);
    const num = isPureNumber ? parseInt(params.id, 10) : NaN;
    const task = await prisma.task.findFirst({
      where: isPureNumber
        ? { OR: [{ id: params.id }, { taskNumber: num }] }
        : { id: params.id },
      include: { provider: true, contract: true },
    });

    if (!task) {
      return NextResponse.json({ status: "ERROR", error: "Task not found" }, { status: 404 });
    }

    if (resolveRefund) {
      let refundTxHash: string | undefined;
      let blockchainSettled = false;

      if (process.env.NEAR_ACCOUNT_ID && process.env.NEAR_PRIVATE_KEY && process.env.NEAR_CONTRACT_ID) {
        const nearResult = await nearClient.callChangeMethod("resolve_dispute_and_refund", {
          task_id: task.taskNumber,
        });

        if (nearResult.success && nearResult.txHash) {
          refundTxHash = nearResult.txHash;
          blockchainSettled = true;

          await prisma.blockchainTransaction.create({
            data: {
              taskId: task.id,
              txHash: nearResult.txHash,
              signerId: process.env.NEAR_ACCOUNT_ID,
              receiverId: process.env.NEAR_CONTRACT_ID,
              methodName: "resolve_dispute_and_refund",
              depositYocto: "0",
              status: "SUCCESS",
              explorerUrl: `https://testnet.nearblocks.io/txns/${nearResult.txHash}`,
            },
          });
        }
      }

      // Process Refund in database
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "REFUNDED" },
      });

      if (task.contract) {
        await prisma.contractAgreement.update({
          where: { id: task.contract.id },
          data: {
            status: "REFUNDED",
            settledTxHash: refundTxHash,
          },
        });
      }

      // Penalize provider reputation if dispute was resolved against them
      if (task.provider) {
        const penalized = Math.max(0, Number((task.provider.reputationScore - 5.0).toFixed(1)));
        await prisma.agentProfile.update({
          where: { id: task.provider.id },
          data: { reputationScore: penalized },
        });

        await prisma.reputationRecord.create({
          data: {
            agentId: task.provider.id,
            taskId: task.id,
            previousScore: task.provider.reputationScore,
            newScore: penalized,
            scoreDelta: -5.0,
            reason: "TASK_FAILURE",
          },
        });
      }

      await MeridianGuard.logAudit({
        actionType: "TASK_REFUNDED",
        severity: "WARNING",
        details: { taskId: task.id, reason },
        taskId: task.id,
      });

      return NextResponse.json({
        status: "SUCCESS",
        data: { taskId: task.id, taskStatus: "REFUNDED", reason },
      });
    }

    // Mark as Disputed
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "DISPUTED" },
    });

    if (task.contract) {
      await prisma.contractAgreement.update({
        where: { id: task.contract.id },
        data: { status: "DISPUTED" },
      });
    }

    await MeridianGuard.logAudit({
      actionType: "TASK_DISPUTED",
      severity: "WARNING",
      details: { taskId: task.id, reason },
      taskId: task.id,
    });

    return NextResponse.json({
      status: "SUCCESS",
      data: { taskId: task.id, taskStatus: "DISPUTED", reason },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Dispute action failed" },
      { status: 500 }
    );
  }
}
