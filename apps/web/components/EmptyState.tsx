"use client";

import { useRouter } from "next/navigation";

export default function EmptyState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="text-8xl mb-6">🌍</div>
      <h2 className="text-2xl font-bold text-eden-900 mb-3">Your forest awaits</h2>
      <p className="text-gray-500 mb-8 max-w-xs leading-relaxed">
        Log your first pod throw to start tracking your food forest. Each throw mints an NFT on Algorand!
      </p>
      <button onClick={() => router.push("/throw/new")} className="btn-primary text-xl px-10 py-5">
        Log My First Throw
      </button>
      <div className="grid grid-cols-3 gap-4 mt-8 max-w-xs">
        {[["💊", "Throw pod"], ["📱", "Log it"], ["🔗", "On-chain forever"]].map(([icon, text]) => (
          <div key={text} className="text-center">
            <div className="text-3xl mb-1">{icon}</div>
            <p className="text-xs text-gray-500">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
