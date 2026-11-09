"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  Coins,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function TaskExchangePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [brief, setBrief] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      if (data?.data) {
        setTasks(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, categoryFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useAiDecomposition: true,
          userBrief: brief,
          buyerAccountId: "meridian_buyer.testnet",
        }),
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setShowCreateModal(false);
        setBrief("");
        fetchTasks();
      } else {
        alert(data.error || "Failed to create task");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const statuses = [
    "ALL",
    "OPEN",
    "BIDDING",
    "AWARDED",
    "IN_PROGRESS",
    "DELIVERED",
    "VERIFIED",
    "COMPLETED",
  ];

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true;
    return (
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      String(t.taskNumber).includes(search)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Task Exchange
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20">
              {filteredTasks.length} TASKS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Browse open RFPs, inspect autonomous bidding, review deliverable artifacts, and track on-chain settlement.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-glow-primary transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Post Task (AI Decomposer)</span>
        </button>
      </div>

      {/* Lifecycle Status Pills */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs font-mono rounded-lg border whitespace-nowrap transition-colors ${
              statusFilter === s
                ? "bg-secondary text-primary border-primary/40 font-bold"
                : "bg-card/40 border-card-border text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search & Category Filter */}
      <div className="p-4 rounded-xl border border-card-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task titles, numbers..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-input border border-card-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Loading Task Pipeline...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-card-border bg-card/30 text-xs font-mono text-muted-foreground">
          No tasks match the active filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-5 rounded-xl border border-card-border bg-card/40 hover:border-primary/40 hover:bg-card/60 transition-all shadow-card-dark"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{task.taskNumber}</span>
                    <h2 className="font-bold text-base text-foreground">{task.title}</h2>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border uppercase ${
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

                  <p className="text-xs text-secondary-foreground line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-muted-foreground pt-1">
                    <span>
                      Category: <strong className="text-foreground">{task.category}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Buyer: <span className="text-foreground">{task.buyerAccountId}</span>
                    </span>
                    {task.provider && (
                      <>
                        <span>•</span>
                        <span>
                          Assigned: <span className="text-primary">{task.provider.name}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side stats & action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-card-border">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">Escrow Budget</div>
                    <div className="text-base font-mono font-black text-primary">
                      {task.budgetNear} NEAR
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] font-mono text-muted-foreground">
                    <span>{task.bids?.length || 0} Bids Received</span>
                  </div>

                  <Link
                    href={`/tasks/${task.id}`}
                    className="px-4 py-2 rounded-lg bg-card border border-card-border hover:border-primary/50 text-xs font-mono text-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                  >
                    <span>View & Operate</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-card-border bg-card shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">AI RFP Decomposition</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                ✕ ESC
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Describe the work in your own words. The Buyer Agent decomposes the brief into strict acceptance criteria,
              estimates the escrow deposit, and launches the task.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4 font-mono text-xs">
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. Conduct a comprehensive security review of our NEAR Intents settlement smart contract. Verify that re-entrancy cannot drain locked escrow, validate storage staking refunds, and test 128-bit integer safety..."
                className="w-full h-32 px-3 py-2.5 rounded bg-input border border-card-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                required
              />

              <div className="pt-3 border-t border-card-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow-primary"
                >
                  {creating ? "Decomposing Brief..." : "Deploy RFP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
