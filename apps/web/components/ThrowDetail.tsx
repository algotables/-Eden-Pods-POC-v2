"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useWallet } from "@/contexts/WalletContext";
import {
  POD_TYPES, GROWTH_MODELS, RECIPES,
  getCurrentStage, getNextStage,
  QUANTITY_ICONS, QUANTITY_LABELS, QUANTITY_GRAMS,
} from "@/lib/store";
import type { OnChainHarvest } from "@/lib/algorand";
import { buildHarvestTxn, signAndSendTxns } from "@/lib/algorand";
import type { UnifiedThrow } from "@/contexts/AppContext";
import { cn, timeAgo, fmtDate } from "@/lib/utils";
import ThrowNFTBadge from "./ThrowNFTBadge";
import toast from "react-hot-toast";
import { v4 as uuid } from "uuid";

const OBS_STAGES = [
  { id: "sprout",    icon: "🌱", label: "Sprouts"   },
  { id: "leafing",   icon: "🍃", label: "Leaves"    },
  { id: "flowering", icon: "🌸", label: "Flowers"   },
  { id: "fruiting",  icon: "🍊", label: "Fruit"     },
  { id: "spread",    icon: "🌬️", label: "Spreading" },
];

export default function ThrowDetail({
  throwData,
}: {
  throwData: UnifiedThrow;
}) {
  const {
    observations,
    onChainHarvests,
    addObservation,
    refreshThrows,
    addOptimisticHarvest,
    confirmHarvest,
    removeHarvest,
  } = useApp();
  const { address } = useWallet();

  const [tab,       setTab]       = useState<"timeline" | "harvest" | "recipes">("timeline");
  const [modal,     setModal]     = useState(false);
  const [hPlant,    setHPlant]    = useState("");
  const [hQty,      setHQty]      = useState<"small" | "medium" | "large">("small");
  const [hNotes,    setHNotes]    = useState("");
  const [savingObs, setSavingObs] = useState<string | null>(null);
  const [savingH,   setSavingH]   = useState(false);

  const pt    = POD_TYPES.find((p) => p.id === throwData.podTypeId);
  const model = GROWTH_MODELS.find((m) => m.id === throwData.growthModelId);
  const sd    = model ? getCurrentStage(throwData.throwDate, model) : null;
  const next  = model ? getNextStage(throwData.throwDate, model)    : null;

  if (!pt) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
        <div className="text-5xl">🌱</div>
        <p className="text-gray-500 text-sm">
          Unknown pod type:{" "}
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
            {throwData.podTypeId}
          </span>
        </p>
      </div>
    );
  }

  if (!model || !sd) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
        <div className="text-5xl">🌿</div>
        <p className="text-gray-500 text-sm">
          Unknown growth model:{" "}
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
            {throwData.growthModelId}
          </span>
        </p>
      </div>
    );
  }

  // Coerce both sides to Number — algosdk v3 may return BigInt for asset
  // indices, which would cause === to silently return false against a number.
  const myHarvests = onChainHarvests.filter(
    (h) => Number(h.throwAsaId) === Number(throwData.asaId)
  );

  const myObs = observations.filter(
    (o) =>
      o.throwId === throwData.localId ||
      o.throwId === String(throwData.asaId)
  );
  const observedIds = new Set(myObs.map((o) => o.stageId));

  const recipes = RECIPES.filter(
    (r) => r.plants.some((p) => pt.plants.includes(p))
  );

  const totalG = myHarvests.reduce(
    (s, h) => s + QUANTITY_GRAMS[h.quantityClass],
    0
  );

  const logObs = (stageId: string) => {
    setSavingObs(stageId);
    addObservation({
      throwId: throwData.asaId > 0 ? String(throwData.asaId) : throwData.localId,
      stageId,
      notes: "",
    });
    toast.success("Observation logged!");
    setSavingObs(null);
  };

  const logHarvest = async () => {
    if (!hPlant || !address || throwData.asaId === 0) return;
    setSavingH(true);

    const now             = new Date().toISOString();
    const placeholderTxId = `pending-${uuid()}`;
    const placeholder: OnChainHarvest = {
      txId:          placeholderTxId,
      throwAsaId:    Number(throwData.asaId),
      plantId:       hPlant,
      quantityClass: hQty,
      harvestedAt:   now,
      notes:         hNotes,
      confirmedAt:   now,
    };

    addOptimisticHarvest(placeholder);
    setModal(false);
    setHPlant("");
    setHNotes("");

    try {
      const txn = await buildHarvestTxn(address, {
        throwAsaId:    Number(throwData.asaId),
        plantId:       hPlant,
        quantityClass: hQty,
        harvestedAt:   now,
        notes:         hNotes,
      });
      const { txIds } = await signAndSendTxns([txn], address);
      confirmHarvest(placeholderTxId, txIds[0] ?? placeholderTxId);
      toast.success("Harvest recorded on-chain!");
      setTimeout(() => refreshThrows(), 4_000);
    } catch (err) {
      removeHarvest(placeholderTxId);
      setModal(true);
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("cancel") || msg.includes("reject")
          ? "Cancelled"
          : "Failed: " + msg
      );
    } finally {
      setSavingH(false);
    }
  };

  return (
    <div className="pb-6">
      {/* Hero */}
      <div
        className="px-5 py-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${pt.color}dd, ${pt.color}88)`,
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-4xl">
            {pt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{pt.name}</h1>
            <p className="text-white/80 text-sm">
              Thrown {timeAgo(throwData.throwDate)} · {fmtDate(throwData.throwDate)}
            </p>
            {throwData.locationLabel && (
              <p className="text-white/70 text-xs mt-0.5">
                📍 {throwData.locationLabel}
              </p>
            )}
          </div>
        </div>

        {throwData.asaId > 0 && (
          <div className="mb-3">
            <ThrowNFTBadge
              asaId={throwData.asaId}
              txId={throwData.txId}
              size="md"
            />
          </div>
        )}

        <div className="bg-white/15 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wide mb-0.5">
                Current Stage
              </p>
              <p className="text-white font-bold text-lg">
                {sd.stage.icon} {sd.stage.name}
              </p>
              <p className="text-white/80 text-sm">Day {sd.daysSince}</p>
            </div>
            {next && (
              <div className="text-right">
                <p className="text-white/70 text-xs mb-0.5">Next</p>
                <p className="text-white/90 text-sm font-medium">
                  {next.icon} {next.name}
                </p>
                <p className="text-white/60 text-xs">Day {next.dayStart}+</p>
              </div>
            )}
          </div>
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${sd.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Observations */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
            What do you see?
          </p>
          <div className="grid grid-cols-5 gap-2">
            {OBS_STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => logObs(s.id)}
                disabled={savingObs === s.id}
                className={cn(
                  "flex flex-col items-center py-3 rounded-2xl border-2 transition-all active:scale-95",
                  observedIds.has(s.id)
                    ? "border-eden-500 bg-eden-50 text-eden-800"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-eden-300"
                )}
              >
                <span className="text-2xl">
                  {savingObs === s.id ? "⏳" : s.icon}
                </span>
                <span className="text-xs font-medium mt-1">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {(["timeline", "harvest", "recipes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium rounded-xl transition-all capitalize",
                tab === t
                  ? "bg-white text-eden-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {tab === "timeline" && (
        <div className="px-4 mt-4">
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-eden-100" />
            <div className="space-y-4">
              {model.stages.map((s) => {
                const done = sd.daysSince >= s.dayEnd;
                const cur  = s.id === sd.stage.id;
                const fut  = sd.daysSince < s.dayStart;
                return (
                  <div key={s.id} className="flex gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 z-10 border-2",
                        done
                          ? "bg-eden-500 border-eden-500 text-white"
                          : cur
                          ? "bg-white border-eden-500"
                          : "bg-white border-gray-200"
                      )}
                    >
                      {done ? "✓" : s.icon}
                    </div>
                    <div className={cn("flex-1 pb-4", fut && "opacity-40")}>
                      <div
                        className={cn(
                          "rounded-2xl p-4 border",
                          cur
                            ? "bg-eden-50 border-eden-200"
                            : "bg-white border-gray-100"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "font-semibold",
                              cur ? "text-eden-800" : "text-gray-700"
                            )}
                          >
                            {s.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            Day {s.dayStart}–
                            {s.dayEnd < 1000 ? s.dayEnd : "∞"}
                          </span>
                        </div>
                        {cur && (
                          <div className="bg-eden-100 text-eden-800 rounded-xl px-3 py-1 text-xs font-medium mb-2 inline-block">
                            You are here
                          </div>
                        )}
                        <p className="text-sm text-gray-600">
                          {s.whatToExpect}
                        </p>
                        {cur && (
                          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-eden-500 rounded-full"
                              style={{ width: `${sd.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {myObs.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">
                Your Observations
              </h3>
              <div className="space-y-2">
                {myObs.slice(0, 5).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
                  >
                    <span className="text-xl">
                      {OBS_STAGES.find((s) => s.id === o.stageId)?.icon ?? "🌿"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 capitalize">
                        {o.stageId}
                      </p>
                      <p className="text-xs text-gray-400">
                        {timeAgo(o.observedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Harvest */}
      {tab === "harvest" && (
        <div className="px-4 mt-4 space-y-4">
          <div className="card">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Plants in this pod:
            </p>
            <div className="flex flex-wrap gap-2">
              {pt.plants.map((p) => (
                <span
                  key={p}
                  className="bg-eden-100 text-eden-700 px-3 py-1.5 rounded-xl text-sm font-medium capitalize"
                >
                  🌿 {p.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {throwData.asaId > 0 ? (
            <button
              onClick={() => {
                setHPlant(pt.plants[0] ?? "");
                setModal(true);
              }}
              className="btn-primary w-full"
            >
              Log a Harvest
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <p className="text-sm text-amber-700">
                Harvest logging available once the throw NFT is confirmed on-chain.
              </p>
            </div>
          )}

          {myHarvests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🧺</div>
              <p className="text-sm">No harvests logged yet</p>
            </div>
          ) : (
            myHarvests.map((h) => (
              <div
                key={h.txId}
                className={cn(
                  "flex items-center gap-3 p-3 bg-white rounded-2xl border",
                  h.txId.startsWith("pending-")
                    ? "border-purple-200 opacity-70"
                    : "border-purple-100"
                )}
              >
                <span className="text-2xl">{QUANTITY_ICONS[h.quantityClass]}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800 capitalize">
                    {h.plantId.replace(/-/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {QUANTITY_LABELS[h.quantityClass]} ·{" "}
                    {h.txId.startsWith("pending-")
                      ? "confirming…"
                      : timeAgo(h.harvestedAt)}
                  </p>
                </div>
                <p className="text-xs font-medium text-purple-700">
                  ~{QUANTITY_GRAMS[h.quantityClass]}g
                </p>
              </div>
            ))
          )}

          {totalG > 0 && (
            <div className="card-sm bg-eden-50 border-eden-200 text-center">
              <p className="text-sm font-semibold text-eden-800">
                Total Harvested
              </p>
              <p className="text-2xl font-bold text-eden-700 mt-1">
                ~{totalG.toLocaleString()}g
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recipes */}
      {tab === "recipes" && (
        <div className="px-4 mt-4 space-y-4">
          {recipes.length > 0 ? (
            recipes.map((r) => (
              <div key={r.id} className="card">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{r.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{r.time}</span>
                      <span>·</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full font-medium",
                          r.difficulty === "easy"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {r.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {r.instructions}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.nutritionTags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">👩‍🍳</div>
              <p className="text-sm">Recipes will appear as plants mature</p>
            </div>
          )}
        </div>
      )}

      {/* Harvest Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Log Harvest</h3>
              <button
                onClick={() => setModal(false)}
                className="text-gray-400 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What did you harvest?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pt.plants.map((p) => (
                    <button
                      key={p}
                      onClick={() => setHPlant(p)}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left transition-all",
                        hPlant === p
                          ? "border-eden-500 bg-eden-50"
                          : "border-gray-200 hover:border-eden-300"
                      )}
                    >
                      <span className="text-sm font-medium text-gray-800 capitalize">
                        🌿 {p.replace(/-/g, " ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How much?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["small", "medium", "large"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setHQty(q)}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-center transition-all",
                        hQty === q
                          ? "border-eden-500 bg-eden-50"
                          : "border-gray-200 hover:border-eden-300"
                      )}
                    >
                      <div className="text-2xl mb-1">{QUANTITY_ICONS[q]}</div>
                      <span className="text-xs font-medium text-gray-700">
                        {QUANTITY_LABELS[q]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={hNotes}
                onChange={(e) => setHNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-eden-400 resize-none"
              />

              <button
                onClick={logHarvest}
                disabled={savingH || !hPlant}
                className="btn-primary w-full disabled:opacity-50"
              >
                {savingH ? "Saving..." : "Record On-Chain"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
