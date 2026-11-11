"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useNearWallet } from "@/lib/near/wallet-context";
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
  LogOut,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const { accountId, isConnected, signIn, signOut, activeWalletType } = useNearWallet();
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/system/status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.system?.securityGuard?.emergencyPauseActive) {
          setEmergencyPaused(true);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const primaryNav = [
    { name: "Command Center", href: "/command-center", icon: Activity },
    { name: "Marketplace", href: "/marketplace", icon: Cpu },
    { name: "Tasks", href: "/tasks", icon: Layers },
    { name: "Escrow", href: "/treasury", icon: Coins },
  ];

  const secondaryNav = [
    {
      name: "Operations",
      href: "/operations",
      icon: Radio,
      desc: "Live agent telemetry, token latency & traces",
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: ArrowRightLeft,
      desc: "NEAR on-chain smart contract audit ledger",
    },
    {
      name: "Security & Guard",
      href: "/security",
      icon: ShieldAlert,
      desc: "Sybil protection, guard policies & pause controls",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      desc: "RPC nodes, Gemini model config & system diagnostics",
    },
  ];

  const isSecondaryActive = secondaryNav.some((item) => pathname === item.href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-card-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      {emergencyPaused && (
        <div className="bg-destructive/15 border-b border-destructive/30 text-destructive text-xs py-1 px-4 text-center font-mono flex items-center justify-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span>MERIDIAN GUARD: Global Emergency Pause is active.</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-card border border-primary/40 flex items-center justify-center shadow-sm group-hover:border-primary transition-all">
              <span className="font-mono font-black text-primary text-base">M</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-wide text-foreground font-mono">MERIDIAN</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                TESTNET
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Dropdown for Secondary Navigation */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isSecondaryActive || dropdownOpen
                    ? "bg-secondary text-primary border border-card-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/70"
                }`}
              >
                <span>System</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl border border-card-border bg-card/95 backdrop-blur-xl shadow-2xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase text-muted-foreground tracking-wider border-b border-card-border/60 mb-1">
                    System Telemetry & Controls
                  </div>
                  {secondaryNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-start gap-3 px-3 py-2 text-xs transition-colors rounded-lg mx-1 ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <div className="p-1 rounded bg-secondary/80 text-primary mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* On-Chain Explorer Pill */}
            <a
              href="https://testnet.nearblocks.io/address/meridiantest.testnet"
              target="_blank"
              rel="noreferrer"
              title="View Meridian Contract on NearBlocks Explorer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/80 border border-card-border hover:border-primary/40 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
              <span>NEAR 2026</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>

            {/* Wallet Button */}
            {isConnected ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border bg-primary/10 border-primary/30 text-primary">
                  {activeWalletType === "meteor" ? (
                    <span className="text-amber-400 font-bold text-xs" title="Connected with Meteor Wallet">☄</span>
                  ) : (
                    <Wallet className="w-3 h-3 shrink-0" />
                  )}
                  <span className="font-semibold text-xs truncate max-w-[110px] sm:max-w-[150px]">
                    {accountId}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  title="Disconnect NEAR Wallet"
                  className="p-1.5 rounded-lg border border-card-border bg-card/80 hover:bg-destructive/10 hover:border-destructive/40 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-card-border bg-card/80 text-muted-foreground hover:text-foreground"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Clean Collapsible Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-card-border bg-card/95 backdrop-blur-xl px-4 py-3 space-y-3 animate-in slide-in-from-top-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider px-2">
            Main Views
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider px-2 pt-2 border-t border-card-border/60">
            System & Governance
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-card-border/60 flex items-center justify-between text-xs font-mono text-muted-foreground px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              NEAR Testnet
            </span>
            <a
              href="https://testnet.nearblocks.io/address/meridiantest.testnet"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <span>Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
