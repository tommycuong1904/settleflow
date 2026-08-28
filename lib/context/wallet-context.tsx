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
import { fetchLiveArcBalances } from "@/lib/arc/onchain";
import { deriveSmartAccountAddress, deriveDeterministicPrivateKey } from "@/lib/auth/smart-account";

export type AuthType = "web2_email" | "web2_google" | "web3_wallet" | null;

export interface WalletContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  email: string | null;
  userName: string | null;
  userAvatar: string | null;
  authType: AuthType;
  walletName: string | null;
  network: string;
  usdcBalance: string;
  isRefreshingBalance: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  refreshBalance: () => Promise<void>;
  connectWeb3: (preferredWallet?: string) => Promise<void>;
  connectWeb2: (identifier: string, provider?: "google" | "email") => Promise<void>;
  connectGoogle: (profile: { email: string; name?: string; picture?: string; sub?: string }) => Promise<void>;
  getPrivateKey: () => string | null;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const STORAGE_KEY = "settleflow_auth_session";

/**
 * Best-effort server-side session establishment. Never throws — the UI must
 * not block on a network hiccup; the local (client) session still stands.
 * Used so the proxy gate sees a valid `sf_session` cookie on later mutations.
 */
async function syncServerSession(path: string, body: Record<string, unknown>) {
  try {
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn(`Session sync to ${path} failed:`, err);
  }
}

interface StoredSession {
  isConnected: boolean;
  address: string | null;
  email: string | null;
  userName?: string | null;
  userAvatar?: string | null;
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
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [network, setNetwork] = useState<string>("Arc Testnet");
  const [usdcBalance, setUsdcBalance] = useState<string>("1,250.00");
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);
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
          setUserName(session.userName || null);
          setUserAvatar(session.userAvatar || null);
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

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    setIsRefreshingBalance(true);
    try {
      const { usdc } = await fetchLiveArcBalances(address);
      setUsdcBalance(usdc);
      saveSession({ usdcBalance: usdc });
    } catch {
      // Silently ignore; keep existing balance
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [address, saveSession]);

  // Auto-refresh balance on address change
  useEffect(() => {
    if (isConnected && address) {
      void refreshBalance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  const connectWeb3 = useCallback(
    async (preferredWallet?: string) => {
      setIsConnecting(true);
      try {
        const result = await connectBrowserWallet();
        const connectedAddr = result.connectedAddress || "0x71C...49A2";
        const wName = result.walletName || preferredWallet || "MetaMask";

        await syncServerSession("/api/v1/auth/wallet", {
          address: connectedAddr,
          walletName: wName,
        });

        setIsConnected(true);
        setAddress(connectedAddr);
        setEmail(null);
        setUserName(null);
        setUserAvatar(null);
        setAuthType("web3_wallet");
        setWalletName(wName);
        setNetwork("Arc Testnet");
        setUsdcBalance("2,450.00");

        saveSession({
          isConnected: true,
          address: connectedAddr,
          email: null,
          userName: null,
          userAvatar: null,
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

        await syncServerSession("/api/v1/auth/wallet", {
          address: mockAddr,
          walletName: wName,
        });

        setIsConnected(true);
        setAddress(mockAddr);
        setEmail(null);
        setUserName(null);
        setUserAvatar(null);
        setAuthType("web3_wallet");
        setWalletName(wName);
        setNetwork("Arc Testnet");
        setUsdcBalance("1,000.00");

        saveSession({
          isConnected: true,
          address: mockAddr,
          email: null,
          userName: null,
          userAvatar: null,
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

  const connectGoogle = useCallback(
    async (profile: { email: string; name?: string; picture?: string; sub?: string }) => {
      setIsConnecting(true);
      try {
        const smartAccount = deriveSmartAccountAddress(profile.sub || profile.email);
        const name = profile.name || profile.email.split("@")[0];
        const avatar = profile.picture || null;

        await syncServerSession("/api/v1/auth/google", {
          email: profile.email,
          sub: profile.sub,
          name: profile.name,
          picture: profile.picture,
        });

        setIsConnected(true);
        setAddress(smartAccount);
        setEmail(profile.email);
        setUserName(name);
        setUserAvatar(avatar);
        setAuthType("web2_google");
        setWalletName("Google Smart Account");
        setNetwork("Arc Testnet");
        setUsdcBalance("1,000.00");

        saveSession({
          isConnected: true,
          address: smartAccount,
          email: profile.email,
          userName: name,
          userAvatar: avatar,
          authType: "web2_google",
          walletName: "Google Smart Account",
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
        await new Promise((resolve) => setTimeout(resolve, 500));

        const userEmail = provider === "google" ? "user.google@settleflow.io" : identifier;
        const smartAccount = deriveSmartAccountAddress(userEmail);
        const name = userEmail.split("@")[0];

        await syncServerSession("/api/v1/auth/google", {
          email: userEmail,
          sub: userEmail,
          name,
        });

        setIsConnected(true);
        setAddress(smartAccount);
        setEmail(userEmail);
        setUserName(name);
        setUserAvatar(null);
        setAuthType(provider === "google" ? "web2_google" : "web2_email");
        setWalletName("Smart Account");
        setNetwork("Arc Testnet");
        setUsdcBalance("500.00");

        saveSession({
          isConnected: true,
          address: smartAccount,
          email: userEmail,
          userName: name,
          userAvatar: null,
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

  const getPrivateKey = useCallback(() => {
    if (!isConnected || (authType !== "web2_google" && authType !== "web2_email")) {
      return null;
    }
    if (!email) return null;
    return deriveDeterministicPrivateKey(email);
  }, [isConnected, authType, email]);

  const disconnect = useCallback(() => {
    void syncServerSession("/api/v1/auth/logout", {});
    setIsConnected(false);
    setAddress(null);
    setEmail(null);
    setUserName(null);
    setUserAvatar(null);
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
        userName,
        userAvatar,
        authType,
        walletName,
        network,
        usdcBalance,
        isRefreshingBalance,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        refreshBalance,
        connectWeb3,
        connectWeb2,
        connectGoogle,
        getPrivateKey,
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

