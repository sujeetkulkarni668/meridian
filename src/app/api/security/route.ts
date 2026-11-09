import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export async function GET() {
  try {
    const policies = await prisma.securityPolicy.findMany({
      include: {
        agent: true,
      },
    });

    const auditEvents = await prisma.auditEvent.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 100,
    });

    const emergencyPauseActive = process.env.EMERGENCY_PAUSE === "true";

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        policies,
        auditEvents,
        emergencyPauseActive,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to fetch security settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, agentId, maxTaskBudgetNear, dailySpendLimitNear, isPaused } = body;

    if (action === "UPDATE_POLICY" && agentId) {
      const updated = await prisma.securityPolicy.update({
        where: { agentId },
        data: {
          maxTaskBudgetNear: maxTaskBudgetNear !== undefined ? Number(maxTaskBudgetNear) : undefined,
          dailySpendLimitNear: dailySpendLimitNear !== undefined ? Number(dailySpendLimitNear) : undefined,
          isPaused: isPaused !== undefined ? Boolean(isPaused) : undefined,
        },
      });

      await MeridianGuard.logAudit({
        actionType: "SECURITY_POLICY_UPDATED",
        severity: "WARNING",
        details: { agentId, maxTaskBudgetNear, dailySpendLimitNear, isPaused },
      });

      return NextResponse.json({ status: "SUCCESS", data: updated });
    }

    if (action === "TOGGLE_EMERGENCY_PAUSE") {
      const current = process.env.EMERGENCY_PAUSE === "true";
      process.env.EMERGENCY_PAUSE = current ? "false" : "true";

      await MeridianGuard.logAudit({
        actionType: current ? "EMERGENCY_PAUSE_DEACTIVATED" : "EMERGENCY_PAUSE_ACTIVATED",
        severity: "CRITICAL",
        details: { newStatus: !current },
      });

      return NextResponse.json({
        status: "SUCCESS",
        data: { emergencyPauseActive: !current },
      });
    }

    return NextResponse.json({ status: "ERROR", error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to update security settings" },
      { status: 500 }
    );
  }
}
