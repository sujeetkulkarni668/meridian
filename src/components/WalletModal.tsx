"use client";

import { useState } from "react";
import { useNearWallet } from "@/lib/near/wallet-context";
import {
  Wallet,
  X,
  ExternalLink,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export function WalletModal() {
  const {
    isModalOpen,
    setIsModalOpen,
    connectWithWallet,
    connectWithAccountId,
    modal,
    accountId,
    isConnected,
  } = useNearWallet();

  const [customAccountId, setCustomAccountId] = useState("");
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const handleWalletSelect = async (walletId: string) => {
    setConnectingWallet(walletId);
    setErrorMsg(null);
    try {
      await connectWithWallet(walletId);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || `Could not open ${walletId}. Please check if the extension is installed or popup was blocked.`);
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleCustomConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAccountId.trim()) return;
    connectWithAccountId(customAccountId.trim());
    setCustomAccountId("");
  };

  const presetAccounts = [
    { label: "Contract Owner", id: "meridiantest.testnet" },
    { label: "Buyer Agent", id: "buyer_agent.testnet" },
    { label: "Provider Agent", id: "provider_agent.testnet" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in-50">
      <div
        className="relative w-full max-w-md rounded-2xl border border-card-border bg-card/95 backdrop-blur-xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">Connect NEAR Wallet</h3>
                <p className="text-xs text-muted-foreground">NEAR Testnet • Zero Gas Leakage</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1.5 rounded-lg border border-card-border bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Realtime Wallets */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1">
            Realtime Supported Wallets
          </div>

          {/* MyNearWallet */}
          <button
            onClick={() => handleWalletSelect("my-near-wallet")}
            disabled={connectingWallet !== null}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-card-border bg-secondary/30 hover:bg-secondary/70 hover:border-primary/50 transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                N
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <span>MyNearWallet</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-success/15 text-success border border-success/30 font-mono">
                    RECOMMENDED
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">Official web wallet (testnet.mynearwallet.com)</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Meteor Wallet */}
          <button
            onClick={() => handleWalletSelect("meteor-wallet")}
            disabled={connectingWallet !== null}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-card-border bg-secondary/30 hover:bg-secondary/70 hover:border-primary/50 transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                ☄
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  Meteor Wallet
                </div>
                <div className="text-[11px] text-muted-foreground">Browser extension / injected wallet</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Sender Wallet */}
          <button
            onClick={() => handleWalletSelect("sender")}
            disabled={connectingWallet !== null}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-card-border bg-secondary/30 hover:bg-secondary/70 hover:border-primary/50 transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                S
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  Sender Wallet
                </div>
                <div className="text-[11px] text-muted-foreground">NEAR extension & mobile app</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-card-border/60"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-muted-foreground">
            or instant testnet identity
          </span>
          <div className="flex-grow border-t border-card-border/60"></div>
        </div>

        {/* Direct Account ID Connect */}
        <div className="space-y-3">
          <form onSubmit={handleCustomConnect} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={customAccountId}
                onChange={(e) => setCustomAccountId(e.target.value)}
                placeholder="e.g. yourname.testnet"
                className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-background border border-card-border focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!customAccountId.trim()}
                className="px-4 py-2 text-xs font-mono font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Connect
              </button>
            </div>
          </form>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {presetAccounts.map((p) => (
              <button
                key={p.id}
                onClick={() => connectWithAccountId(p.id)}
                className="px-2.5 py-1 text-[11px] font-mono rounded-lg border border-card-border bg-secondary/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Official Modal Trigger */}
        {modal && (
          <div className="pt-2 border-t border-card-border/60 text-center">
            <button
              onClick={() => {
                setIsModalOpen(false);
                modal.show();
              }}
              className="text-[11px] font-mono text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              Open Official NEAR Wallet Selector Modal (Hardware / Ledger) →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
