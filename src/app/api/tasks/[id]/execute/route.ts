import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/provider";
import { PROVIDER_EXECUTION_SYSTEM, buildProviderExecutionPrompt } from "@/lib/ai/prompts";
import { ProviderDeliverablePayload } from "@/lib/ai/types";
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
      },
    });

    if (!task) {
      return NextResponse.json({ status: "ERROR", error: "Task not found" }, { status: 404 });
    }

    if (!task.providerId || !task.provider) {
      return NextResponse.json(
        { status: "ERROR", error: "Cannot execute: No provider has been awarded to this task." },
        { status: 400 }
      );
    }

    // Meridian Guard check
    const securityCheck = await MeridianGuard.validateAction({
      agentId: task.provider.id,
      methodName: "submit_deliverable",
      taskId: task.id,
    });

    if (!securityCheck.allowed) {
      return NextResponse.json(
        { status: "SECURITY_BLOCK", error: securityCheck.violations.join("; ") },
        { status: 403 }
      );
    }

    // Update status to IN_PROGRESS
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "IN_PROGRESS" },
    });

    const { provider: aiProvider } = getAIProvider();
    const requirements: string[] = JSON.parse(task.requirementsJson || "[]");

    // Autonomous Provider Agent Execution
    const aiExecution = await aiProvider.generateJson<ProviderDeliverablePayload>({
      systemPrompt: PROVIDER_EXECUTION_SYSTEM,
      prompt: buildProviderExecutionPrompt(task.provider.name, task.title, requirements),
      temperature: 0.2,
      maxTokens: 3000,
    });

    const payload = aiExecution.data;
    const content = payload.deliverableContent || `# Deliverable for ${task.title}\n\n${payload.executiveSummary}`;

    // Cryptographic SHA-256 integrity hash of deliverable
    const deliverableHash = crypto.createHash("sha256").update(content, "utf8").digest("hex");

    // Upsert deliverable record
    const deliverable = await prisma.deliverable.upsert({
      where: { taskId: task.id },
      update: {
        content,
        deliverableHash,
        metadataJson: JSON.stringify({
          methodology: payload.methodology,
          findings: payload.auditFindings,
          evidence: payload.verificationEvidence,
        }),
      },
      create: {
        taskId: task.id,
        content,
        deliverableHash,
        metadataJson: JSON.stringify({
          methodology: payload.methodology,
          findings: payload.auditFindings,
          evidence: payload.verificationEvidence,
        }),
      },
    });

    // Advance task status to DELIVERED
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "DELIVERED" },
    });

    // Log execution
    await prisma.agentExecutionLog.create({
      data: {
        agentId: task.provider.id,
        taskId: task.id,
        step: "EXECUTION",
        llmProvider: aiExecution.provider,
        executionTimeMs: aiExecution.executionTimeMs,
        rawInputJson: JSON.stringify({ title: task.title, requirements }),
        rawOutputJson: aiExecution.rawText,
        success: true,
      },
    });

    await MeridianGuard.logAudit({
      actionType: "DELIVERABLE_SUBMITTED",
      severity: "INFO",
      details: {
        taskId: task.id,
        provider: task.provider.name,
        deliverableHash,
      },
      taskId: task.id,
    });

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        deliverable,
        deliverableHash,
        taskStatus: "DELIVERED",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Autonomous task execution failed" },
      { status: 500 }
    );
  }
}
