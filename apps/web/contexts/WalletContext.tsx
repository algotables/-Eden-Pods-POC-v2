"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { getPera } from "@/lib/algorand";

function shorten(addr: string, n = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, n)}...${addr.slice(-n)}`;
}

interface WalletCtxType {
  address:      string | null;
  isConnected:  boolean;
  isConnecting: boolean;
  shortAddress: string;
  connect:      () => Promise<void>;
  disconnect:   () => void;
  error:        string | null;
}

const WalletCtx = createContext<WalletCtxType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address,     setAddress]  = useState<string | null>(null);
  const [isConnecting,setConnecting] = useState(false);
  const [error,       setError]    = useState<string | null>(null);

  // Attempt to restore an existing session on mount
  useEffect(() => {
    getPera()
      .then((pera) =>
        pera
          .reconnectSession()
          .then((accounts: string[]) => {
            if (accounts.length > 0) setAddress(accounts[0]);
          })
          .catch(() => {})
      )
      .catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const pera     = await getPera();
      const accounts = await pera.connect();
      setAddress(accounts[0] ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        !msg.includes("closed")   &&
        !msg.includes("rejected") &&
        !msg.includes("cancel")
      ) {
        setError(msg);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const pera = await getPera();
      pera.disconnect();
    } catch {}
    setAddress(null);
    setError(null);
  }, []);

  return (
    <WalletCtx.Provider
      value={{
        address,
        isConnected:  !!address,
        isConnecting,
        shortAddress: address ? shorten(address) : "",
        connect,
        disconnect,
        error,
      }}
    >
      {children}
    </WalletCtx.Provider>
  );
}

export function useWallet(): WalletCtxType {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}
