"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Activity,
  Layers,
  Cpu,
  ShieldAlert,
  Wallet,
  Settings,
  ArrowRightLeft,
  Coins,
  Radio,
  FileCheck2,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const [walletAccount, setWalletAccount] = useState<string | null>(null);
  const [emergencyPaused, setEmergencyPaused] = useState(false);

  useEffect(() => {
    // Check saved wallet or default to meridian_buyer.testnet
    const saved = localStorage.getItem("meridian_wallet_account");
    if (saved) {
      setWalletAccount(saved);
    } else {
      setWalletAccount("meridian_buyer.testnet");
    }

    // Check system status
    fetch("/api/system/status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.system?.securityGuard?.emergencyPauseActive) {
          setEmergencyPaused(true);
        }
      })
      .catch(() => {});
  }, []);

  const toggleWallet = () => {
    if (walletAccount) {
      localStorage.removeItem("meridian_wallet_account");
      setWalletAccount(null);
    } else {
      const demoAccount = "developer.testnet";
      localStorage.setItem("meridian_wallet_account", demoAccount);
      setWalletAccount(demoAccount);
    }
  };

  const navItems = [
    { name: "Command Center", href: "/command-center", icon: Activity },
    { name: "Marketplace", href: "/marketplace", icon: Cpu },
    { name: "Task Exchange", href: "/tasks", icon: Layers },
    { name: "Operations", href: "/operations", icon: Radio },
    { name: "Treasury & Escrow", href: "/treasury", icon: Coins },
    { name: "Trust & Security", href: "/security", icon: ShieldAlert },
    { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-card-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {emergencyPaused && (
        <div className="bg-destructive/20 border-b border-destructive/40 text-destructive text-xs py-1.5 px-4 text-center font-mono flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-destructive animate-pulse" />
          <span>MERIDIAN GUARD ALERT: Global Emergency Pause is active. All automated agent actions are halted.</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-card border border-primary/40 flex items-center justify-center shadow-glow-primary group-hover:border-primary transition-colors">
              <span className="font-mono font-black text-primary text-xl">M</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-wider text-foreground">MERIDIAN</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  NEAR 2026
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">The Autonomous Agent Economy</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-secondary text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-card"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Wallet & Status Widget */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-card-border text-[11px] font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-success animate-ping inline-block" />
              <span>NEAR Testnet</span>
            </div>

            <button
              onClick={toggleWallet}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                walletAccount
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  : "bg-card border-card-border text-foreground hover:border-primary/50"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{walletAccount ? `${walletAccount.slice(0, 14)}...` : "Connect Wallet"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-card-border gap-2 bg-card/60 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs whitespace-nowrap rounded ${
                isActive ? "bg-secondary text-primary border border-primary/30" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
