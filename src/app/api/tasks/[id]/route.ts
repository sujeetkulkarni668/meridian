import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
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
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to fetch task" },
      { status: 500 }
    );
  }
}
