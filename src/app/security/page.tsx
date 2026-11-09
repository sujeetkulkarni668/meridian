"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function SecurityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [togglingPause, setTogglingPause] = useState(false);

  const fetchSecurity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/security");
      const json = await res.json();
      if (json?.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurity();
  }, []);

  const handleToggleEmergencyPause = async () => {
    setTogglingPause(true);
    try {
      const res = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_EMERGENCY_PAUSE" }),
      });
      const json = await res.json();
      if (json.status === "SUCCESS") {
        fetchSecurity();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingPause(false);
    }
  };

  const handleUpdatePolicy = async (agentId: string, isPaused: boolean) => {
    try {
      const res = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_POLICY",
          agentId,
          isPaused,
        }),
      });
      const json = await res.json();
      if (json.status === "SUCCESS") {
        fetchSecurity();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Trust & Security — Meridian Guard
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20">
              TRACK: AI SECURITY & DEFENSE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Deterministic spending limits, prompt injection mitigation, capability whitelisting, and emergency circuit breaker controls.
          </p>
        </div>

        <button
          onClick={fetchSecurity}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-mono text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>Refresh Defenses</span>
        </button>
      </div>

      {/* Emergency Circuit Breaker Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          data?.emergencyPauseActive
            ? "bg-destructive/15 border-destructive/50"
            : "bg-card/70 border-card-border"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                data?.emergencyPauseActive
                  ? "bg-destructive/20 text-destructive border border-destructive/40"
                  : "bg-success/20 text-success border border-success/40"
              }`}
            >
              {data?.emergencyPauseActive ? (
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Global Emergency Circuit Breaker</h2>
                <span
                  className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                    data?.emergencyPauseActive
                      ? "bg-destructive text-white"
                      : "bg-success/20 text-success"
                  }`}
                >
                  {data?.emergencyPauseActive ? "ACTIVE — HALTED" : "SYSTEM OPERATIONAL"}
                </span>
              </div>
              <p className="text-xs text-secondary-foreground mt-1 max-w-xl">
                When activated, Meridian Guard immediately halts all new agent task executions, bid submissions, and
                escrow disbursements across the entire network.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleEmergencyPause}
            disabled={togglingPause}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-lg ${
              data?.emergencyPauseActive
                ? "bg-success text-white hover:bg-success/90 shadow-glow-success"
                : "bg-destructive text-white hover:bg-destructive/90"
            }`}
          >
            {togglingPause
              ? "Toggling..."
              : data?.emergencyPauseActive
              ? "Resume Agent Execution"
              : "Emergency Pause All Agents"}
          </button>
        </div>
      </div>

      {/* Security Guard Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl border border-card-border bg-card/40">
          <div className="text-[10px] uppercase text-muted-foreground">Spending Quotas</div>
          <div className="text-lg font-bold text-foreground mt-1">50 NEAR / Task</div>
          <div className="text-[11px] text-muted-foreground mt-1">Hard budget ceilings strictly enforced</div>
        </div>
        <div className="p-4 rounded-xl border border-card-border bg-card/40">
          <div className="text-[10px] uppercase text-muted-foreground">Prompt Injection Filter</div>
          <div className="text-lg font-bold text-success mt-1">ACTIVE</div>
          <div className="text-[11px] text-muted-foreground mt-1">11 regex defense patterns active</div>
        </div>
        <div className="p-4 rounded-xl border border-card-border bg-card/40">
          <div className="text-[10px] uppercase text-muted-foreground">Idempotency Protection</div>
          <div className="text-lg font-bold text-primary mt-1">5-Min Replay Window</div>
          <div className="text-[11px] text-muted-foreground mt-1">Zero duplicate payout risk</div>
        </div>
        <div className="p-4 rounded-xl border border-card-border bg-card/40">
          <div className="text-[10px] uppercase text-muted-foreground">Key Custody</div>
          <div className="text-lg font-bold text-foreground mt-1">Non-Custodial</div>
          <div className="text-[11px] text-muted-foreground mt-1">Keys never exposed to LLMs</div>
        </div>
      </div>

      {/* Agent Policies Table */}
      <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Registered Agent Security Policies</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-left">
                <th className="pb-2">Agent</th>
                <th className="pb-2">Max Task Budget</th>
                <th className="pb-2">Daily Quota</th>
                <th className="pb-2">Spent Today</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {data?.policies?.map((pol: any) => (
                <tr key={pol.id} className="text-foreground">
                  <td className="py-3">
                    <div className="font-bold">{pol.agent?.name}</div>
                    <div className="text-[10px] text-muted-foreground">{pol.agent?.nearAccountId}</div>
                  </td>
                  <td className="py-3 font-semibold">{pol.maxTaskBudgetNear} NEAR</td>
                  <td className="py-3">{pol.dailySpendLimitNear} NEAR</td>
                  <td className="py-3 text-primary">{pol.currentDaySpentNear} NEAR</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        pol.isPaused
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : "bg-success/10 text-success border-success/30"
                      }`}
                    >
                      {pol.isPaused ? "PAUSED" : "ACTIVE"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleUpdatePolicy(pol.agentId, !pol.isPaused)}
                      className="px-2.5 py-1 rounded bg-secondary text-foreground hover:bg-card border border-card-border"
                    >
                      {pol.isPaused ? "Unpause" : "Pause Agent"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Events Log */}
      <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Security Audit Trail</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-left">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Event</th>
                <th className="pb-2">Severity</th>
                <th className="pb-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {data?.auditEvents?.slice(0, 15).map((evt: any) => (
                <tr key={evt.id} className="text-foreground">
                  <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 font-bold">{evt.actionType}</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] uppercase font-bold ${
                        evt.severity === "CRITICAL"
                          ? "bg-destructive/20 text-destructive"
                          : evt.severity === "WARNING"
                          ? "bg-warning/20 text-warning"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {evt.severity}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground truncate max-w-[320px]">
                    {evt.detailsJson}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
