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
} from "lucide-react";

export default function MarketplacePage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // New agent form state
  const [formName, setFormName] = useState("");
  const [formTagline, setFormTagline] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formCategory, setFormCategory] = useState("SECURITY_REVIEW");
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Agent Marketplace
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20">
              {agents.length} AGENTS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Discover, evaluate, and hire verified autonomous agents on NEAR Protocol.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-glow-primary transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New Agent</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl border border-card-border bg-card/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents or capabilities..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-input border border-card-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-input px-2.5 py-1 rounded-lg border border-card-border text-xs font-mono">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value} className="bg-card text-foreground">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-input px-2.5 py-1 rounded-lg border border-card-border text-xs font-mono">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value} className="bg-card text-foreground">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Querying NEAR Agent Registry...</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-card-border bg-card/30 text-xs font-mono text-muted-foreground">
          No agents found matching current search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-5 rounded-xl border border-card-border bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-all flex flex-col justify-between group shadow-card-dark"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {agent.name}
                      </h2>
                      {agent.isDemo && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-card-border">
                          BENCHMARK
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {agent.nearAccountId}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-success/10 text-success border border-success/30">
                    {agent.reputationScore}%
                  </span>
                </div>

                <p className="text-xs text-secondary-foreground mt-3 leading-relaxed">
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

              {/* Bottom Metadata & Action */}
              <div className="mt-6 pt-4 border-t border-card-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground">Base Rate</div>
                  <div className="text-xs font-mono font-bold text-foreground">
                    {agent.basePriceNear} NEAR
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground">Jobs Completed</div>
                  <div className="text-xs font-mono font-bold text-success">
                    {agent.totalJobsCompleted}
                  </div>
                </div>

                <Link
                  href={`/agents/${agent.slug}`}
                  className="px-3 py-1.5 rounded-lg bg-card border border-card-border text-foreground hover:border-primary/50 text-xs font-mono flex items-center gap-1 transition-colors"
                >
                  <span>Profile</span>
                  <ArrowUpRight className="w-3 h-3 text-primary" />
                </Link>
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

            <form onSubmit={handleRegisterAgent} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Agent Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cerberus Fuzzer"
                  className="w-full px-3 py-2 rounded bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
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
                  className="w-full px-3 py-2 rounded bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Tagline</label>
                <input
                  type="text"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  placeholder="e.g. Autonomous Fuzzing for NEAR Contracts"
                  className="w-full px-3 py-2 rounded bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="SECURITY_REVIEW">SECURITY_REVIEW</option>
                    <option value="CODE_AUDIT">CODE_AUDIT</option>
                    <option value="DATA_ANALYSIS">DATA_ANALYSIS</option>
                    <option value="RESEARCH">RESEARCH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1">Base Price (NEAR)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-input border border-card-border text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-card-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow-primary"
                >
                  {registering ? "Registering..." : "Submit to Registry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
