"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { setupWalletSelector, WalletSelector, AccountState } from "@near-wallet-selector/core";
import { setupModal, WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import "@near-wallet-selector/modal-ui/styles.css";

interface NearWalletContextType {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: AccountState[];
  accountId: string | null;
  isConnected: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
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
  signIn: () => {},
  signOut: async () => {},
  signAndSendTransaction: async () => {},
});

export function NearWalletProvider({ children }: { children: React.ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<AccountState[]>([]);

  const contractId = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "meridian_core.testnet";
  const networkId = (process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet") as "testnet" | "mainnet";

  useEffect(() => {
    let subscription: any;

    setupWalletSelector({
      network: networkId,
      modules: [setupMyNearWallet()],
    })
      .then((_selector) => {
        const _modal = setupModal(_selector, {
          contractId,
        });
        const state = _selector.store.getState();
        setAccounts(state.accounts);
        setSelector(_selector);
        setModal(_modal);

        subscription = _selector.store.observable.subscribe((nextState) => {
          setAccounts(nextState.accounts);
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

  const activeAccount = accounts.find((a) => a.active) || accounts[0];
  const accountId = activeAccount?.accountId || null;
  const isConnected = !!accountId;

  const signIn = useCallback(() => {
    if (modal) {
      modal.show();
    }
  }, [modal]);

  const signOut = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }, [selector]);

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
      if (!selector) {
        throw new Error("Wallet selector not initialized");
      }
      const wallet = await selector.wallet();
      return await wallet.signAndSendTransaction({
        receiverId: receiverId || contractId,
        actions: actions as any,
      });
    },
    [selector, contractId]
  );

  return (
    <NearWalletContext.Provider
      value={{
        selector,
        modal,
        accounts,
        accountId,
        isConnected,
        signIn,
        signOut,
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
