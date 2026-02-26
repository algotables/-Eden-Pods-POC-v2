"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { useApp } from "@/contexts/AppContext";
import Shell from "@/components/Shell";
import ThrowDetail from "@/components/ThrowDetail";

export default function ThrowPage({ params }: { params: { id: string } }) {
  const { isConnected } = useWallet();
  const { throws } = useApp();
  const router = useRouter();

  const throwData = throws.find(
    (t) =>
      String(t.asaId) === params.id ||
      t.localId === params.id ||
      t.txId === params.id
  );

  useEffect(() => {
    if (!isConnected) router.replace("/");
  }, [isConnected, router]);

  if (!isConnected) return null;
  if (!throwData) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-eden-200 border-t-eden-600 rounded-full animate-spin" />
          <p className="text-eden-600 text-sm">Loading throw...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ThrowDetail throwData={throwData} />
    </Shell>
  );
}
