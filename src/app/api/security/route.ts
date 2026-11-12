import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MeridianGuard } from "@/lib/security/meridian-guard";
import { nearClient } from "@/lib/near/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const emergencyPauseActive = await MeridianGuard.isEmergencyPauseActive();

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
      const current = await MeridianGuard.isEmergencyPauseActive();
      const targetState = !current;
      process.env.EMERGENCY_PAUSE = targetState ? "true" : "false";

      let onChainUpdated = false;
      if (process.env.NEAR_ACCOUNT_ID && process.env.NEAR_PRIVATE_KEY && process.env.NEAR_CONTRACT_ID) {
        try {
          const res = await nearClient.callChangeMethod("set_paused", { paused: targetState });
          onChainUpdated = res.success;
        } catch (e) {
          console.warn("Could not set on-chain paused state:", e);
        }
      }

      await MeridianGuard.logAudit({
        actionType: targetState ? "EMERGENCY_PAUSE_ACTIVATED" : "EMERGENCY_PAUSE_DEACTIVATED",
        severity: "CRITICAL",
        details: { newStatus: targetState, onChainUpdated },
      });

      return NextResponse.json({
        status: "SUCCESS",
        data: { emergencyPauseActive: targetState, onChainUpdated },
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
