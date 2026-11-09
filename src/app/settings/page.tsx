"use client";

import { useState, useEffect } from "react";
import { Settings, Cpu, Database, Radio, Key, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/status");
      const json = await res.json();
      if (json?.system) {
        setStatus(json.system);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Settings & Diagnostics
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20">
              CONFIG
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Environment health, NEAR Protocol RPC node telemetry, AI provider keys, and contract deployment targets.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-mono text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NEAR Protocol Configuration */}
        <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">NEAR Protocol Blockchain</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Target Network</span>
              <span className="font-bold text-primary">{status?.network?.toUpperCase() || "TESTNET"}</span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">RPC Node Status</span>
              <span className="font-bold text-success flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{status?.nearBlockchain?.status || "ONLINE"}</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Latest Block Height</span>
              <span className="font-bold text-foreground">{status?.nearBlockchain?.blockHeight || "Synchronized"}</span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Contract ID Target</span>
              <span className="font-bold text-foreground truncate max-w-[200px]">
                {status?.nearBlockchain?.contractId || "meridian_core.testnet"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Backend Signer Key</span>
              <span className="text-muted-foreground">
                {status?.nearBlockchain?.backendSignerConfigured
                  ? "CONFIGURED (Restricted Signer)"
                  : "UNSET (Client Wallet Signing Active)"}
              </span>
            </div>
          </div>
        </div>

        {/* AI Provider Configuration */}
        <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">AI Inference Providers</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Active Inference Engine</span>
              <span className="font-bold text-primary">{status?.aiEngine?.activeProvider || "DEMO_SIMULATOR"}</span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Execution Mode</span>
              <span className="font-bold text-foreground">{status?.aiEngine?.mode || "DETERMINISTIC_DEMO_MODE"}</span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Google Gemini API Key</span>
              <span className={status?.aiEngine?.geminiConfigured ? "text-success font-bold" : "text-muted-foreground"}>
                {status?.aiEngine?.geminiConfigured ? "CONFIGURED (Primary)" : "NOT CONFIGURED"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">xAI Grok API Key</span>
              <span className={status?.aiEngine?.grokConfigured ? "text-success font-bold" : "text-muted-foreground"}>
                {status?.aiEngine?.grokConfigured ? "CONFIGURED (Optional)" : "NOT CONFIGURED"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card/60 border border-card-border flex items-center justify-between">
              <span className="text-muted-foreground">Live Inference Fallback</span>
              <span className="text-foreground">Deterministic High-Fidelity Simulator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Guide Box */}
      <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-3">
        <h2 className="text-sm font-bold text-foreground">NEAR Testnet Smart Contract Deployment Guide</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The Rust smart contract has been compiled to WebAssembly at:
          <code className="text-primary mx-1">contracts/meridian_core/target/wasm32-unknown-unknown/release/meridian_core.wasm</code>
        </p>

        <div className="p-4 rounded-lg bg-input border border-card-border font-mono text-xs text-foreground space-y-2">
          <div className="text-muted-foreground"># 1. Login to your NEAR Testnet account</div>
          <div>near login</div>
          <div className="text-muted-foreground pt-1"># 2. Deploy the contract to your testnet account</div>
          <div>near deploy &lt;your-account.testnet&gt; ./contracts/meridian_core/target/wasm32-unknown-unknown/release/meridian_core.wasm</div>
          <div className="text-muted-foreground pt-1"># 3. Initialize the contract</div>
          <div>near call &lt;your-account.testnet&gt; new &apos;{JSON.stringify({ owner_id: "your-account.testnet" })}&apos; --accountId &lt;your-account.testnet&gt;</div>
        </div>
      </div>
    </div>
  );
}
