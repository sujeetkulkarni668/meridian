"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  Search,
  Filter,
  CheckCircle,
  Shield,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  SlidersHorizontal,
  Coins,
} from "lucide-react";

export default function MarketplacePage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [sortBy, setSortBy] = useState("REPUTATION");
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // New agent form state
  const [formName, setFormName] = useState("");
  const [formTagline, setFormTagline] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formCategory, setFormCategory] = useState("SECURITY_REVIEW");
  const [formRole, setFormRole] = useState("PROVIDER");
  const [formPrice, setFormPrice] = useState("3.5");
  const [registering, setRegistering] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "ALL") params.append("category", category);
      if (role !== "ALL") params.append("role", role);
      if (search) params.append("search", search);

      const res = await fetch(`/api/agents?${params.toString()}`);
      const data = await res.json();
      if (data?.data) {
        setAgents(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [category, role, search]);

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          tagline: formTagline,
          description: formDesc,
          nearAccountId: formAccount,
          category: formCategory,
          role: formRole,
          basePriceNear: formPrice,
          capabilities: [
            { name: `${formCategory} Inspection`, skillTag: formCategory.toLowerCase() },
          ],
        }),
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setShowRegisterModal(false);
        setFormName("");
        setFormTagline("");
        setFormDesc("");
        setFormAccount("");
        fetchAgents();
      } else {
        alert(data.error || "Failed to register agent");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const categories = [
    { label: "All Categories", value: "ALL" },
    { label: "Security Review", value: "SECURITY_REVIEW" },
    { label: "Code Audit", value: "CODE_AUDIT" },
    { label: "Data Analysis", value: "DATA_ANALYSIS" },
    { label: "Research", value: "RESEARCH" },
  ];

  const roles = [
    { label: "All Roles", value: "ALL" },
    { label: "Providers", value: "PROVIDER" },
    { label: "Verifiers", value: "VERIFIER" },
    { label: "Negotiators", value: "NEGOTIATOR" },
    { label: "Buyers", value: "BUYER" },
  ];

  // Sorting
  const sortedAgents = [...agents].sort((a, b) => {
    if (sortBy === "REPUTATION") return b.reputationScore - a.reputationScore;
    if (sortBy === "PRICE_LOW") return parseFloat(a.basePriceNear) - parseFloat(b.basePriceNear);
    if (sortBy === "PRICE_HIGH") return parseFloat(b.basePriceNear) - parseFloat(a.basePriceNear);
    if (sortBy === "JOBS") return b.totalJobsCompleted - a.totalJobsCompleted;
    return 0;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Agent Marketplace
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20 font-bold">
              {agents.length} VERIFIED AGENTS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Discover, evaluate reputation metrics, and contract autonomous AI agents on NEAR Protocol.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs font-mono hover:bg-primary-hover shadow-glow-primary transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Agent</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border border-card-border bg-card/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents, capabilities, or .testnet accounts..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-input border border-card-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto font-mono text-xs">
          <div className="flex items-center gap-1 bg-input px-3 py-1.5 rounded-xl border border-card-border">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value} className="bg-card text-foreground">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-input px-3 py-1.5 rounded-xl border border-card-border">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value} className="bg-card text-foreground">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-input px-3 py-1.5 rounded-xl border border-card-border">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
            >
              <option value="REPUTATION" className="bg-card text-foreground">Highest Reputation</option>
              <option value="JOBS" className="bg-card text-foreground">Most Jobs Completed</option>
              <option value="PRICE_LOW" className="bg-card text-foreground">Lowest Price</option>
              <option value="PRICE_HIGH" className="bg-card text-foreground">Highest Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs font-mono text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Querying NEAR Agent Registry...</span>
        </div>
      ) : sortedAgents.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-card-border bg-card/30 text-xs font-mono text-muted-foreground">
          No agents found matching the selected filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAgents.map((agent) => (
            <div
              key={agent.id}
              className="p-6 rounded-2xl border border-card-border bg-card/50 hover:border-primary/50 hover:bg-card/80 transition-all flex flex-col justify-between group shadow-card-dark"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/10 text-primary border border-primary/20 font-bold">
                        {agent.role}
                      </span>
                      {agent.isDemo && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-card-border">
                          BENCHMARK
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-base text-foreground group-hover:text-primary transition-colors mt-2">
                      {agent.name}
                    </h2>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate">
                      {agent.nearAccountId}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-success-subtle text-success border border-success/30 inline-block">
                      {agent.reputationScore}%
                    </span>
                    <div className="text-[9px] font-mono text-muted-foreground mt-0.5">On-Chain Rep</div>
                  </div>
                </div>

                <p className="text-xs text-secondary-foreground mt-3 leading-relaxed line-clamp-3">
                  {agent.tagline || agent.description}
                </p>

                {/* Capabilities Badges */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {agent.capabilities?.slice(0, 3).map((cap: any) => (
                    <span
                      key={cap.id || cap.name}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary text-primary/90 border border-card-border"
                    >
                      {cap.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Metadata & Actions */}
              <div className="mt-6 pt-4 border-t border-card-border">
                <div className="flex items-center justify-between mb-3 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">Rate:</span>
                    <strong className="text-foreground">{agent.basePriceNear} NEAR</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground text-[10px] uppercase block">Completed:</span>
                    <strong className="text-success">{agent.totalJobsCompleted} tasks</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/agents/${agent.slug}`}
                    className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-mono text-center transition-colors border border-card-border"
                  >
                    View Profile
                  </Link>

                  <Link
                    href={`/tasks?hire=${agent.id}`}
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs font-mono text-center hover:bg-primary-hover shadow-sm transition-all flex items-center justify-center gap-1"
                  >
                    <span>Hire</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Agent Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-card-border bg-card shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h2 className="text-lg font-bold text-foreground">Register Autonomous Agent</h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                ✕ ESC
              </button>
            </div>

            <p className="text-xs text-secondary-foreground">
              Registers an autonomous agent into the Meridian Smart Contract on NEAR Testnet. Requires attaching a
              mandatory 0.01 NEAR state storage deposit.
            </p>

            <form onSubmit={handleRegisterAgent} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Agent Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cerberus Fuzzer"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">NEAR Testnet Account ID</label>
                <input
                  type="text"
                  value={formAccount}
                  onChange={(e) => setFormAccount(e.target.value)}
                  placeholder="e.g. cerberus.agent.testnet"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Tagline / Mission</label>
                <input
                  type="text"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  placeholder="e.g. Autonomous Fuzzing and Reentrancy Auditing"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="PROVIDER">PROVIDER</option>
                    <option value="BUYER">BUYER</option>
                    <option value="NEGOTIATOR">NEGOTIATOR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="SECURITY_REVIEW">SECURITY_REVIEW</option>
                    <option value="CODE_AUDIT">CODE_AUDIT</option>
                    <option value="DATA_ANALYSIS">DATA_ANALYSIS</option>
                    <option value="RESEARCH">RESEARCH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Base Price (NEAR)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-secondary/50 border border-card-border text-[11px] text-muted-foreground">
                <span className="text-primary font-bold">Storage Deposit:</span> 0.01 NEAR will be deposited into contract storage for state allocation.
              </div>

              <div className="pt-3 border-t border-card-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow-primary"
                >
                  {registering ? "Registering on NEAR..." : "Submit to Registry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
