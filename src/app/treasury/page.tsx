import prisma from "@/lib/prisma";
import Link from "next/link";
import { Coins, Lock, CheckCircle, AlertTriangle, ArrowUpRight, ExternalLink } from "lucide-react";

export default async function TreasuryPage() {
  const contracts = await prisma.contractAgreement.findMany({
    include: {
      task: {
        include: {
          buyer: true,
          provider: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const lockedNear = contracts
    .filter((c) => c.status === "LOCKED")
    .reduce((acc, c) => acc + parseFloat(c.agreedPriceNear || "0"), 0);

  const releasedNear = contracts
    .filter((c) => c.status === "RELEASED")
    .reduce((acc, c) => acc + parseFloat(c.agreedPriceNear || "0"), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Treasury & Escrow
          </h1>
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20">
            NEAR PROTOCOL
          </span>
        </div>
        <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
          Cryptographic escrow balances, native NEAR smart-contract locks, and non-custodial settlement records.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase">
            <span>Escrow Locked</span>
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-bold text-primary">
            {lockedNear.toFixed(2)} <span className="text-sm text-foreground">NEAR</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Active in Smart Contract Escrow
          </div>
        </div>

        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase">
            <span>Total Payouts Settled</span>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="mt-3 text-3xl font-bold text-success">
            {releasedNear.toFixed(2)} <span className="text-sm text-foreground">NEAR</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Successfully Transferred to Providers
          </div>
        </div>

        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase">
            <span>Settlement Contract</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-sm font-bold text-foreground truncate">
            {process.env.NEAR_CONTRACT_ID || "meridian_core.testnet"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Network: NEAR Testnet
          </div>
        </div>
      </div>

      {/* Escrow Agreements Table */}
      <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Active & Settled Escrow Agreements</h2>
          <span className="text-[11px] font-mono text-muted-foreground">{contracts.length} Agreements</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-left">
                <th className="pb-2">Task</th>
                <th className="pb-2">Buyer</th>
                <th className="pb-2">Provider</th>
                <th className="pb-2">Agreed Escrow</th>
                <th className="pb-2">Exact YoctoNEAR</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Settlement Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No escrow agreements established yet.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="text-foreground">
                    <td className="py-3 font-semibold">
                      <Link href={`/tasks/${c.taskId}`} className="hover:text-primary transition-colors">
                        #{c.task.taskNumber} {c.task.title.slice(0, 24)}...
                      </Link>
                    </td>
                    <td className="py-3 text-muted-foreground">{c.task.buyerAccountId}</td>
                    <td className="py-3 text-primary">{c.task.provider?.name || "Unassigned"}</td>
                    <td className="py-3 font-bold">{c.agreedPriceNear} NEAR</td>
                    <td className="py-3 text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                      {c.agreedPriceYocto}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          c.status === "RELEASED"
                            ? "bg-success/10 text-success border-success/30"
                            : c.status === "LOCKED"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary text-muted-foreground border-card-border"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground truncate max-w-[140px]">
                      {c.settledTxHash ? (
                        <a
                          href={`https://testnet.nearblocks.io/txns/${c.settledTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <span>{c.settledTxHash.slice(0, 10)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        c.fundedTxHash ? `${c.fundedTxHash.slice(0, 10)}...` : "PENDING_RELEASE"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
