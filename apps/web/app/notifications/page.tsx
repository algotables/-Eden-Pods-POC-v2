"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import Shell from "@/components/Shell";
import NotifCenter from "@/components/NotifCenter";

export default function NotificationsPage() {
  const { isConnected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) router.replace("/");
  }, [isConnected, router]);

  if (!isConnected) return null;

  return (
    <Shell>
      <NotifCenter />
    </Shell>
  );
}
