import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowRightLeft, ExternalLink, ShieldCheck, CheckCircle2, Radio, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const txs = await (async () => {
    try {
      return await prisma.blockchainTransaction.findMany({
        include: {
          task: true,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 50,
      });
    } catch (err) {
      console.error("TransactionsPage fetch error:", err);
      return [];
    }
  })();

  const contractAddress = process.env.NEAR_CONTRACT_ID || "meridiantest.testnet";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Transaction History
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20 font-bold">
              ON-CHAIN AUDIT TRAIL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
            Cryptographically confirmed smart contract state transitions recorded on the NEAR Protocol Testnet.
          </p>
        </div>

        <a
          href={`https://testnet.nearblocks.io/address/${contractAddress}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-card-border text-xs font-mono text-primary hover:border-primary/50 transition-colors"
        >
          <span>Contract on Explorer</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Integrity Statement */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3 text-xs font-mono text-secondary-foreground">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <span>
          MERIDIAN rule: All transactions below correspond to verified cryptographic state transitions on the NEAR Testnet.
          Providers receive 100% of agreed payouts with zero gas leakage; buyer surpluses are automatically refunded.
        </span>
      </div>

      {/* Transactions Table */}
      <div className="p-6 rounded-2xl border border-card-border bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Confirmed Blockchain Transactions</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">{txs.length} Confirmed Transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-left">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Signer</th>
                <th className="pb-2">Contract Target</th>
                <th className="pb-2">Associated Task</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {txs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No transactions recorded on this local environment yet. Execute an approval or settlement in the Task Exchange to record on-chain.
                  </td>
                </tr>
              ) : (
                txs.map((tx) => (
                  <tr key={tx.id} className="text-foreground">
                    <td className="py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-bold text-primary">{tx.methodName}()</td>
                    <td className="py-3 text-muted-foreground">{tx.signerId}</td>
                    <td className="py-3 text-muted-foreground truncate max-w-[140px]">{tx.receiverId}</td>
                    <td className="py-3">
                      {tx.task ? (
                        <Link href={`/tasks/${tx.task.id}`} className="text-primary hover:underline font-bold">
                          #{tx.task.taskNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
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
                        className="text-primary hover:underline flex items-center gap-1 font-bold"
                      >
                        <span className="truncate max-w-[140px]">{tx.txHash}</span>
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
