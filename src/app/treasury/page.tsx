import prisma from "@/lib/prisma";
import Link from "next/link";
import { Coins, Lock, CheckCircle, AlertTriangle, ArrowUpRight, ExternalLink, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  const contracts = await (async () => {
    try {
      return await prisma.contractAgreement.findMany({
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
    } catch (err) {
      console.error("TreasuryPage fetch error:", err);
      return [];
    }
  })();

  const lockedNear = contracts
    .filter((c) => c.status === "LOCKED")
    .reduce((acc, c) => acc + parseFloat(c.agreedPriceNear || "0"), 0);

  const releasedNear = contracts
    .filter((c) => c.status === "RELEASED")
    .reduce((acc, c) => acc + parseFloat(c.agreedPriceNear || "0"), 0);

  const contractAddress = process.env.NEAR_CONTRACT_ID || "meridiantest.testnet";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Treasury & Escrow
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20 font-bold">
              NON-CUSTODIAL ESCROW
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Cryptographic escrow balances, native NEAR smart-contract locks, and non-custodial settlement records.
          </p>
        </div>

        <a
          href={`https://testnet.nearblocks.io/address/${contractAddress}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-card-border text-xs font-mono text-primary hover:border-primary/50 transition-colors"
        >
          <span>View Escrow on NearBlocks</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-6 rounded-2xl border border-card-border bg-card/60 shadow-card-dark">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
            <span>Escrow Locked</span>
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-black text-primary">
            {lockedNear.toFixed(2)} <span className="text-sm text-foreground">NEAR</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Active in Smart Contract Escrow
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-card-border bg-card/60 shadow-card-dark">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
            <span>Total Payouts Settled</span>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="mt-3 text-3xl font-black text-success">
            {releasedNear.toFixed(2)} <span className="text-sm text-foreground">NEAR</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Successfully Transferred to Providers
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-card-border bg-card/60 shadow-card-dark">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
            <span>Settlement Contract</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 text-sm font-bold text-foreground truncate">
            {contractAddress}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Network: NEAR Testnet • Zero Gas Leakage
          </div>
        </div>
      </div>

      {/* Escrow Invariant Guarantee Notice */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3 text-xs font-mono text-secondary-foreground">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <span>
          Mathematical Escrow Invariant: <strong className="text-primary">Escrow = Agreed Payout + Buyer Surplus</strong>.
          Upon deliverable approval, the provider receives 100% of the agreed payout with zero deduction, and the surplus
          is atomically refunded back to the buyer in the same transaction receipt execution tree.
        </span>
      </div>

      {/* Escrow Agreements Table */}
      <div className="p-6 rounded-2xl border border-card-border bg-card/40 space-y-4">
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
                <th className="pb-2">Agreed Price</th>
                <th className="pb-2">Escrow Status</th>
                <th className="pb-2">Settlement Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No escrow agreements registered yet. Tasks with accepted bids create smart contract escrow agreements.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="text-foreground">
                    <td className="py-3">
                      <Link href={`/tasks/${c.taskId}`} className="font-bold text-primary hover:underline">
                        #{c.task.taskNumber} {c.task.title.slice(0, 35)}...
                      </Link>
                    </td>
                    <td className="py-3 text-muted-foreground">{c.task.buyerAccountId}</td>
                    <td className="py-3 text-muted-foreground">{c.task.provider?.name || "Assigned Provider"}</td>
                    <td className="py-3 font-bold text-foreground">{c.agreedPriceNear} NEAR</td>
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
                    <td className="py-3">
                      {c.settledTxHash ? (
                        <a
                          href={`https://testnet.nearblocks.io/txns/${c.settledTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-bold"
                        >
                          <span className="truncate max-w-[120px]">{c.settledTxHash}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">In Escrow</span>
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
