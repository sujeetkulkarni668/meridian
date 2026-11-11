"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useNearWallet } from "@/lib/near/wallet-context";
import {
  Layers,
  ArrowLeft,
  Coins,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  Scale,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  Hash,
  Wallet,
  ArrowRight,
  Radio,
  FileCheck2,
  Lock,
} from "lucide-react";

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { accountId, isConnected, signAndSendTransaction } = useNearWallet();

  const [task, setTask] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Bid submission state
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [useAutonomousBid, setUseAutonomousBid] = useState(true);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const [resTask, resAgents] = await Promise.all([
        fetch(`/api/tasks/${taskId}`).then((r) => r.json()),
        fetch("/api/agents?role=PROVIDER").then((r) => r.json()),
      ]);

      if (resTask?.data) {
        setTask(resTask.data);
      }
      if (resAgents?.data) {
        setAgents(resAgents.data);
        if (resAgents.data.length > 0 && !selectedProviderId) {
          setSelectedProviderId(resAgents.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) fetchTask();
  }, [taskId]);

  // 1. Submit Bid
  const handleSubmitBid = async () => {
    const provId = selectedProviderId || (agents.length > 0 ? agents[0].id : null);
    if (!provId) {
      alert("Please select a provider agent.");
      return;
    }
    const targetId = task?.id || taskId;
    setActionLoading("BID");
    setActionMessage(null);
    try {
      const res = await fetch(`/api/tasks/${targetId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provId,
          useAutonomousAI: useAutonomousBid,
        }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setActionMessage("Bid successfully formulated and submitted by Provider Agent.");
        fetchTask();
      } else {
        alert(data.error || "Failed to submit bid");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Run Negotiation Engine
  const handleNegotiate = async () => {
    const targetId = task?.id || taskId;
    setActionLoading("NEGOTIATE");
    setActionMessage(null);
    try {
      const res = await fetch(`/api/tasks/${targetId}/negotiate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setActionMessage(
          `Negotiation arbitration complete. Task awarded to Provider: ${data.data.awardedProviderId || "Selected"} at ${data.data.agreedPriceNear} NEAR.`
        );
        fetchTask();
      } else {
        alert(data.error || "Negotiation failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Execute Task (Provider Agent)
  const handleExecute = async () => {
    const targetId = task?.id || taskId;
    setActionLoading("EXECUTE");
    setActionMessage(null);
    try {
      const res = await fetch(`/api/tasks/${targetId}/execute`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setActionMessage(`Deliverable generated autonomously. Cryptographic SHA-256: ${data.data.deliverableHash.slice(0, 16)}...`);
        fetchTask();
      } else {
        alert(data.error || "Execution failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Run Independent Verification (Veritas Oracle)
  const handleVerify = async () => {
    const targetId = task?.id || taskId;
    setActionLoading("VERIFY");
    setActionMessage(null);
    try {
      const res = await fetch(`/api/tasks/${targetId}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setActionMessage(`Veritas Oracle verdict: ${data.data.verification.verdict} (Score: ${data.data.verification.qualityScore}/100).`);
        fetchTask();
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Approve & Release Escrow
  const handleApprove = async () => {
    const targetId = task?.id || taskId;
    setActionLoading("APPROVE");
    setActionMessage(null);
    try {
      let clientTxHash: string | null = null;
      if (isConnected && process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID) {
        try {
          const outcome = await signAndSendTransaction({
            receiverId: process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID,
            actions: [
              {
                type: "FunctionCall",
                params: {
                  methodName: "approve_and_payout",
                  args: { task_id: task?.taskNumber || 1 },
                  gas: "200000000000000",
                  deposit: "0",
                },
              },
            ],
          });
          if (outcome?.transaction?.hash) {
            clientTxHash = outcome.transaction.hash;
          }
        } catch (walletErr: any) {
          console.warn("Direct wallet signing deferred to backend settlement:", walletErr);
        }
      }

      const res = await fetch(`/api/tasks/${targetId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        const hashDisplay = clientTxHash || data.data.txHash;
        setActionMessage(
          `Deliverable approved! Native NEAR escrow released to Provider. Reputation increased to ${data.data.newReputationScore}%.` +
            (hashDisplay ? ` Confirmed Tx: ${hashDisplay.slice(0, 16)}...` : "")
        );
        fetchTask();
      } else {
        alert(data.error || "Approval failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 6. Dispute
  const handleDispute = async (resolveRefund: boolean) => {
    const targetId = task?.id || taskId;
    setActionLoading("DISPUTE");
    try {
      const res = await fetch(`/api/tasks/${targetId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolveRefund }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setActionMessage(resolveRefund ? "Dispute resolved: Escrow refunded to Buyer." : "Task marked as disputed.");
        fetchTask();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !task) {
    return (
      <div className="py-24 text-center text-xs font-mono text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        <span>Loading Task Workspace & Telemetry...</span>
      </div>
    );
  }

  const requirements: string[] = JSON.parse(task.requirementsJson || "[]");
  const verification = task.verification;
  const criteriaValidation = verification ? JSON.parse(verification.criteriaMetJson || "{}") : {};

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Task Exchange</span>
        </Link>
      </div>

      {/* Task Header Box */}
      <div className="p-6 sm:p-8 rounded-2xl border border-card-border bg-card/60 shadow-card-dark">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground font-bold">Task #{task.taskNumber}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-secondary text-primary border border-card-border">
                {task.category}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono uppercase font-bold border ${
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">{task.title}</h1>
            <p className="text-xs text-secondary-foreground leading-relaxed">{task.description}</p>
          </div>

          {/* Escrow Budget Card */}
          <div className="p-4 rounded-xl border border-card-border bg-secondary/50 text-left md:text-right min-w-[200px]">
            <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Escrow Commitment</div>
            <div className="text-2xl font-black font-mono text-primary mt-1">{task.budgetNear} NEAR</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate max-w-[180px]">
              Buyer: {task.buyerAccountId}
            </div>
          </div>
        </div>

        {/* Task Lifecycle Progress Pipeline */}
        <div className="mt-8 pt-6 border-t border-card-border">
          <div className="text-[10px] uppercase font-mono text-muted-foreground mb-3 tracking-wider">
            Protocol Lifecycle Progress (7 States)
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center font-mono text-[11px]">
            {[
              { label: "1. OPEN", active: true },
              { label: "2. BIDDING", active: ["BIDDING", "AWARDED", "IN_PROGRESS", "DELIVERED", "VERIFIED", "COMPLETED"].includes(task.status) },
              { label: "3. AWARDED", active: ["AWARDED", "IN_PROGRESS", "DELIVERED", "VERIFIED", "COMPLETED"].includes(task.status) },
              { label: "4. IN PROGRESS", active: ["IN_PROGRESS", "DELIVERED", "VERIFIED", "COMPLETED"].includes(task.status) },
              { label: "5. DELIVERED", active: ["DELIVERED", "VERIFIED", "COMPLETED"].includes(task.status) },
              { label: "6. VERIFIED", active: ["VERIFIED", "COMPLETED"].includes(task.status) },
              { label: "7. COMPLETED", active: task.status === "COMPLETED" },
            ].map((step) => (
              <div
                key={step.label}
                className={`py-2 px-1 rounded-lg border ${
                  step.active
                    ? "bg-primary/10 border-primary/40 text-primary font-bold"
                    : "bg-card/30 border-card-border text-muted-foreground opacity-50"
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-success-subtle border border-success/30 text-xs font-mono text-success flex items-center justify-between shadow-sm">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
      )}

      {/* Multi-Agent Operations Console */}
      <div className="p-6 rounded-2xl border border-card-border bg-gradient-to-r from-card/90 via-card/50 to-card/90 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Multi-Agent Operations Console</h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">Interactive State Transition Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Submit Bid */}
          <div className="p-4 rounded-xl border border-card-border bg-card/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>1. Submit Provider Bid</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Select a provider agent to formulate an autonomous bid.
              </p>

              <div className="mt-3 space-y-2">
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-card">
                      {a.name} ({a.basePriceNear} NEAR)
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAutonomousBid}
                    onChange={(e) => setUseAutonomousBid(e.target.checked)}
                    className="rounded bg-input border-card-border text-primary focus:ring-0"
                  />
                  <span>Autonomous Gemini proposal</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleSubmitBid}
              disabled={actionLoading === "BID" || (task.status !== "OPEN" && task.status !== "BIDDING")}
              className="w-full py-2.5 rounded-lg bg-card border border-card-border hover:border-primary/50 text-xs font-mono text-foreground hover:text-primary transition-all disabled:opacity-40"
            >
              {actionLoading === "BID" ? "Generating Bid..." : "Submit Bid"}
            </button>
          </div>

          {/* Action 2: Run Negotiation Engine */}
          <div className="p-4 rounded-xl border border-card-border bg-card/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-primary" />
                <span>2. Negotiation & Award</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Run deterministic 4-factor scoring across all bids: Price (35%), Rep (30%), Match (20%), Speed (15%).
              </p>
            </div>

            <button
              onClick={handleNegotiate}
              disabled={actionLoading === "NEGOTIATE" || task.bids.length === 0 || ["IN_PROGRESS", "DELIVERED", "VERIFIED", "COMPLETED"].includes(task.status)}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs font-mono hover:bg-primary-hover shadow-glow-primary transition-all disabled:opacity-40"
            >
              {actionLoading === "NEGOTIATE" ? "Evaluating Bids..." : "Run Negotiation Engine"}
            </button>
          </div>

          {/* Action 3: Provider Execution & Verification */}
          <div className="p-4 rounded-xl border border-card-border bg-card/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>3. Execution & Verification</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Trigger provider execution followed by Veritas Oracle zero-trust deliverable verification.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExecute}
                disabled={actionLoading === "EXECUTE" || !["AWARDED", "IN_PROGRESS"].includes(task.status)}
                className="flex-1 py-2.5 rounded-lg bg-card border border-card-border hover:border-primary/50 text-xs font-mono text-foreground hover:text-primary transition-all disabled:opacity-40"
              >
                {actionLoading === "EXECUTE" ? "Executing..." : "Execute Task"}
              </button>

              <button
                onClick={handleVerify}
                disabled={actionLoading === "VERIFY" || task.status !== "DELIVERED"}
                className="flex-1 py-2.5 rounded-lg bg-primary/20 border border-primary/40 hover:bg-primary/30 text-xs font-mono text-primary font-semibold transition-all disabled:opacity-40"
              >
                {actionLoading === "VERIFY" ? "Verifying..." : "Verify Deliverable"}
              </button>
            </div>
          </div>
        </div>

        {/* Action 4: Approval & Dispute Row */}
        <div className="pt-4 border-t border-card-border flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-mono text-muted-foreground">
            Current Stage: <strong className="text-foreground">{task.status}</strong>
            {task.provider && (
              <span>
                {" "}• Assigned Provider: <strong className="text-primary">{task.provider.name}</strong>
              </span>
            )}
            {task.contract && (
              <span>
                {" "}• Locked Escrow: <strong className="text-foreground">{task.contract.agreedPriceNear} NEAR</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDispute(false)}
              disabled={actionLoading === "DISPUTE" || ["COMPLETED", "REFUNDED"].includes(task.status)}
              className="px-3.5 py-2 rounded-xl border border-destructive/40 text-destructive text-xs font-mono hover:bg-destructive/10 disabled:opacity-40"
            >
              Raise Dispute
            </button>

            <button
              onClick={() => handleDispute(true)}
              disabled={actionLoading === "DISPUTE" || ["COMPLETED", "REFUNDED"].includes(task.status)}
              className="px-3.5 py-2 rounded-xl border border-warning/40 text-warning text-xs font-mono hover:bg-warning/10 disabled:opacity-40"
            >
              Refund Escrow
            </button>

            <button
              onClick={handleApprove}
              disabled={actionLoading === "APPROVE" || !["DELIVERED", "VERIFIED"].includes(task.status)}
              className="px-5 py-2.5 rounded-xl bg-success text-white font-bold text-xs font-mono hover:bg-success/90 shadow-glow-success transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{actionLoading === "APPROVE" ? "Releasing Payout..." : "Approve & Settle Payout"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Acceptance Criteria Breakdown */}
      <div className="p-6 rounded-2xl border border-card-border bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Machine-Readable Acceptance Criteria</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">{requirements.length} Criteria</span>
        </div>

        <div className="space-y-2">
          {requirements.map((req, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-card-border bg-card/60 flex items-start gap-3 font-mono text-xs"
            >
              <span className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-secondary-foreground leading-relaxed">{req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Submitted Bids & Negotiation Table */}
      <div className="p-6 rounded-2xl border border-card-border bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Submitted Bids & Negotiation Scoring Breakdown</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">{task.bids.length} Bids</span>
        </div>

        {task.bids.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-muted-foreground">
            No bids submitted yet. Select a provider above to submit the first proposal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground text-left">
                  <th className="pb-2">Provider</th>
                  <th className="pb-2">Price (35%)</th>
                  <th className="pb-2">Rep (30%)</th>
                  <th className="pb-2">Match (20%)</th>
                  <th className="pb-2">Speed (15%)</th>
                  <th className="pb-2">Composite Score</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40">
                {task.bids.map((bid: any) => (
                  <tr key={bid.id} className="text-foreground">
                    <td className="py-3">
                      <div className="font-bold">{bid.provider?.name}</div>
                      <div className="text-[10px] text-muted-foreground">{bid.provider?.nearAccountId}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-bold">{bid.proposedPriceNear} NEAR</div>
                      <div className="text-[10px] text-muted-foreground">Score: {bid.priceScore}</div>
                    </td>
                    <td className="py-3">
                      <div>{bid.provider?.reputationScore}%</div>
                      <div className="text-[10px] text-muted-foreground">Score: {bid.reputationScore}</div>
                    </td>
                    <td className="py-3">
                      <div>Score: {bid.capabilityScore}</div>
                    </td>
                    <td className="py-3">
                      <div>{bid.deliveryTimeHours}h</div>
                      <div className="text-[10px] text-muted-foreground">Score: {bid.speedScore}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-sm font-bold text-primary">{bid.compositeScore}/100</div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          bid.status === "ACCEPTED"
                            ? "bg-success/10 text-success border-success/30"
                            : bid.status === "SHORTLISTED"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary text-muted-foreground border-card-border"
                        }`}
                      >
                        {bid.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deliverable Artifact Preview */}
      {task.deliverable && (
        <div className="p-6 rounded-2xl border border-card-border bg-card/40 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Submitted Deliverable Artifact</h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <Hash className="w-3.5 h-3.5 text-primary" />
              <span>SHA-256: </span>
              <span className="text-foreground font-bold">{task.deliverable.deliverableHash}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-input border border-card-border text-foreground font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
            {task.deliverable.content}
          </div>
        </div>
      )}

      {/* Independent Verification Report */}
      {verification && (
        <div className="p-6 rounded-2xl border border-success/30 bg-card/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" />
              <h2 className="text-sm font-bold text-foreground">Veritas Oracle Independent Verification Report</h2>
            </div>
            <div className="px-3 py-1 rounded-lg bg-success-subtle text-success border border-success/30 text-xs font-mono font-bold">
              VERDICT: {verification.verdict} ({verification.qualityScore}/100)
            </div>
          </div>

          <p className="text-xs text-secondary-foreground font-mono leading-relaxed">
            {verification.verdictRationale}
          </p>

          <div className="space-y-2 pt-2">
            {Object.entries(criteriaValidation).map(([name, data]: [string, any]) => (
              <div
                key={name}
                className="p-3.5 rounded-xl border border-card-border bg-input flex items-start justify-between gap-3 text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-foreground">{name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{data.observation}</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    data.passed ? "text-success bg-success/10 border border-success/30" : "text-destructive bg-destructive/10 border border-destructive/30"
                  }`}
                >
                  {data.passed ? "PASS" : "FAIL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed On-Chain Blockchain Transactions */}
      {task.blockchainTxs && task.blockchainTxs.length > 0 && (
        <div className="p-6 rounded-2xl border border-card-border bg-card/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Confirmed On-Chain Blockchain Transactions</h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{task.blockchainTxs.length} Transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground text-left">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Signer</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Transaction Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40">
                {task.blockchainTxs.map((tx: any) => (
                  <tr key={tx.id} className="text-foreground">
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-bold text-primary">{tx.methodName}()</td>
                    <td className="py-2.5 text-muted-foreground">{tx.signerId}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-success/10 text-success border border-success/30">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <a
                        href={tx.explorerUrl || `https://testnet.nearblocks.io/txns/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-bold"
                      >
                        <span className="truncate max-w-[140px]">{tx.txHash}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
