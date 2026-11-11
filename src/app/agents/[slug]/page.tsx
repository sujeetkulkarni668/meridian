import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Coins,
  Activity,
  ArrowLeft,
  Lock,
  Flame,
  ArrowRight,
  ExternalLink,
  Award,
  Zap,
} from "lucide-react";

export default async function AgentProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const agent = await prisma.agentProfile.findUnique({
    where: { slug: params.slug },
    include: {
      capabilities: true,
      securityPolicy: true,
      tasksAssigned: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      bidsSubmitted: {
        include: { task: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      reputationLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      executionLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!agent) {
    notFound();
  }

  const policy = agent.securityPolicy;
  const allowedMethods = policy ? JSON.parse(policy.allowedMethodsJson || "[]") : [];

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Agent Marketplace</span>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="p-6 sm:p-8 rounded-2xl border border-card-border bg-card/60 shadow-card-dark relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{agent.name}</h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20 font-bold uppercase">
                {agent.role}
              </span>
              {agent.isDemo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-muted-foreground border border-card-border">
                  BENCHMARK
                </span>
              )}
            </div>

            <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span>NEAR Identity:</span>
              <a
                href={`https://testnet.nearblocks.io/address/${agent.nearAccountId}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <span>{agent.nearAccountId}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs sm:text-sm text-secondary-foreground leading-relaxed pt-1">
              {agent.description}
            </p>
          </div>

          {/* Reputation Badge & Hire Action */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-3 shrink-0 min-w-[180px]">
            <div className="p-4 rounded-xl border border-success/30 bg-success-subtle text-center">
              <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Reputation Score</div>
              <div className="text-4xl font-black font-mono text-success mt-1">{agent.reputationScore}%</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">Verified On-Chain</div>
            </div>

            <Link
              href={`/tasks?hire=${agent.id}`}
              className="py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs font-mono text-center hover:bg-primary-hover shadow-glow-primary transition-all flex items-center justify-center gap-1.5"
            >
              <span>Hire This Agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-8 pt-6 border-t border-card-border grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div>
            <div className="text-muted-foreground uppercase text-[10px]">Category</div>
            <div className="text-foreground font-bold mt-1">{agent.category}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase text-[10px]">Base Pricing</div>
            <div className="text-primary font-bold mt-1">{agent.basePriceNear} NEAR</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase text-[10px]">Jobs Completed</div>
            <div className="text-success font-bold mt-1">{agent.totalJobsCompleted}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase text-[10px]">Total Settled</div>
            <div className="text-foreground font-bold mt-1">{agent.totalEarnedNear} NEAR</div>
          </div>
        </div>
      </div>

      {/* 2-Column: Capabilities & Security Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capabilities */}
        <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">Verified Capabilities</h2>
          </div>

          <div className="space-y-3">
            {agent.capabilities.length === 0 ? (
              <div className="py-4 text-xs font-mono text-muted-foreground">No specific capabilities cataloged.</div>
            ) : (
              agent.capabilities.map((cap) => (
                <div
                  key={cap.id}
                  className="p-3.5 rounded-lg border border-card-border bg-card/60 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-xs text-foreground">{cap.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{cap.description}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-primary border border-card-border shrink-0">
                    #{cap.skillTag}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Meridian Guard Security Policy */}
        <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">Meridian Guard Security Policy</h2>
          </div>

          {policy ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
                <span className="text-muted-foreground">Single Task Budget Cap</span>
                <span className="font-bold text-foreground">{policy.maxTaskBudgetNear} NEAR</span>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
                <span className="text-muted-foreground">Daily Spend Quota</span>
                <span className="font-bold text-primary">
                  {policy.currentDaySpentNear} / {policy.dailySpendLimitNear} NEAR
                </span>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-card-border">
                <div className="text-muted-foreground mb-1.5">Authorized Smart Contract Methods</div>
                <div className="flex flex-wrap gap-1">
                  {allowedMethods.map((m: string) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded text-[10px] bg-secondary text-foreground border border-card-border"
                    >
                      {m}()
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
                <span className="text-muted-foreground">Circuit Breaker Status</span>
                <span className={policy.isPaused ? "text-destructive font-bold" : "text-success font-bold"}>
                  {policy.isPaused ? "PAUSED" : "ACTIVE / PERMITTED"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-muted-foreground">Standard protocol policy active.</div>
          )}
        </div>
      </div>

      {/* Assigned Tasks / Contract History */}
      {agent.tasksAssigned.length > 0 && (
        <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-foreground">Recent Executed Tasks</h2>
            <span className="text-xs font-mono text-muted-foreground">{agent.tasksAssigned.length} Tasks</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground text-left">
                  <th className="pb-2">Task</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Budget</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40">
                {agent.tasksAssigned.map((t) => (
                  <tr key={t.id} className="text-foreground">
                    <td className="py-3 font-semibold">#{t.taskNumber} {t.title}</td>
                    <td className="py-3 text-muted-foreground">{t.category}</td>
                    <td className="py-3 font-bold text-primary">{t.budgetNear} NEAR</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link href={`/tasks/${t.id}`} className="text-primary hover:underline flex items-center gap-1">
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reputation Audit Trail */}
      <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm text-foreground">Verifiable Reputation History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-left">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Reason</th>
                <th className="pb-2">Score Delta</th>
                <th className="pb-2">New Reputation</th>
                <th className="pb-2">Proof Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {agent.reputationLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    No reputation events recorded yet.
                  </td>
                </tr>
              ) : (
                agent.reputationLogs.map((log) => (
                  <tr key={log.id} className="text-foreground">
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">{log.reason}</td>
                    <td className={`py-2.5 font-bold ${log.scoreDelta >= 0 ? "text-success" : "text-destructive"}`}>
                      {log.scoreDelta >= 0 ? `+${log.scoreDelta}` : log.scoreDelta}
                    </td>
                    <td className="py-2.5 font-bold">{log.newScore}%</td>
                    <td className="py-2.5 text-muted-foreground truncate max-w-[150px]">
                      {log.proofHash || "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
