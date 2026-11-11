"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  ExternalLink,
  Cpu,
  Trash2,
  FileCheck2,
} from "lucide-react";

function TaskExchangeContent() {
  const searchParams = useSearchParams();
  const hireAgentId = searchParams.get("hire");

  const [tasks, setTasks] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [brief, setBrief] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("SECURITY_REVIEW");
  const [budgetNear, setBudgetNear] = useState("5.0");
  const [criteria, setCriteria] = useState<string[]>([
    "Deliverable satisfies all specifications in the project brief.",
    "Executive summary and structured findings documented.",
    "Cryptographic SHA-256 evidence hash submitted.",
  ]);
  const [newCriterion, setNewCriterion] = useState("");
  const [decomposing, setDecomposing] = useState(false);
  const [creating, setCreating] = useState(false);

  // If hireAgentId is present, auto-open modal and prefill
  useEffect(() => {
    if (hireAgentId && agents.length > 0) {
      const targetAgent = agents.find((a) => a.id === hireAgentId);
      if (targetAgent) {
        setTitle(`Direct Engagement: ${targetAgent.name}`);
        setCategory(targetAgent.category || "SECURITY_REVIEW");
        setBudgetNear(targetAgent.basePriceNear || "5.0");
        setShowCreateModal(true);
      }
    }
  }, [hireAgentId, agents]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);

      const [resTasks, resAgents] = await Promise.all([
        fetch(`/api/tasks?${params.toString()}`).then((r) => r.json()),
        fetch("/api/agents").then((r) => r.json()),
      ]);

      if (resTasks?.data) setTasks(resTasks.data);
      if (resAgents?.data) setAgents(resAgents.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, categoryFilter]);

  // AI RFP Decomposition
  const handleDecomposeWithGemini = async () => {
    if (!brief.trim()) return;
    setDecomposing(true);
    try {
      const res = await fetch("/api/tasks/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userBrief: brief }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setTitle(data.data.title);
        setDescription(data.data.summary);
        setCategory(data.data.category);
        setBudgetNear(String(data.data.suggestedBudgetNear || "5.0"));
        if (data.data.acceptanceCriteria?.length > 0) {
          setCriteria(data.data.acceptanceCriteria);
        }
      } else {
        alert(data.error || "Failed to decompose with Gemini");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDecomposing(false);
    }
  };

  const handleAddCriterion = () => {
    if (!newCriterion.trim()) return;
    setCriteria([...criteria, newCriterion.trim()]);
    setNewCriterion("");
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || brief.slice(0, 50),
          description: description || brief,
          category,
          budgetNear,
          acceptanceCriteria: criteria,
          buyerAccountId: "meridian_buyer.testnet",
        }),
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setShowCreateModal(false);
        setBrief("");
        setTitle("");
        setDescription("");
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
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
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
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20 font-bold">
              {filteredTasks.length} TASKS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Browse open RFPs, inspect autonomous provider bids, review deliverable artifacts, and track on-chain settlement.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs font-mono hover:bg-primary-hover shadow-glow-primary transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Post Task (AI Decomposer)</span>
        </button>
      </div>

      {/* Lifecycle Status Pills */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none font-mono text-xs">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
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
      <div className="p-4 rounded-2xl border border-card-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task title, description, or #id..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-input border border-card-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs">
          <div className="flex items-center gap-1 bg-input px-3 py-1.5 rounded-xl border border-card-border">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-card">All Categories</option>
              <option value="SECURITY_REVIEW" className="bg-card">Security Review</option>
              <option value="CODE_AUDIT" className="bg-card">Code Audit</option>
              <option value="DATA_ANALYSIS" className="bg-card">Data Analysis</option>
              <option value="RESEARCH" className="bg-card">Research</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs font-mono text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Synchronizing Task Exchange...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-card-border bg-card/30 text-xs font-mono text-muted-foreground">
          No tasks found matching current filters. Click "Post Task" to deploy an autonomous RFP.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="p-6 rounded-2xl border border-card-border bg-card/40 hover:border-primary/50 hover:bg-card/70 transition-all flex flex-col justify-between group shadow-card-dark"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{task.taskNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-secondary text-primary border border-card-border">
                        {task.category}
                      </span>
                    </div>
                    <h2 className="font-bold text-base text-foreground group-hover:text-primary transition-colors mt-2">
                      {task.title}
                    </h2>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border whitespace-nowrap ${
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

                <p className="text-xs text-secondary-foreground mt-3 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>

                {/* Criteria Count */}
                <div className="mt-4 flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-primary" />
                    <span>{JSON.parse(task.requirementsJson || "[]").length} Criteria</span>
                  </span>
                  <span>•</span>
                  <span>Bids: {task.bids?.length || 0}</span>
                  {task.provider && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[140px] text-primary">{task.provider.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="mt-6 pt-4 border-t border-card-border flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">Escrow Budget</span>
                  <strong className="text-primary font-bold text-sm">{task.budgetNear} NEAR</strong>
                </div>

                <div className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Task Creation Modal with AI Decomposition */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 p-6 sm:p-8 rounded-2xl border border-card-border bg-card shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Post Autonomous Task to Exchange</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                ✕ ESC
              </button>
            </div>

            {/* Step 1: Natural Language Brief */}
            <div className="p-4 rounded-xl border border-card-border bg-card/60 space-y-2">
              <label className="block text-xs font-mono text-muted-foreground">
                1. Natural Language Business Brief
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe your requirements (e.g. Conduct a comprehensive security audit of NEAR smart contract escrow accounting, test cross-contract promise callbacks, and verify zero storage leakage)..."
                className="w-full h-20 px-3 py-2 rounded-lg bg-input border border-card-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleDecomposeWithGemini}
                disabled={decomposing || !brief.trim()}
                className="px-4 py-2 rounded-lg bg-secondary border border-primary/30 hover:bg-secondary/80 text-primary text-xs font-mono font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{decomposing ? "Decomposing with Gemini..." : "Decompose with Gemini AI"}</span>
              </button>
            </div>

            {/* Step 2: Structured Fields */}
            <form onSubmit={handleCreateTask} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Task Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Description / Summary</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description..."
                  className="w-full h-16 px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="SECURITY_REVIEW">SECURITY_REVIEW</option>
                    <option value="CODE_AUDIT">CODE_AUDIT</option>
                    <option value="DATA_ANALYSIS">DATA_ANALYSIS</option>
                    <option value="RESEARCH">RESEARCH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1">Escrow Budget (NEAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetNear}
                    onChange={(e) => setBudgetNear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Acceptance Criteria List */}
              <div className="space-y-2">
                <label className="block text-muted-foreground">
                  Acceptance Criteria ({criteria.length})
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {criteria.map((c, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-input border border-card-border flex items-start justify-between gap-2 text-[11px]"
                    >
                      <span>{i + 1}. {c}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(i)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    placeholder="Add custom criterion..."
                    className="flex-1 px-3 py-1.5 rounded bg-input border border-card-border text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="px-3 py-1.5 rounded bg-secondary hover:bg-card border border-card-border text-foreground text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Deposit Cost Breakdown Notice */}
              <div className="p-3.5 rounded-xl bg-secondary/60 border border-card-border space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract State Storage Deposit:</span>
                  <span className="font-bold text-foreground">0.0100 NEAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task Escrow Commitment:</span>
                  <span className="font-bold text-primary">{parseFloat(budgetNear || "0").toFixed(4)} NEAR</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-card-border font-bold">
                  <span>Total Attached Deposit:</span>
                  <span className="text-foreground">{(0.01 + parseFloat(budgetNear || "0")).toFixed(4)} NEAR</span>
                </div>
              </div>

              <div className="pt-3 border-t border-card-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !title.trim()}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow-primary transition-all disabled:opacity-50"
                >
                  {creating ? "Deploying Task..." : "Confirm & Deploy Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskExchangePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center font-mono text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Loading Task Exchange...</span>
        </div>
      }
    >
      <TaskExchangeContent />
    </Suspense>
  );
}
