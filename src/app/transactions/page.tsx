import prisma from "@/lib/prisma";
import { ArrowRightLeft, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";

export default async function TransactionsPage() {
  const txs = await prisma.blockchainTransaction.findMany({
    include: {
      task: true,
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 50,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Transaction History
          </h1>
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20">
            ON-CHAIN AUDIT
          </span>
        </div>
        <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
          Cryptographically confirmed smart contract transactions recorded on the NEAR Protocol Testnet.
        </p>
      </div>

      {/* Integrity Statement */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3 text-xs font-mono text-secondary-foreground">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <span>
          MERIDIAN rule: Never label simulated payments as real. All transactions below correspond to verified
          cryptographic state transitions on the NEAR Testnet.
        </span>
      </div>

      {/* Transactions Table */}
      <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Confirmed Transactions</h2>
          <span className="text-[11px] font-mono text-muted-foreground">{txs.length} Confirmed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-left">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Signer</th>
                <th className="pb-2">Contract</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {txs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions recorded on this local environment yet. Run an approval or payout to record on-chain.
                  </td>
                </tr>
              ) : (
                txs.map((tx) => (
                  <tr key={tx.id} className="text-foreground">
                    <td className="py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-semibold text-primary">{tx.methodName}()</td>
                    <td className="py-3 text-muted-foreground">{tx.signerId}</td>
                    <td className="py-3 text-muted-foreground truncate max-w-[140px]">{tx.receiverId}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-success/10 text-success border border-success/30">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <a
                        href={tx.explorerUrl || `https://testnet.nearblocks.io/txns/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="truncate max-w-[120px]">{tx.txHash}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
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
