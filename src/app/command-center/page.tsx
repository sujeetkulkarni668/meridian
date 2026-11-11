"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  Layers,
  Coins,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Radio,
  CheckCircle2,
  FileCheck2,
  Clock,
  Send,
  Zap,
} from "lucide-react";

export default function CommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [escrowMetrics, setEscrowMetrics] = useState<any>({});
  const [securityStatus, setSecurityStatus] = useState<any>({});
  const [recentTxs, setRecentTxs] = useState<any[]>([]);

  // RFP Decomposition State
  const [userBrief, setUserBrief] = useState("");
  const [decomposing, setDecomposing] = useState(false);
  const [submittingRfp, setSubmittingRfp] = useState(false);
  const [decomposedRfp, setDecomposedRfp] = useState<any | null>(null);
  const [rfpSuccess, setRfpSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAgents, resTasks, resEscrow, resStatus] = await Promise.all([
        fetch("/api/agents").then((r) => r.json()),
        fetch("/api/tasks").then((r) => r.json()),
        fetch("/api/escrow").then((r) => r.json()),
        fetch("/api/system/status").then((r) => r.json()),
      ]);

      if (resAgents?.data) setAgents(resAgents.data);
      if (resTasks?.data) setTasks(resTasks.data);
      if (resEscrow?.data?.metrics) setEscrowMetrics(resEscrow.data.metrics);
      if (resEscrow?.data?.blockchainTxs) setRecentTxs(resEscrow.data.blockchainTxs);
      if (resStatus?.system) setSecurityStatus(resStatus.system);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Step 1: Decompose natural language brief via Gemini AI
  const handleDecompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userBrief.trim()) return;
    setDecomposing(true);
    setDecomposedRfp(null);
    setRfpSuccess(null);

    try {
      const res = await fetch("/api/tasks/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userBrief }),
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setDecomposedRfp(data.data);
      } else {
        alert(data.error || "Failed to decompose RFP");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDecomposing(false);
    }
  };

  // Step 2: Confirm and publish Task RFP
  const handleConfirmAndDeploy = async () => {
    if (!decomposedRfp) return;
    setSubmittingRfp(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: decomposedRfp.title,
          description: decomposedRfp.summary,
          category: decomposedRfp.category,
          budgetNear: String(decomposedRfp.suggestedBudgetNear || "5.0"),
          buyerAccountId: "meridian_buyer.testnet",
          acceptanceCriteria: decomposedRfp.acceptanceCriteria,
        }),
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setRfpSuccess(`Task #${data.data.taskNumber} deployed: "${data.data.title}"`);
        setUserBrief("");
        setDecomposedRfp(null);
        fetchData();
      } else {
        alert(data.error || "Failed to create task");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingRfp(false);
    }
  };

  const contractAddress = securityStatus?.nearBlockchain?.contractId || "meridiantest.testnet";

  return (
    <div className="space-y-8">
      {/* Header with Live Status Badges */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Command Center
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <span>LIVE TELEMETRY</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Real-time telemetry, autonomous multi-agent coordination, and NEAR Protocol smart-contract escrow state.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Protocol Network Status Card */}
      <div className="p-4 rounded-xl border border-card-border bg-card/40 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span>Network:</span>
            <strong className="text-foreground">{securityStatus?.network?.toUpperCase() || "TESTNET"}</strong>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Contract:</span>
            <a
              href={`https://testnet.nearblocks.io/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <span>{contractAddress}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>AI Inference:</span>
            <span className="text-success font-bold">
              {securityStatus?.aiEngine?.activeProvider || "GEMINI"} (LIVE)
            </span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Block Height:</span>
            <span className="text-foreground font-semibold">
              {securityStatus?.nearBlockchain?.blockHeight || "Syncing"}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase">
            <span>Registered Agents</span>
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-foreground">{agents.length}</div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span>Multi-Agent Swarm Online</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase">
            <span>Marketplace Tasks</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-foreground">{tasks.length}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            <span>
              {tasks.filter((t) => t.status === "COMPLETED").length} Completed •{" "}
              {tasks.filter((t) => t.status === "OPEN" || t.status === "BIDDING").length} Active
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase">
            <span>Escrow Locked</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-primary">
            {escrowMetrics.totalEscrowLockedNear || "0.00"} <span className="text-xs text-foreground">NEAR</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            <span>Settled Payouts: {escrowMetrics.totalSettledNear || "0.00"} NEAR</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase">
            <span>Meridian Guard</span>
            {securityStatus?.securityGuard?.emergencyPauseActive ? (
              <ShieldAlert className="w-4 h-4 text-destructive" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-success" />
            )}
          </div>
          <div className="mt-3 text-lg font-bold font-mono text-foreground">
            {securityStatus?.securityGuard?.emergencyPauseActive ? (
              <span className="text-destructive">CIRCUIT BREAKER</span>
            ) : (
              <span className="text-success">DEFENSES ARMED</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            <span>Quotas Active • Injections Blocked</span>
          </div>
        </div>
      </div>

      {/* Autonomous Buyer RFP Launchpad */}
      <div className="p-6 rounded-2xl border border-card-border bg-gradient-to-r from-card/90 via-card/50 to-card/90 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Autonomous Buyer Agent RFP Launchpad</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Natural Language → Structured RFP</span>
        </div>

        <p className="text-xs text-secondary-foreground leading-relaxed">
          Input an unstructured business brief. The Buyer Agent invokes Google Gemini AI to analyze requirements,
          formulate acceptance criteria, determine an optimal NEAR budget, and structure an on-chain RFP.
        </p>

        <form onSubmit={handleDecompose} className="space-y-3">
          <textarea
            value={userBrief}
            onChange={(e) => setUserBrief(e.target.value)}
            placeholder="e.g. Conduct a comprehensive security audit of NEAR Protocol smart contract escrow accounting, test cross-contract promise callbacks under failure conditions, and verify storage deposit invariants..."
            className="w-full h-24 px-4 py-3 rounded-xl bg-input border border-card-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-primary font-mono"
            required
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground font-mono">
              Inference Engine: <span className="text-primary font-bold">Google Gemini API</span> (Cloud Inference)
            </div>

            <button
              type="submit"
              disabled={decomposing || !userBrief.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-glow-primary transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{decomposing ? "Analyzing with Gemini..." : "Decompose RFP with Gemini AI"}</span>
            </button>
          </div>
        </form>

        {/* Decomposed Proposal Preview Card */}
        {decomposedRfp && (
          <div className="mt-4 p-5 rounded-xl border border-primary/40 bg-card/80 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold">
                {decomposedRfp.category}
              </span>
              <span className="text-muted-foreground text-[11px]">
                Inference Latency: {decomposedRfp.executionTimeMs}ms
              </span>
            </div>

            <h3 className="font-bold text-foreground text-sm">{decomposedRfp.title}</h3>
            <p className="text-secondary-foreground text-xs leading-relaxed">{decomposedRfp.summary}</p>

            <div className="space-y-1 pt-2">
              <div className="text-[11px] text-muted-foreground uppercase font-bold">
                Generated Acceptance Criteria ({decomposedRfp.acceptanceCriteria?.length || 0}):
              </div>
              {decomposedRfp.acceptanceCriteria?.map((crit: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-secondary-foreground text-[11px]">
                  <span className="text-primary font-bold">{idx + 1}.</span>
                  <span>{crit}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-card-border flex items-center justify-between">
              <div>
                <span className="text-muted-foreground">Estimated Budget: </span>
                <strong className="text-primary font-bold text-sm">
                  {decomposedRfp.suggestedBudgetNear} NEAR
                </strong>
                <span className="text-[10px] text-muted-foreground"> (+0.01 NEAR state storage deposit)</span>
              </div>

              <button
                onClick={handleConfirmAndDeploy}
                disabled={submittingRfp}
                className="px-4 py-2 rounded-lg bg-success text-white font-bold text-xs hover:bg-success/90 shadow-glow-success transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submittingRfp ? "Publishing Task..." : "Confirm & Deploy Task to Marketplace"}</span>
              </button>
            </div>
          </div>
        )}

        {rfpSuccess && (
          <div className="p-3.5 rounded-xl bg-success-subtle border border-success/30 text-xs font-mono text-success flex items-center justify-between">
            <span>{rfpSuccess}</span>
            <Link href="/tasks" className="underline hover:text-foreground font-bold">
              Open Task Workspace →
            </Link>
          </div>
        )}
      </div>

      {/* Task Exchange Feed & Agent Swarm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Active Task Pipeline</h2>
            <Link href="/tasks" className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
              <span>View All Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-muted-foreground border border-card-border rounded-xl">
                No active tasks found. Use the RFP Launchpad above to open the first task.
              </div>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block p-4 rounded-xl border border-card-border bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{task.taskNumber}</span>
                        <h3 className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                          {task.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border uppercase whitespace-nowrap font-bold ${
                        task.status === "COMPLETED"
                          ? "bg-success/10 text-success border-success/30"
                          : task.status === "VERIFIED"
                          ? "bg-primary/10 text-primary border-primary/30"
                          : task.status === "DELIVERED"
                          ? "bg-warning/10 text-warning border-warning/30"
                          : "bg-secondary text-secondary-foreground border-card-border"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-card-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span>
                        Budget: <strong className="text-foreground">{task.budgetNear} NEAR</strong>
                      </span>
                      <span>•</span>
                      <span>Bids: {task.bids?.length || 0}</span>
                      {task.provider && (
                        <>
                          <span>•</span>
                          <span>Provider: <strong className="text-primary">{task.provider.name}</strong></span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <span>Inspect Workspace</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Specialized Agent Swarm */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Specialized Swarm</h2>
            <Link href="/marketplace" className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
              <span>Directory</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {agents.slice(0, 5).map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.slug}`}
                className="block p-3.5 rounded-xl border border-card-border bg-card/30 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-foreground">{agent.name}</div>
                  <span className="text-[10px] font-mono text-success font-bold">{agent.reputationScore}% REP</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{agent.tagline}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{agent.role}</span>
                  <span className="text-foreground font-bold">{agent.basePriceNear} NEAR</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
