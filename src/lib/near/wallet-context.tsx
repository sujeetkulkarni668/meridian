"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { setupWalletSelector, WalletSelector, AccountState } from "@near-wallet-selector/core";
import { setupModal, WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import "@near-wallet-selector/modal-ui/styles.css";

interface NearWalletContextType {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: AccountState[];
  accountId: string | null;
  isConnected: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  signIn: () => void;
  signOut: () => Promise<void>;
  connectWithWallet: (walletId: string) => Promise<void>;
  connectWithAccountId: (accountId: string) => void;
  signAndSendTransaction: (params: {
    receiverId?: string;
    actions: Array<{
      type: "FunctionCall";
      params: {
        methodName: string;
        args: Record<string, any>;
        gas: string;
        deposit: string;
      };
    }>;
  }) => Promise<any>;
}

const NearWalletContext = createContext<NearWalletContextType>({
  selector: null,
  modal: null,
  accounts: [],
  accountId: null,
  isConnected: false,
  isModalOpen: false,
  setIsModalOpen: () => {},
  signIn: () => {},
  signOut: async () => {},
  connectWithWallet: async () => {},
  connectWithAccountId: () => {},
  signAndSendTransaction: async () => {},
});

export function NearWalletProvider({ children }: { children: React.ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [manualAccountId, setManualAccountId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const contractId = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "meridiantest.testnet";
  const networkId = (process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet") as "testnet" | "mainnet";

  // Check URL params for account_id from MyNearWallet redirect or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlAccount = urlParams.get("account_id");
      if (urlAccount) {
        localStorage.setItem("meridian_connected_account", urlAccount);
        setManualAccountId(urlAccount);
        // Clean URL query parameters
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);
      } else {
        const savedAccount = localStorage.getItem("meridian_connected_account");
        if (savedAccount) {
          setManualAccountId(savedAccount);
        }
      }
    }
  }, []);

  useEffect(() => {
    let subscription: any;

    setupWalletSelector({
      network: networkId,
      modules: [
        setupMyNearWallet({
          walletUrl: networkId === "testnet" ? "https://testnet.mynearwallet.com" : "https://app.mynearwallet.com",
        }),
        setupMeteorWallet(),
        setupSender(),
        setupHereWallet(),
      ],
    })
      .then((_selector) => {
        const _modal = setupModal(_selector, {
          contractId,
          theme: "dark",
        });
        const state = _selector.store.getState();
        setAccounts(state.accounts);
        setSelector(_selector);
        setModal(_modal);

        subscription = _selector.store.observable.subscribe((nextState) => {
          setAccounts(nextState.accounts);
          if (nextState.accounts.length > 0) {
            const activeAcc = nextState.accounts.find((a) => a.active) || nextState.accounts[0];
            if (activeAcc?.accountId) {
              localStorage.setItem("meridian_connected_account", activeAcc.accountId);
            }
          }
        });
      })
      .catch((err) => {
        console.error("Failed to initialize NEAR Wallet Selector:", err);
      });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [contractId, networkId]);

  // Determine active account ID
  const selectorActiveAccount = accounts.find((a) => a.active) || accounts[0];
  const accountId = selectorActiveAccount?.accountId || manualAccountId || null;
  const isConnected = !!accountId;

  const signIn = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const signOut = useCallback(async () => {
    if (selector && selector.isSignedIn()) {
      try {
        const wallet = await selector.wallet();
        await wallet.signOut();
      } catch (e) {
        console.warn("Wallet signOut warning:", e);
      }
    }
    setManualAccountId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("meridian_connected_account");
    }
  }, [selector]);

  const connectWithWallet = useCallback(
    async (walletId: string) => {
      if (!selector) {
        throw new Error("Wallet selector not initialized");
      }
      try {
        const wallet = await selector.wallet(walletId);
        await (wallet.signIn as any)({
          contractId,
          methodNames: [],
        });
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(`Failed to connect with ${walletId}:`, err);
        throw err;
      }
    },
    [selector, contractId]
  );

  const connectWithAccountId = useCallback((customId: string) => {
    const cleanId = customId.trim();
    if (!cleanId) return;
    setManualAccountId(cleanId);
    if (typeof window !== "undefined") {
      localStorage.setItem("meridian_connected_account", cleanId);
    }
    setIsModalOpen(false);
  }, []);

  const signAndSendTransaction = useCallback(
    async ({
      receiverId,
      actions,
    }: {
      receiverId?: string;
      actions: Array<{
        type: "FunctionCall";
        params: {
          methodName: string;
          args: Record<string, any>;
          gas: string;
          deposit: string;
        };
      }>;
    }) => {
      if (selector && selector.isSignedIn()) {
        const wallet = await selector.wallet();
        return await wallet.signAndSendTransaction({
          receiverId: receiverId || contractId,
          actions: actions as any,
        });
      }

      // If connected via manual account ID, submit to backend relayer/API
      if (accountId) {
        const action = actions[0]?.params;
        const res = await fetch("/api/tasks/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signerId: accountId,
            receiverId: receiverId || contractId,
            methodName: action?.methodName,
            args: action?.args,
          }),
        });
        return await res.json();
      }

      throw new Error("No wallet connected");
    },
    [selector, contractId, accountId]
  );

  return (
    <NearWalletContext.Provider
      value={{
        selector,
        modal,
        accounts,
        accountId,
        isConnected,
        isModalOpen,
        setIsModalOpen,
        signIn,
        signOut,
        connectWithWallet,
        connectWithAccountId,
        signAndSendTransaction,
      }}
    >
      {children}
    </NearWalletContext.Provider>
  );
}

export function useNearWallet() {
  return useContext(NearWalletContext);
}
