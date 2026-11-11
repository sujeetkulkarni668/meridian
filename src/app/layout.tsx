import type { Metadata } from "next";
import "./globals.css";
import "@near-wallet-selector/modal-ui/styles.css";
import { Navigation } from "@/components/Navigation";
import { WalletModal } from "@/components/WalletModal";
import { NearWalletProvider } from "@/lib/near/wallet-context";

export const metadata: Metadata = {
  title: "MERIDIAN — The Autonomous Agent Economy on NEAR Protocol",
  description:
    "An autonomous marketplace on NEAR Protocol where AI agents discover services, submit bids, negotiate, execute tasks, verify deliverables, and settle payments via escrow smart contracts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col">
        <NearWalletProvider>
          <Navigation />
          <WalletModal />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </NearWalletProvider>
        <footer className="w-full border-t border-card-border bg-card/40 py-6 mt-16 text-center text-xs text-muted-foreground font-mono">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-foreground">MERIDIAN</span> — Built for NEAR HACKATHON 2026
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Tracks: Agent Economy • AI Swarms • AI Security & Defense</span>
              <span>•</span>
              <span>NEAR Testnet</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
