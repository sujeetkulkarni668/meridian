"use client";

import { useState } from "react";
import { useNearWallet } from "@/lib/near/wallet-context";
import {
  Wallet,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Download,
} from "lucide-react";

export function WalletModal() {
  const {
    isModalOpen,
    setIsModalOpen,
    connectMeteor,
    connectWithWallet,
    connectWithAccountId,
    isMeteorDetected,
    modal,
    accountId,
    isConnected,
  } = useNearWallet();

  const [customAccountId, setCustomAccountId] = useState("");
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const handleMeteorConnect = async () => {
    setConnectingWallet("meteor");
    setErrorMsg(null);
    try {
      await connectMeteor();
    } catch (err: any) {
      console.error("Meteor connect error:", err);
      setErrorMsg(
        err.message ||
          "Could not connect to Meteor Wallet. Please ensure the Meteor extension is unlocked or popups are allowed."
      );
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleWalletSelect = async (walletId: string) => {
    setConnectingWallet(walletId);
    setErrorMsg(null);
    try {
      await connectWithWallet(walletId);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
          `Could not connect to ${walletId}. Please check if the extension is installed or popup was blocked.`
      );
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in-50"
      onClick={() => setIsModalOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-card-border bg-card/95 backdrop-blur-xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">Connect NEAR Wallet</h3>
              <p className="text-xs text-muted-foreground">NEAR Testnet • meridiantest.testnet</p>
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
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* PRIMARY FEATURED: METEOR WALLET */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Featured Wallet
            </span>
            {isMeteorDetected && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
                Extension Ready
              </span>
            )}
          </div>

          <button
            onClick={handleMeteorConnect}
            disabled={connectingWallet !== null}
            className="w-full relative flex items-center justify-between p-4 rounded-xl border-2 border-primary/50 bg-gradient-to-r from-primary/10 via-secondary/40 to-card hover:border-primary hover:from-primary/20 transition-all group text-left shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-xl shadow-md">
                ☄
              </div>
              <div>
                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  <span>Meteor Wallet</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 font-mono font-semibold">
                    RECOMMENDED
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {isMeteorDetected
                    ? "Click to connect your installed Meteor extension"
                    : "Connect via Meteor extension or web popup"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-primary font-semibold">
              <span>{connectingWallet === "meteor" ? "Connecting..." : "Connect"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {!isMeteorDetected && (
            <div className="text-right px-1">
              <a
                href="https://wallet.meteorwallet.app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                <span>Don&apos;t have Meteor? Get it here</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}
        </div>

        {/* OTHER WALLETS */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1">
            Other Wallets
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* MyNearWallet */}
            <button
              onClick={() => handleWalletSelect("my-near-wallet")}
              disabled={connectingWallet !== null}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-card-border bg-secondary/30 hover:bg-secondary/70 hover:border-primary/40 transition-all text-left group"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                N
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                  MyNearWallet
                </div>
                <div className="text-[10px] text-muted-foreground truncate">Web Wallet</div>
              </div>
            </button>

            {/* Sender Wallet */}
            <button
              onClick={() => handleWalletSelect("sender")}
              disabled={connectingWallet !== null}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-card-border bg-secondary/30 hover:bg-secondary/70 hover:border-primary/40 transition-all text-left group"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                S
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                  Sender Wallet
                </div>
                <div className="text-[10px] text-muted-foreground truncate">Extension</div>
              </div>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-card-border/60"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-muted-foreground">
            or instant testnet sandbox
          </span>
          <div className="flex-grow border-t border-card-border/60"></div>
        </div>

        {/* Direct Account ID Connect */}
        <div className="space-y-2.5">
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

        {/* Official Selector Trigger */}
        {modal && (
          <div className="pt-2 border-t border-card-border/60 text-center">
            <button
              onClick={() => {
                setIsModalOpen(false);
                modal.show();
              }}
              className="text-[11px] font-mono text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              Open Official Selector (Hardware / Ledger) →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
