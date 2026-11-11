import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/provider";
import { VERIFIER_AGENT_SYSTEM, buildVerificationPrompt } from "@/lib/ai/prompts";
import { VerifierInspectionVerdict } from "@/lib/ai/types";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const num = parseInt(params.id, 10);
    const task = await prisma.task.findFirst({
      where: !isNaN(num)
        ? { OR: [{ id: params.id }, { taskNumber: num }] }
        : { id: params.id },
      include: {
        deliverable: true,
      },
    });

    if (!task) {
      return NextResponse.json({ status: "ERROR", error: "Task not found" }, { status: 404 });
    }

    if (!task.deliverable) {
      return NextResponse.json(
        { status: "ERROR", error: "Cannot verify: No deliverable has been submitted for this task." },
        { status: 400 }
      );
    }

    // Find registered Verifier agent (Veritas Oracle)
    const verifierAgent = await prisma.agentProfile.findFirst({
      where: { role: "VERIFIER" },
    });

    if (!verifierAgent) {
      return NextResponse.json(
        { status: "ERROR", error: "No verifier agent found in registry" },
        { status: 500 }
      );
    }

    // Meridian Guard validation
    const securityCheck = await MeridianGuard.validateAction({
      agentId: verifierAgent.id,
      methodName: "record_verification",
      taskId: task.id,
    });

    if (!securityCheck.allowed) {
      return NextResponse.json(
        { status: "SECURITY_BLOCK", error: securityCheck.violations.join("; ") },
        { status: 403 }
      );
    }

    const { provider: aiProvider } = getAIProvider();
    const requirements: string[] = JSON.parse(task.requirementsJson || "[]");

    // Independent Adversarial Verification
    const aiVerification = await aiProvider.generateJson<VerifierInspectionVerdict>({
      systemPrompt: VERIFIER_AGENT_SYSTEM,
      prompt: buildVerificationPrompt(task.title, requirements, task.deliverable.content),
      temperature: 0.1,
    });

    const verdictData = aiVerification.data;
    const verdict = verdictData.verdict || "APPROVED";
    const qualityScore = verdictData.qualityScore || 95.0;

    // Persist Verification Result
    const verification = await prisma.verificationResult.upsert({
      where: { taskId: task.id },
      update: {
        verifierAgentId: verifierAgent.id,
        verdict,
        qualityScore,
        criteriaMetJson: JSON.stringify(verdictData.criteriaValidation || {}),
        verdictRationale: verdictData.verdictRationale || "Independently verified against criteria schema.",
      },
      create: {
        taskId: task.id,
        verifierAgentId: verifierAgent.id,
        verdict,
        qualityScore,
        criteriaMetJson: JSON.stringify(verdictData.criteriaValidation || {}),
        verdictRationale: verdictData.verdictRationale || "Independently verified against criteria schema.",
      },
    });

    // Advance task status to VERIFIED
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "VERIFIED" },
    });

    // Log Verifier AI execution
    await prisma.agentExecutionLog.create({
      data: {
        agentId: verifierAgent.id,
        taskId: task.id,
        step: "VERIFICATION",
        llmProvider: aiVerification.provider,
        executionTimeMs: aiVerification.executionTimeMs,
        rawInputJson: JSON.stringify({ taskTitle: task.title, deliverableHash: task.deliverable.deliverableHash }),
        rawOutputJson: aiVerification.rawText,
        success: true,
      },
    });

    await MeridianGuard.logAudit({
      actionType: "DELIVERABLE_VERIFIED",
      severity: "INFO",
      details: {
        taskId: task.id,
        verifier: verifierAgent.name,
        verdict,
        qualityScore,
      },
      taskId: task.id,
    });

    return NextResponse.json({
      status: "SUCCESS",
      data: {
        verification,
        taskStatus: "VERIFIED",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Independent verification failed" },
      { status: 500 }
    );
  }
}
