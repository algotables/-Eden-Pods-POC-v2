"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { POD_TYPES, GROWTH_MODELS, getCurrentStage } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import ThrowNFTBadge from "./ThrowNFTBadge";

export default function Dashboard() {
  const { throws, throwsLoading, throwsError, refreshThrows } = useApp();
  const router = useRouter();

  const hasPending = throws.some((t) => t.isPending);

  const enriched = throws.map((t) => {
    const pt    = POD_TYPES.find((p) => p.id === t.podTypeId);
    const model = GROWTH_MODELS.find((m) => m.id === t.growthModelId);
    const sd    = model ? getCurrentStage(t.throwDate, model) : null;
    return { t, pt, sd };
  });

  const stageCounts: Record<string, number> = {};
  enriched.forEach(({ sd }) => {
    if (sd) stageCounts[sd.stage.id] = (stageCounts[sd.stage.id] ?? 0) + 1;
  });
  const dominant = Object.entries(stageCounts).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="px-4 py-5 space-y-5 fade-up">
      {/* Error banner */}
      {throwsError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span>⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Could not reach Algorand indexer
            </p>
            <p className="text-xs text-amber-600 mt-0.5">{throwsError}</p>
          </div>
          <button
            onClick={refreshThrows}
            className="text-xs text-amber-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pending banner */}
      {hasPending && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-800">
              Confirming on Algorand...
            </p>
            <p className="text-xs text-purple-600 mt-0.5">
              NFT minted — waiting for indexer. Usually under 30s.
            </p>
          </div>
          <button
            onClick={refreshThrows}
            className="text-xs text-purple-700 underline flex-shrink-0"
          >
            Check now
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-sm text-center">
          <div className="text-3xl font-bold text-eden-700">{throws.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Throws</div>
        </div>
        <div className="card-sm text-center">
          <div className="text-2xl">
            {dominant
              ? enriched.find((e) => e.sd?.stage.id === dominant[0])?.sd?.stage.icon
              : "🌱"}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {dominant?.[0] ?? "—"}
          </div>
        </div>
        <div className="card-sm text-center">
          <div className="text-3xl font-bold text-eden-700">
            {
              enriched.filter(({ sd }) =>
                sd && ["fruiting", "spread"].includes(sd.stage.id)
              ).length
            }
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Harvestable</div>
        </div>
      </div>

      <button
        onClick={() => router.push("/throw/new")}
        className="btn-primary w-full"
      >
        Log Another Throw
      </button>

      {/* List header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">
          Your Throws ({throws.length})
        </h2>
        <button
          onClick={refreshThrows}
          className="text-xs text-eden-600 hover:text-eden-700 flex items-center gap-1"
        >
          {throwsLoading && (
            <div className="w-3 h-3 border-2 border-eden-300 border-t-eden-600 rounded-full animate-spin" />
          )}
          Refresh
        </button>
      </div>

      {/* Throw cards — no outer <Link> so ThrowNFTBadge <a> tags are safe */}
      <div className="space-y-3">
        {enriched.map(({ t, pt, sd }) => {
          const href = t.isPending
            ? null
            : `/throw/${t.asaId > 0 ? t.asaId : t.localId}`;

          return (
            <div
              key={t.localId}
              className={cn(
                "card flex flex-col gap-3 transition-shadow",
                href ? "hover:shadow-md" : "opacity-70"
              )}
            >
              {/* Top row — this part is the clickable area */}
              <div
                role={href ? "button" : undefined}
                onClick={() => href && router.push(href)}
                className={cn(
                  "flex items-center gap-4",
                  href && "cursor-pointer"
                )}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: (pt?.color ?? "#22c55e") + "30" }}
                >
                  {t.isPending ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    pt?.icon ?? "🌱"
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">
                      {pt?.name ?? t.podTypeName ?? "Pod"}
                    </span>
                    {sd && !t.isPending && (
                      <span className="badge-stage">
                        {sd.stage.icon} {sd.stage.name}
                      </span>
                    )}
                    {t.isPending && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        confirming...
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {timeAgo(t.throwDate)} · Day {sd?.daysSince ?? 0}
                  </p>
                  {t.locationLabel && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      📍 {t.locationLabel}
                    </p>
                  )}
                </div>

                {href && <span className="text-gray-400 flex-shrink-0">→</span>}
              </div>

              {/* Progress bar */}
              {sd && !t.isPending && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-eden-500 rounded-full"
                    style={{ width: `${sd.progress}%` }}
                  />
                </div>
              )}

              {/* NFT badge — lives outside any <a>, so no nesting warning */}
              {t.asaId > 0 && (
                <ThrowNFTBadge asaId={t.asaId} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
