import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
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
        buyer: true,
        provider: {
          include: {
            capabilities: true,
          },
        },
        bids: {
          include: {
            provider: {
              include: {
                capabilities: true,
              },
            },
          },
          orderBy: {
            compositeScore: "desc",
          },
        },
        contract: true,
        deliverable: true,
        verification: {
          include: {
            verifier: true,
          },
        },
        executionLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
        blockchainTxs: {
          orderBy: {
            timestamp: "desc",
          },
        },
        auditEvents: {
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ status: "ERROR", error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        ...task,
        deadlineEpochMs: task.deadlineEpochMs.toString(),
        blockchainTxs: (task.blockchainTxs || []).map((tx) => ({
          ...tx,
          blockHeight: tx.blockHeight ? tx.blockHeight.toString() : null,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to fetch task" },
      { status: 500 }
    );
  }
}
