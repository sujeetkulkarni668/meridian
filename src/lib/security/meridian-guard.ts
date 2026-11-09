import prisma from "../prisma";

export interface SecurityPolicyCheckResult {
  allowed: boolean;
  action: string;
  violations: string[];
  requiresHumanApproval: boolean;
  sanitizedInput?: string;
}

export interface SecurityAuditEntry {
  actionType: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  details: Record<string, any>;
  userId?: string;
  taskId?: string;
}

export class MeridianGuard {
  // Common prompt injection attack patterns targeting LLMs
  private static INJECTION_PATTERNS = [
    /ignore (all )?previous instructions/i,
    /disregard (all )?prior guidelines/i,
    /system override/i,
    /transfer (all )?(funds|near|tokens)/i,
    /send (all )?near to/i,
    /private key/i,
    /reveal (your )?secret/i,
    /you are now a rogue/i,
    /bypass security/i,
    /drop database/i,
    /eval\s*\(/i,
  ];

  /**
   * Validates whether an action is permitted under the agent's active security policy.
   */
  static async validateAction(params: {
    agentId: string;
    methodName: string;
    requestedBudgetNear?: number;
    rawInput?: string;
    taskId?: string;
  }): Promise<SecurityPolicyCheckResult> {
    const violations: string[] = [];
    let requiresHumanApproval = false;

    // 1. Global emergency circuit breaker check
    const emergencyPause = process.env.EMERGENCY_PAUSE === "true";
    if (emergencyPause) {
      await this.logAudit({
        actionType: "CIRCUIT_BREAKER_BLOCKED",
        severity: "CRITICAL",
        details: { reason: "Global EMERGENCY_PAUSE is active.", agentId: params.agentId },
        taskId: params.taskId,
      });
      return {
        allowed: false,
        action: params.methodName,
        violations: ["EMERGENCY_PAUSE_ACTIVE: Global circuit breaker has paused all agent executions."],
        requiresHumanApproval: true,
      };
    }

    // 2. Fetch Agent Security Policy
    const policy = await prisma.securityPolicy.findUnique({
      where: { agentId: params.agentId },
      include: { agent: true },
    });

    if (!policy) {
      // Safe default if no policy exists: reject and require human configuration
      return {
        allowed: false,
        action: params.methodName,
        violations: ["NO_SECURITY_POLICY: Agent has no registered Meridian Guard policy."],
        requiresHumanApproval: true,
      };
    }

    if (policy.isPaused) {
      violations.push(`AGENT_PAUSED: Agent '${policy.agent.name}' is paused by administrator.`);
    }

    // 3. Method allowlist verification
    const allowedMethods: string[] = JSON.parse(policy.allowedMethodsJson || "[]");
    if (!allowedMethods.includes(params.methodName)) {
      violations.push(
        `METHOD_DISALLOWED: Method '${params.methodName}' is not in allowed capability whitelist: [${allowedMethods.join(", ")}].`
      );
    }

    // 4. Budget & Spending Limit validation
    if (params.requestedBudgetNear !== undefined) {
      if (params.requestedBudgetNear > policy.maxTaskBudgetNear) {
        violations.push(
          `BUDGET_EXCEEDED: Requested task budget ${params.requestedBudgetNear} NEAR exceeds agent max task cap of ${policy.maxTaskBudgetNear} NEAR.`
        );
      }

      if (policy.currentDaySpentNear + params.requestedBudgetNear > policy.dailySpendLimitNear) {
        violations.push(
          `DAILY_LIMIT_EXCEEDED: Transaction of ${params.requestedBudgetNear} NEAR would exceed daily spend quota (${policy.currentDaySpentNear}/${policy.dailySpendLimitNear} NEAR).`
        );
      }
    }

    // 5. Prompt injection inspection
    let sanitized = params.rawInput;
    if (params.rawInput) {
      for (const pattern of this.INJECTION_PATTERNS) {
        if (pattern.test(params.rawInput)) {
          violations.push(`PROMPT_INJECTION_DETECTED: Suspicious instruction pattern matched '${pattern.source}'.`);
          await this.logAudit({
            actionType: "INJECTION_ATTEMPT_DETECTED",
            severity: "CRITICAL",
            details: {
              pattern: pattern.source,
              agentId: params.agentId,
              sample: params.rawInput.slice(0, 200),
            },
            taskId: params.taskId,
          });
          break;
        }
      }

      // Neutralize markdown or script tag exploits
      sanitized = params.rawInput
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[REMOVED_SCRIPT]")
        .replace(/javascript:/gi, "blocked:");
    }

    if (policy.requiresHumanConfirm) {
      requiresHumanApproval = true;
    }

    const allowed = violations.length === 0;

    // Log security check outcome
    await this.logAudit({
      actionType: allowed ? "SECURITY_CHECK_PASSED" : "SECURITY_CHECK_BLOCKED",
      severity: allowed ? "INFO" : "WARNING",
      details: {
        agentId: params.agentId,
        method: params.methodName,
        violations,
        budget: params.requestedBudgetNear,
      },
      taskId: params.taskId,
    });

    return {
      allowed,
      action: params.methodName,
      violations,
      requiresHumanApproval,
      sanitizedInput: sanitized,
    };
  }

  /**
   * Records spend against an agent's daily limit.
   */
  static async recordSpend(agentId: string, amountNear: number): Promise<void> {
    await prisma.securityPolicy.update({
      where: { agentId },
      data: {
        currentDaySpentNear: {
          increment: amountNear,
        },
      },
    });
  }

  /**
   * Idempotency Check: Prevents double-execution of identical actions within a 5-minute window.
   */
  static async checkIdempotency(actionKey: string): Promise<boolean> {
    const existing = await prisma.auditEvent.findFirst({
      where: {
        actionType: `IDEMPOTENT_${actionKey}`,
        timestamp: {
          gte: new Date(Date.now() - 300000), // 5 minutes
        },
      },
    });

    if (existing) {
      return false; // Replay detected
    }

    await prisma.auditEvent.create({
      data: {
        actionType: `IDEMPOTENT_${actionKey}`,
        severity: "INFO",
        detailsJson: JSON.stringify({ key: actionKey, registeredAt: new Date().toISOString() }),
      },
    });

    return true; // Safe to proceed
  }

  /**
   * Writes an immutable audit entry to the database.
   */
  static async logAudit(entry: SecurityAuditEntry): Promise<void> {
    try {
      await prisma.auditEvent.create({
        data: {
          actionType: entry.actionType,
          severity: entry.severity,
          detailsJson: JSON.stringify(entry.details),
          userId: entry.userId,
          taskId: entry.taskId,
        },
      });
    } catch (e) {
      console.error("Failed to write security audit log:", e);
    }
  }
}
