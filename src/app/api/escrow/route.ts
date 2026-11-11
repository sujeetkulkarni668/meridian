import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nearClient } from "@/lib/near/client";

export async function GET() {
  try {
    const contracts = await prisma.contractAgreement.findMany({
      include: {
        task: {
          include: {
            provider: true,
            buyer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const blockchainTxs = await prisma.blockchainTransaction.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 50,
    });

    // Calculate aggregated metrics
    let totalEscrowLockedNear = 0;
    let totalSettledNear = 0;

    for (const c of contracts) {
      const amount = parseFloat(c.agreedPriceNear || "0");
      if (c.status === "LOCKED") {
        totalEscrowLockedNear += amount;
      } else if (c.status === "RELEASED") {
        totalSettledNear += amount;
      }
    }

    const safeContracts = contracts.map((c) => ({
      ...c,
      task: c.task
        ? {
            ...c.task,
            deadlineEpochMs: c.task.deadlineEpochMs.toString(),
          }
        : null,
    }));

    const safeTxs = blockchainTxs.map((tx) => ({
      ...tx,
      blockHeight: tx.blockHeight ? tx.blockHeight.toString() : null,
    }));

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        contracts: safeContracts,
        blockchainTxs: safeTxs,
        metrics: {
          totalEscrowLockedNear: totalEscrowLockedNear.toFixed(2),
          totalSettledNear: totalSettledNear.toFixed(2),
          activeEscrowsCount: contracts.filter((c) => c.status === "LOCKED").length,
          settledEscrowsCount: contracts.filter((c) => c.status === "RELEASED").length,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to fetch escrow data" },
      { status: 500 }
    );
  }
}
