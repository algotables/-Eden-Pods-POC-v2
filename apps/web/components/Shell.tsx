"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import WalletBadge from "./WalletBadge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",     icon: "🌳", label: "Forest" },
  { href: "/throw/new",     icon: "💊", label: "Throw"  },
  { href: "/birthright",    icon: "🎁", label: "Kit"    },
  { href: "/notifications", icon: "🔔", label: "Alerts" },
];

export default function Shell({
  children,
  hideNav,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
}) {
  const pathname = usePathname();
  const { unreadCount } = useApp();

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-eden-50">
      <header className="sticky top-0 z-40 bg-white border-b border-eden-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-bold text-eden-800 text-lg">Eden Pods</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-eden-50">
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <WalletBadge />
        </div>
      </header>

      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-eden-100 z-40">
          <div className="flex items-center justify-around py-2">
            {NAV.map(({ href, icon, label }) => {
              const active =
                href === "/dashboard"
                  ? pathname === href
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all",
                    active ? "bg-eden-100 text-eden-800" : "text-gray-500 hover:text-eden-600"
                  )}
                >
                  <div className="relative">
                    <span className="text-2xl">{icon}</span>
                    {href === "/notifications" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    active ? "text-eden-700" : "text-gray-500"
                  )}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
