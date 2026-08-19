"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { connectBrowserWallet } from "@/lib/arc/browser-wallet";

export type AuthType = "web2_email" | "web2_google" | "web3_wallet" | null;

export interface WalletContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  email: string | null;
  authType: AuthType;
  walletName: string | null;
  network: string;
  usdcBalance: string;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  connectWeb3: (preferredWallet?: string) => Promise<void>;
  connectWeb2: (identifier: string, provider?: "google" | "email") => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const STORAGE_KEY = "settleflow_auth_session";

interface StoredSession {
  isConnected: boolean;
  address: string | null;
  email: string | null;
  authType: AuthType;
  walletName: string | null;
  network: string;
  usdcBalance: string;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [network, setNetwork] = useState<string>("Arc Testnet");
  const [usdcBalance, setUsdcBalance] = useState<string>("1,250.00");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Restore session on initial load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const session: StoredSession = JSON.parse(raw);
        if (session.isConnected) {
          setIsConnected(true);
          setAddress(session.address);
          setEmail(session.email);
          setAuthType(session.authType);
          setWalletName(session.walletName);
          setNetwork(session.network || "Arc Testnet");
          setUsdcBalance(session.usdcBalance || "1,250.00");
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Save session when state changes
  const saveSession = useCallback((data: Partial<StoredSession>) => {
    try {
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      const prev = currentRaw ? JSON.parse(currentRaw) : {};
      const next = { ...prev, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const connectWeb3 = useCallback(
    async (preferredWallet?: string) => {
      setIsConnecting(true);
      try {
        const result = await connectBrowserWallet();
        const connectedAddr = result.connectedAddress || "0x71C...49A2";
        const wName = result.walletName || preferredWallet || "MetaMask";

        setIsConnected(true);
        setAddress(connectedAddr);
        setEmail(null);
        setAuthType("web3_wallet");
        setWalletName(wName);
        setNetwork("Arc Testnet");
        setUsdcBalance("2,450.00");

        saveSession({
          isConnected: true,
          address: connectedAddr,
          email: null,
          authType: "web3_wallet",
          walletName: wName,
          network: "Arc Testnet",
          usdcBalance: "2,450.00",
        });

        setIsAuthModalOpen(false);
      } catch (err) {
        console.error("Web3 connection error:", err);
        // Fallback for mock/demo testing if no wallet extension is available
        const mockAddr = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
        const wName = preferredWallet || "Web3 Wallet";
        setIsConnected(true);
        setAddress(mockAddr);
        setEmail(null);
        setAuthType("web3_wallet");
        setWalletName(wName);
        setNetwork("Arc Testnet");
        setUsdcBalance("1,000.00");

        saveSession({
          isConnected: true,
          address: mockAddr,
          email: null,
          authType: "web3_wallet",
          walletName: wName,
          network: "Arc Testnet",
          usdcBalance: "1,000.00",
        });

        setIsAuthModalOpen(false);
      } finally {
        setIsConnecting(false);
      }
    },
    [saveSession],
  );

  const connectWeb2 = useCallback(
    async (identifier: string, provider: "google" | "email" = "google") => {
      setIsConnecting(true);
      try {
        // Simulate Web2 embedded smart wallet generation
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Generate deterministic/mock smart account address based on email
        const mockSmartAccount = "0x3f4A91B6c4b9d0F835A9211C54a938E768019ab2";
        const userEmail = provider === "google" ? "user.google@settleflow.io" : identifier;

        setIsConnected(true);
        setAddress(mockSmartAccount);
        setEmail(userEmail);
        setAuthType(provider === "google" ? "web2_google" : "web2_email");
        setWalletName("Smart Account");
        setNetwork("Arc Testnet");
        setUsdcBalance("500.00");

        saveSession({
          isConnected: true,
          address: mockSmartAccount,
          email: userEmail,
          authType: provider === "google" ? "web2_google" : "web2_email",
          walletName: "Smart Account",
          network: "Arc Testnet",
          usdcBalance: "500.00",
        });

        setIsAuthModalOpen(false);
      } finally {
        setIsConnecting(false);
      }
    },
    [saveSession],
  );

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress(null);
    setEmail(null);
    setAuthType(null);
    setWalletName(null);
    clearSession();
  }, [clearSession]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        isConnecting,
        address,
        email,
        authType,
        walletName,
        network,
        usdcBalance,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        connectWeb3,
        connectWeb2,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
