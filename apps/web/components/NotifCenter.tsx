"use client";

import { useApp } from "@/contexts/AppContext";
import { getDueNotifications } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

export default function NotifCenter() {
  const { notifications, markRead, markAllRead } = useApp();
  const due = getDueNotifications(notifications);

  return (
    <div className="px-4 py-6 fade-up">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-eden-900">Notifications</h1>
        {due.length > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-sm">Mark all read</button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
        <p className="text-sm font-semibold text-blue-800">Stage Alerts</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Notifications appear here when each growth stage window opens.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">All caught up!</h3>
          <p className="text-gray-500 text-sm">Stage alerts appear here as your pods grow.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.slice(0, 30).map((n) => {
            const isNew = !n.read && n.scheduledFor <= new Date().toISOString();
            return (
              <div
                key={n.id}
                className={cn(
                  "rounded-2xl p-4 border transition-all",
                  isNew ? "bg-white border-eden-200 shadow-sm" : "bg-white border-gray-100 opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0",
                    isNew ? "bg-eden-100" : "bg-gray-100"
                  )}>
                    {n.stageIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                      {isNew && <span className="w-2 h-2 bg-eden-500 rounded-full flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.scheduledFor)}</p>
                  </div>
                </div>
                {isNew && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="mt-3 w-full py-2 text-sm font-medium text-eden-700 bg-eden-50 rounded-xl hover:bg-eden-100 transition-colors"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
