"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";

export default function HomePage() {
  const { isConnected, isConnecting, connect, error } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected) router.replace("/dashboard");
  }, [isConnected, router]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connect();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-eden-950 via-eden-900 to-eden-800 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-8xl mb-4 text-center">🌱</div>
      <h1 className="text-5xl font-bold text-white text-center mb-2">Eden Pods</h1>
      <p className="text-eden-300 text-xl text-center mb-1">Throw a seed. Grow a forest.</p>
      <p className="text-eden-400 text-sm text-center mb-4 max-w-xs leading-relaxed">
        Each pod throw is minted as an NFT on Algorand testnet.
      </p>

      <div className="flex gap-2 mb-8 flex-wrap justify-center">
        <span className="bg-eden-800/60 text-eden-300 text-xs px-3 py-1.5 rounded-full border border-eden-700/50 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Algorand Testnet
        </span>
        <span className="bg-eden-800/60 text-eden-300 text-xs px-3 py-1.5 rounded-full border border-eden-700/50">
          ARC-69 NFTs
        </span>
      </div>

      <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
        <h2 className="text-white text-xl font-semibold text-center mb-1">Connect Pera Wallet</h2>
        <p className="text-eden-400 text-xs text-center mb-5">
          Your wallet is your identity — no account needed
        </p>

        <button
          onClick={handleConnect}
          disabled={isConnecting || loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-4 px-6 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-60 mb-3"
        >
          {isConnecting || loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
              <span>Connecting...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#FFEE55" />
                <path d="M8 22V10h6.5c3.5 0 5.5 1.8 5.5 4.5S18 19 14.5 19H11v3H8zm3-6h3.2c1.7 0 2.8-.8 2.8-2s-1.1-2-2.8-2H11v4z" fill="#1A1A1A" />
                <circle cx="22" cy="20" r="3" fill="#1A1A1A" />
              </svg>
              <span>Connect Pera Wallet</span>
            </div>
          )}
        </button>

        {error && (
          <div className="bg-red-900/40 border border-red-700/60 rounded-xl px-4 py-2 mb-3">
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}

        <div className="bg-amber-900/30 border border-amber-700/40 rounded-2xl p-3 mb-3">
          <p className="text-amber-300 text-xs font-semibold mb-1">Testnet Mode</p>
          <p className="text-amber-400 text-xs leading-relaxed">
            Need free test ALGO?{" "}
            <a href="https://dispenser.testnet.aws.algodev.network/" target="_blank" rel="noopener noreferrer" className="underline text-amber-300">
              Get it here
            </a>
          </p>
        </div>

        <div className="bg-white/5 rounded-2xl p-3">
          <p className="text-eden-300 text-xs font-semibold mb-2">What happens when you connect:</p>
          <ul className="text-eden-400 text-xs space-y-1">
            <li>- Wallet address becomes your identity</li>
            <li>- Each pod throw mints 1 ARC-69 NFT</li>
            <li>- NFTs appear in Pera wallet under Assets</li>
            <li>- Forest data lives on Algorand forever</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-6">
        {["Throw and Go", "On-Chain Proof", "Self-Replicating", "Real Food"].map((f) => (
          <span key={f} className="bg-eden-800/40 text-eden-300 px-3 py-1.5 rounded-full text-xs border border-eden-700/30">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
