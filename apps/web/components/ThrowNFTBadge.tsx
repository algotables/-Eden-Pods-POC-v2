"use client";

import { explorerAssetUrl, explorerTxUrl } from "@/lib/algorand";
import { cn } from "@/lib/utils";

export default function ThrowNFTBadge({
  asaId,
  txId,
  size = "sm",
}: {
  asaId: number;
  txId?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={explorerAssetUrl(asaId)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1 rounded-xl font-medium transition-colors bg-purple-100 hover:bg-purple-200 text-purple-800",
          size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"
        )}
      >
        ASA #{asaId} ↗
      </a>
      {txId && txId !== "pending" && (
        <a
          href={explorerTxUrl(txId)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1 rounded-xl font-medium transition-colors bg-gray-100 hover:bg-gray-200 text-gray-600",
            size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"
          )}
        >
          tx ↗
        </a>
      )}
    </div>
  );
}
