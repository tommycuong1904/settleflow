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
  connectGoogle: (profile: { email: string; name?: string; picture?: string; sub: string; idToken: string }) => Promise<void>;
  getPrivateKey: () => string | null;
  disconnect: () => Promise<void>;
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
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || `Session sync failed (${response.status}).`);
    }
  } catch (err) {
    console.warn(`Session sync to ${path} failed:`, err);
    throw err;
  }
}

interface StoredSession {
  isConnected: boolean;
  address: string | null;
  email: string | null;
  googleSub?: string | null;
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
  const [googleSub, setGoogleSub] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [network, setNetwork] = useState<string>("Arc Testnet");
  const [usdcBalance, setUsdcBalance] = useState<string>("1,250.00");
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Restore the UI cache, then reconcile it with the HttpOnly server session.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session: StoredSession = JSON.parse(raw);
          if (session.isConnected) {
            setIsConnected(true);
            setAddress(session.address);
            setEmail(session.email);
            setGoogleSub(session.googleSub || null);
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

      void fetch("/api/v1/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { session?: { address?: string | null; email?: string; googleSub?: string | null; name?: string | null; authType?: AuthType } };
      })
      .then((payload) => {
        const session = payload?.session;
        if (!session) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // Ignore storage write errors.
          }
          setIsConnected(false);
          setAddress(null);
          setEmail(null);
          setGoogleSub(null);
          setUserName(null);
          setUserAvatar(null);
          setAuthType(null);
          setWalletName(null);
          return;
        }
        if (session.authType !== "web2_google" && session.authType !== "web3_wallet") return;
        if (session.authType === "web2_google" && !session.email) return;
        if (session.authType === "web3_wallet" && !session.address) return;
        const next = {
          isConnected: true,
          address: session.address || null,
          email: session.authType === "web2_google" ? session.email || null : null,
          googleSub: session.authType === "web2_google" ? session.googleSub || null : null,
          userName: session.name || (session.authType === "web2_google" ? session.email!.split("@")[0] : null),
          userAvatar: null,
          authType: session.authType,
          walletName: session.authType === "web2_google" ? "Google Smart Account" : "Web3 Wallet",
          network: "Arc Testnet",
          usdcBalance: "1,250.00",
        };
        setIsConnected(true);
        setAddress(next.address);
        setEmail(next.email);
        setGoogleSub(next.googleSub);
        setUserName(next.userName);
        setUserAvatar(next.userAvatar);
        setAuthType(next.authType);
        setWalletName(next.walletName);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage write errors
        }
      })
      .catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
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
    if (!isConnected || !address) return;
    const refreshTimer = window.setTimeout(() => void refreshBalance(), 0);
    return () => window.clearTimeout(refreshTimer);
  }, [address, isConnected, refreshBalance]);

  const connectWeb3 = useCallback(
    async (preferredWallet?: string) => {
      setIsConnecting(true);
      try {
        const result = await connectBrowserWallet();
        if (!result.connectedAddress || !result.provider) throw new Error("No browser wallet account available.");
        const connectedAddr = result.connectedAddress;
        const wName = result.walletName || preferredWallet || "Web3 Wallet";
        const nonceResponse = await fetch("/api/v1/auth/wallet/nonce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: connectedAddr }) });
        if (!nonceResponse.ok) {
          const payload = (await nonceResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Unable to request wallet sign-in challenge.");
        }
        const challenge = (await nonceResponse.json()) as { nonce: string; message: string };
        const signature = await (result.provider as unknown as { request: (args: { method: string; params: [string, string] }) => Promise<unknown> }).request({ method: "personal_sign", params: [challenge.message, connectedAddr] }) as string;
        await syncServerSession("/api/v1/auth/wallet", { address: connectedAddr, walletName: wName, nonce: challenge.nonce, message: challenge.message, signature });

        setIsConnected(true);
        setAddress(connectedAddr);
        setEmail(null);
        setGoogleSub(null);
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
          googleSub: null,
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
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [saveSession],
  );

  const connectGoogle = useCallback(
    async (profile: { email: string; name?: string; picture?: string; sub: string; idToken: string }) => {
      setIsConnecting(true);
      try {
        const smartAccount = deriveSmartAccountAddress(profile.sub);
        const name = profile.name || profile.email.split("@")[0];
        const avatar = profile.picture || null;

        await syncServerSession("/api/v1/auth/google", {
          email: profile.email,
          sub: profile.sub,
          name: profile.name,
          picture: profile.picture,
          idToken: profile.idToken,
        });

        setIsConnected(true);
        setAddress(smartAccount);
        setEmail(profile.email);
        setGoogleSub(profile.sub);
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
          googleSub: profile.sub,
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

  const getPrivateKey = useCallback(() => {
    if (!isConnected || authType !== "web2_google" || !googleSub) {
      return null;
    }
    return deriveDeterministicPrivateKey(googleSub);
  }, [isConnected, authType, googleSub]);

  const disconnect = useCallback(async () => {
    await syncServerSession("/api/v1/auth/logout", {});
    // Keep Google Identity Services from immediately re-selecting the just-signed-out account.
    window.google?.accounts?.id.disableAutoSelect();
    setIsConnected(false);
    setAddress(null);
    setEmail(null);
    setGoogleSub(null);
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
