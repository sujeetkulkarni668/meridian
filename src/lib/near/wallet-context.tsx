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
  isMeteorDetected: boolean;
  activeWalletType: string | null;
  setIsModalOpen: (open: boolean) => void;
  signIn: () => void;
  signOut: () => Promise<void>;
  connectMeteor: () => Promise<void>;
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
  isMeteorDetected: false,
  activeWalletType: null,
  setIsModalOpen: () => {},
  signIn: () => {},
  signOut: async () => {},
  connectMeteor: async () => {},
  connectWithWallet: async () => {},
  connectWithAccountId: () => {},
  signAndSendTransaction: async () => {},
});

export function NearWalletProvider({ children }: { children: React.ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [manualAccountId, setManualAccountId] = useState<string | null>(null);
  const [activeWalletType, setActiveWalletType] = useState<string | null>(null);
  const [isMeteorDetected, setIsMeteorDetected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const contractId = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "meridiantest.testnet";
  const networkId = (process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet") as "testnet" | "mainnet";

  // Check if Meteor Extension is present in window
  useEffect(() => {
    if (typeof window !== "undefined") {
      const detectMeteor = () => {
        const mw = (window as any).meteorWallet;
        if (mw) {
          setIsMeteorDetected(true);
          // If already signed in to Meteor in the browser, auto-hydrate account
          if (mw.isSignedIn && mw.isSignedIn()) {
            const acc = mw.getAccountId();
            if (acc) {
              setManualAccountId(acc);
              setActiveWalletType("meteor");
              localStorage.setItem("meridian_connected_account", acc);
              localStorage.setItem("meridian_wallet_type", "meteor");
            }
          }
        }
      };

      detectMeteor();
      const t1 = setTimeout(detectMeteor, 300);
      const t2 = setTimeout(detectMeteor, 1000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, []);

  // Check URL params from MyNearWallet redirect or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlAccount = urlParams.get("account_id");
      if (urlAccount) {
        localStorage.setItem("meridian_connected_account", urlAccount);
        localStorage.setItem("meridian_wallet_type", "mynearwallet");
        setManualAccountId(urlAccount);
        setActiveWalletType("mynearwallet");
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);
      } else {
        const savedAccount = localStorage.getItem("meridian_connected_account");
        const savedType = localStorage.getItem("meridian_wallet_type");
        if (savedAccount) {
          setManualAccountId(savedAccount);
          setActiveWalletType(savedType || "meteor");
        }
      }
    }
  }, []);

  useEffect(() => {
    let subscription: any;

    setupWalletSelector({
      network: networkId,
      modules: [
        setupMeteorWallet(),
        setupMyNearWallet({
          walletUrl: networkId === "testnet" ? "https://testnet.mynearwallet.com" : "https://app.mynearwallet.com",
        }),
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
              setManualAccountId(activeAcc.accountId);
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

  const selectorActiveAccount = accounts.find((a) => a.active) || accounts[0];
  const accountId = selectorActiveAccount?.accountId || manualAccountId || null;
  const isConnected = !!accountId;

  const signIn = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const signOut = useCallback(async () => {
    // 1. Sign out from window.meteorWallet if present
    if (typeof window !== "undefined" && (window as any).meteorWallet?.isSignedIn()) {
      try {
        await (window as any).meteorWallet.signOut();
      } catch (e) {
        console.warn("Meteor signOut warning:", e);
      }
    }

    // 2. Sign out from NEAR wallet selector
    if (selector && selector.isSignedIn()) {
      try {
        const wallet = await selector.wallet();
        await wallet.signOut();
      } catch (e) {
        console.warn("Wallet signOut warning:", e);
      }
    }

    setManualAccountId(null);
    setActiveWalletType(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("meridian_connected_account");
      localStorage.removeItem("meridian_wallet_type");
    }
  }, [selector]);

  // Connect specifically via Meteor Wallet
  const connectMeteor = useCallback(async () => {
    // Option A: If Meteor Wallet is directly injected into window
    if (typeof window !== "undefined" && (window as any).meteorWallet) {
      const mw = (window as any).meteorWallet;
      try {
        // If already signed in, grab account
        if (mw.isSignedIn && mw.isSignedIn()) {
          const acc = mw.getAccountId();
          if (acc) {
            setManualAccountId(acc);
            setActiveWalletType("meteor");
            localStorage.setItem("meridian_connected_account", acc);
            localStorage.setItem("meridian_wallet_type", "meteor");
            setIsModalOpen(false);
            return;
          }
        }

        // Trigger sign-in popup from extension
        const res = await mw.requestSignIn({
          contract_id: contractId,
          type: "ALL_METHODS",
        });

        const acc = mw.getAccountId() || res?.payload?.accountId;
        if (acc) {
          setManualAccountId(acc);
          setActiveWalletType("meteor");
          localStorage.setItem("meridian_connected_account", acc);
          localStorage.setItem("meridian_wallet_type", "meteor");
          setIsModalOpen(false);
          return;
        }
      } catch (err: any) {
        console.warn("Direct window.meteorWallet signIn fallback to selector:", err);
      }
    }

    // Option B: Via NEAR Wallet Selector Meteor module
    if (!selector) {
      throw new Error("Wallet selector initializing. Please try again in 1 second.");
    }

    try {
      const wallet = await selector.wallet("meteor-wallet");
      const accs = await (wallet.signIn as any)({
        contractId,
        methodNames: [],
      });
      if (accs && accs.length > 0) {
        const acc = accs[0].accountId;
        setManualAccountId(acc);
        setActiveWalletType("meteor");
        localStorage.setItem("meridian_connected_account", acc);
        localStorage.setItem("meridian_wallet_type", "meteor");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Meteor Wallet selector signIn error:", err);
      throw err;
    }
  }, [selector, contractId]);

  const connectWithWallet = useCallback(
    async (walletId: string) => {
      if (walletId === "meteor-wallet") {
        return await connectMeteor();
      }

      if (!selector) {
        throw new Error("Wallet selector not initialized");
      }
      try {
        const wallet = await selector.wallet(walletId);
        await (wallet.signIn as any)({
          contractId,
          methodNames: [],
        });
        setActiveWalletType(walletId);
        if (typeof window !== "undefined") {
          localStorage.setItem("meridian_wallet_type", walletId);
        }
        setIsModalOpen(false);
      } catch (err: any) {
        console.error(`Failed to connect with ${walletId}:`, err);
        throw err;
      }
    },
    [selector, contractId, connectMeteor]
  );

  const connectWithAccountId = useCallback((customId: string) => {
    const cleanId = customId.trim();
    if (!cleanId) return;
    setManualAccountId(cleanId);
    setActiveWalletType("manual");
    if (typeof window !== "undefined") {
      localStorage.setItem("meridian_connected_account", cleanId);
      localStorage.setItem("meridian_wallet_type", "manual");
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
      // 1. Direct window.meteorWallet if present & signed in
      if (typeof window !== "undefined" && (window as any).meteorWallet?.isSignedIn()) {
        try {
          const account = (window as any).meteorWallet.account();
          return await account.signAndSendTransaction_direct({
            receiverId: receiverId || contractId,
            actions: actions as any,
          });
        } catch (err) {
          console.warn("window.meteorWallet signAndSendTransaction failed, falling back:", err);
        }
      }

      // 2. Via selector if signed in
      if (selector && selector.isSignedIn()) {
        const wallet = await selector.wallet();
        return await wallet.signAndSendTransaction({
          receiverId: receiverId || contractId,
          actions: actions as any,
        });
      }

      // 3. Fallback to API relayer
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
        isMeteorDetected,
        activeWalletType,
        setIsModalOpen,
        signIn,
        signOut,
        connectMeteor,
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
