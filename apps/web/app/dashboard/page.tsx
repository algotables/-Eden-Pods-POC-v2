"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { useApp } from "@/contexts/AppContext";
import Shell from "@/components/Shell";
import Dashboard from "@/components/Dashboard";
import EmptyState from "@/components/EmptyState";

export default function DashboardPage() {
  const { isConnected } = useWallet();
  const { throws, throwsLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) router.replace("/");
  }, [isConnected, router]);

  if (!isConnected) return null;

  if (throwsLoading && throws.length === 0) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-eden-200 border-t-eden-600 rounded-full animate-spin" />
          <p className="text-eden-600 text-sm">Loading your forest from Algorand...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {throws.length === 0 ? <EmptyState /> : <Dashboard />}
    </Shell>
  );
}
