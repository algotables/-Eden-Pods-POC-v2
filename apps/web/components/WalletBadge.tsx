"use client";

import { useWallet } from "@/contexts/WalletContext";
import { EXPLORER_BASE } from "@/lib/algorand";

export default function WalletBadge() {
  const { address, shortAddress, disconnect, isConnected } = useWallet();
  if (!isConnected) return null;
  return (
    <div className="flex items-center gap-1">
      <a
        href={`${EXPLORER_BASE}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-eden-100 hover:bg-eden-200 text-eden-800 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
      >
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        {shortAddress}
      </a>
      <button
        onClick={disconnect}
        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        title="Disconnect"
      >
        ✕
      </button>
    </div>
  );
}
