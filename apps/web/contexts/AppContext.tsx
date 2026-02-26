"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  LocalState,
  Observation,
  Notification,
  loadLocal,
  addObservation       as storeAddObs,
  markNotificationRead as storeMark,
  markAllRead          as storeMarkAll,
  getDueNotifications,
  seedNotifications,
} from "@/lib/store";
import {
  OnChainThrow,
  OnChainHarvest,
  fetchThrowsForAddress,
  fetchHarvestsForAddress,
} from "@/lib/algorand";
import { useWallet } from "@/contexts/WalletContext";

export interface UnifiedThrow extends OnChainThrow {
  localId:    string;
  isPending?: boolean;
  createdAt?: number;
}

interface AppCtxType {
  userName:             string;
  throws:               UnifiedThrow[];
  throwsLoading:        boolean;
  throwsError:          string | null;
  refreshThrows:        () => Promise<void>;
  addPendingThrow:      (t: UnifiedThrow) => void;
  observations:         Observation[];
  addObservation:       (data: Omit<Observation, "id" | "observedAt">) => void;
  onChainHarvests:      OnChainHarvest[];
  addOptimisticHarvest: (h: OnChainHarvest) => void;
  confirmHarvest:       (placeholderTxId: string, realTxId: string) => void;
  removeHarvest:        (txId: string) => void;
  notifications:        Notification[];
  unreadCount:          number;
  markRead:             (id: string) => void;
  markAllRead:          () => void;
  reload:               () => void;
}

interface AppState {
  confirmedThrows: UnifiedThrow[];
  pendingThrows:   UnifiedThrow[];
  throwsLoading:   boolean;
  throwsError:     string | null;
  onChainHarvests: OnChainHarvest[];
  local:           LocalState;
}

type AppAction =
  | { type: "SET_CONFIRMED";   payload: UnifiedThrow[]   }
  | { type: "SET_PENDING";     payload: UnifiedThrow[]   }
  | { type: "SET_LOADING";     payload: boolean          }
  | { type: "SET_ERROR";       payload: string | null    }
  | { type: "MERGE_HARVESTS";  payload: OnChainHarvest[] }
  | { type: "ADD_HARVEST";     payload: OnChainHarvest   }
  | { type: "CONFIRM_HARVEST"; payload: { placeholderTxId: string; realTxId: string } }
  | { type: "REMOVE_HARVEST";  payload: string           }
  | { type: "SET_LOCAL";       payload: LocalState       }
  | { type: "RESET" };

const EMPTY_LOCAL: LocalState = { observations: [], notifications: [] };

function initialState(): AppState {
  return {
    confirmedThrows: [],
    pendingThrows:   [],
    throwsLoading:   false,
    throwsError:     null,
    onChainHarvests: [],
    local:           EMPTY_LOCAL,
  };
}

function mergeHarvests(
  existing: OnChainHarvest[],
  incoming: OnChainHarvest[]
): OnChainHarvest[] {
  const map = new Map<string, OnChainHarvest>();
  for (const h of existing) map.set(h.txId, h);
  for (const h of incoming) map.set(h.txId, h);
  return [...map.values()].sort((a, b) => {
    const ap = a.txId.startsWith("pending-");
    const bp = b.txId.startsWith("pending-");
    if (ap && !bp) return -1;
    if (!ap && bp) return  1;
    return new Date(b.harvestedAt).getTime() - new Date(a.harvestedAt).getTime();
  });
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CONFIRMED":
      return { ...state, confirmedThrows: action.payload };
    case "SET_PENDING":
      return { ...state, pendingThrows: action.payload };
    case "SET_LOADING":
      return { ...state, throwsLoading: action.payload };
    case "SET_ERROR":
      return { ...state, throwsError: action.payload };
    case "MERGE_HARVESTS": {
      const next = mergeHarvests(state.onChainHarvests, action.payload);
      console.log("[reducer] MERGE_HARVESTS existing:", state.onChainHarvests.length, "incoming:", action.payload.length, "result:", next.length);
      return { ...state, onChainHarvests: next };
    }
    case "ADD_HARVEST": {
      const next = [action.payload, ...state.onChainHarvests];
      console.log("[reducer] ADD_HARVEST total now:", next.length);
      return { ...state, onChainHarvests: next };
    }
    case "CONFIRM_HARVEST":
      return {
        ...state,
        onChainHarvests: state.onChainHarvests.map((h) =>
          h.txId === action.payload.placeholderTxId
            ? { ...h, txId: action.payload.realTxId }
            : h
        ),
      };
    case "REMOVE_HARVEST":
      return {
        ...state,
        onChainHarvests: state.onChainHarvests.filter(
          (h) => h.txId !== action.payload
        ),
      };
    case "SET_LOCAL":
      return { ...state, local: action.payload };
    case "RESET":
      console.log("[reducer] RESET");
      return initialState();
    default:
      return state;
  }
}

// ── localStorage helpers ─────────────────────────────────────────────────────

function confirmedKey(address: string) { return `eden-confirmed-v3-${address}`; }
function pendingKey(address: string)   { return `eden-pending-v3-${address}`;   }
function harvestsKey(address: string)  { return `eden-harvests-v3-${address}`;  }

function loadConfirmed(address: string): UnifiedThrow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(confirmedKey(address));
    if (!raw) return [];
    return (JSON.parse(raw) as UnifiedThrow[]).map((t) => ({
      ...t,
      isPending: false,
    }));
  } catch { return []; }
}

function saveConfirmed(address: string, throws: UnifiedThrow[]) {
  if (typeof window === "undefined") return;
  try {
    const clean = throws
      .filter((t) => t.asaId > 0)
      .map((t) => ({ ...t, isPending: false }));
    localStorage.setItem(confirmedKey(address), JSON.stringify(clean));
  } catch {}
}

function loadPending(address: string): UnifiedThrow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(pendingKey(address));
    if (!raw) return [];
    const cutoff = Date.now() - 5 * 60 * 1000;
    return (JSON.parse(raw) as UnifiedThrow[])
      .filter((t) => !t.createdAt || t.createdAt > cutoff)
      .map((t) => ({ ...t, isPending: true }));
  } catch { return []; }
}

function savePending(address: string, throws: UnifiedThrow[]) {
  if (typeof window === "undefined") return;
  try {
    if (throws.length === 0) localStorage.removeItem(pendingKey(address));
    else localStorage.setItem(pendingKey(address), JSON.stringify(throws));
  } catch {}
}

function loadHarvests(address: string): OnChainHarvest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(harvestsKey(address));
    const parsed = raw ? (JSON.parse(raw) as OnChainHarvest[]) : [];
    console.log("[loadHarvests] key:", harvestsKey(address), "count:", parsed.length, parsed);
    return parsed;
  } catch { return []; }
}

function saveHarvests(address: string, harvests: OnChainHarvest[]) {
  if (typeof window === "undefined") return;
  try {
    console.log("[saveHarvests] key:", harvestsKey(address), "count:", harvests.length, harvests);
    localStorage.setItem(harvestsKey(address), JSON.stringify(harvests));
  } catch {}
}

// ── Context ──────────────────────────────────────────────────────────────────

const AppCtx = createContext<AppCtxType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { address } = useWallet();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const mountedRef           = useRef(true);
  const pollRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedCountAtMint = useRef(0);
  const confirmedRef         = useRef<UnifiedThrow[]>([]);
  const harvestsReadyRef     = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    confirmedRef.current = state.confirmedThrows;
  }, [state.confirmedThrows]);

  useEffect(() => {
    console.log("[persist effect] address:", address, "ready:", harvestsReadyRef.current, "harvests:", state.onChainHarvests.length);
    if (!address || !harvestsReadyRef.current) return;
    saveHarvests(address, state.onChainHarvests);
  }, [address, state.onChainHarvests]);

  const reload = useCallback(() => {
    dispatch({ type: "SET_LOCAL", payload: loadLocal() });
  }, []);

  useEffect(() => {
    reload();
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const doFetch = useCallback(
    async (addr: string): Promise<UnifiedThrow[]> => {
      console.log("[doFetch] fetching for", addr);
      const [fetched, harvests] = await Promise.all([
        fetchThrowsForAddress(addr),
        fetchHarvestsForAddress(addr),
      ]);

      console.log("[doFetch] indexer returned", harvests.length, "harvests:", harvests);

      if (!mountedRef.current) return [];

      const unified: UnifiedThrow[] = fetched.map((t) => ({
        ...t,
        localId:   `chain-${t.asaId}`,
        isPending: false,
      }));

      saveConfirmed(addr, unified);
      dispatch({ type: "SET_CONFIRMED",  payload: unified  });
      dispatch({ type: "MERGE_HARVESTS", payload: harvests });
      dispatch({ type: "SET_ERROR",      payload: null     });

      dispatch({
        type: "SET_PENDING",
        payload: (() => {
          const current      = loadPending(addr);
          if (current.length === 0) return current;
          const confirmedIds = new Set(unified.map((t) => t.asaId));
          const stillPending = current.filter((p) => {
            if (p.asaId > 0 && confirmedIds.has(p.asaId))     return false;
            if (unified.length > confirmedCountAtMint.current) return false;
            return true;
          });
          savePending(addr, stillPending);
          if (stillPending.length === 0) stopPolling();
          return stillPending;
        })(),
      });

      for (const t of unified) {
        seedNotifications(`chain-${t.asaId}`, t.throwDate, t.growthModelId);
      }
      reload();
      return unified;
    },
    [reload, stopPolling]
  );

  const startPolling = useCallback(
    (addr: string) => {
      stopPolling();
      let ticks = 0;
      pollRef.current = setInterval(async () => {
        ticks++;
        if (ticks > 60) {
          stopPolling();
          savePending(addr, []);
          dispatch({ type: "SET_PENDING", payload: [] });
          return;
        }
        try { await doFetch(addr); } catch {}
      }, 5_000);
    },
    [stopPolling, doFetch]
  );

  useEffect(() => {
    if (!address) {
      harvestsReadyRef.current = false;
      dispatch({ type: "RESET" });
      stopPolling();
      return;
    }

    console.log("[wallet effect] address changed to", address);

    const cached   = loadConfirmed(address);
    const pending  = loadPending(address);
    const harvests = loadHarvests(address);

    console.log("[wallet effect] loaded harvests from cache:", harvests.length, harvests);

    confirmedCountAtMint.current = cached.length;
    confirmedRef.current         = cached;

    dispatch({ type: "SET_CONFIRMED",  payload: cached   });
    dispatch({ type: "SET_PENDING",    payload: pending  });
    dispatch({ type: "MERGE_HARVESTS", payload: harvests });
    harvestsReadyRef.current = true;
    console.log("[wallet effect] harvestsReadyRef set to true");

    doFetch(address).catch((e) => {
      if (mountedRef.current)
        dispatch({
          type:    "SET_ERROR",
          payload: e instanceof Error ? e.message : "Fetch failed",
        });
    });

    if (pending.length > 0) startPolling(address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const refreshThrows = useCallback(async () => {
    if (!address) return;
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await doFetch(address);
    } catch (e) {
      if (mountedRef.current)
        dispatch({
          type:    "SET_ERROR",
          payload: e instanceof Error ? e.message : "Fetch failed",
        });
    } finally {
      if (mountedRef.current)
        dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [address, doFetch]);

  const addPendingThrow = useCallback(
    (t: UnifiedThrow) => {
      if (!address) return;
      confirmedCountAtMint.current = confirmedRef.current.length;
      const stamped: UnifiedThrow  = { ...t, isPending: true, createdAt: Date.now() };
      const next = [stamped, ...loadPending(address)];
      dispatch({ type: "SET_PENDING", payload: next });
      savePending(address, next);
      startPolling(address);
    },
    [address, startPolling]
  );

  const addObservation = useCallback(
    (data: Omit<Observation, "id" | "observedAt">) => {
      storeAddObs(data);
      reload();
    },
    [reload]
  );

  const addOptimisticHarvest = useCallback((h: OnChainHarvest) => {
    console.log("[addOptimisticHarvest]", h);
    dispatch({ type: "ADD_HARVEST", payload: h });
  }, []);

  const confirmHarvest = useCallback(
    (placeholderTxId: string, realTxId: string) => {
      console.log("[confirmHarvest] placeholder:", placeholderTxId, "-> real:", realTxId);
      dispatch({
        type:    "CONFIRM_HARVEST",
        payload: { placeholderTxId, realTxId },
      });
    },
    []
  );

  const removeHarvest = useCallback((txId: string) => {
    console.log("[removeHarvest]", txId);
    dispatch({ type: "REMOVE_HARVEST", payload: txId });
  }, []);

  const markRead = useCallback(
    (id: string) => { storeMark(id); reload(); },
    [reload]
  );

  const markAllReadFn = useCallback(
    () => { storeMarkAll(); reload(); },
    [reload]
  );

  const confirmedAsaIds = new Set(state.confirmedThrows.map((t) => t.asaId));
  const filteredPending = state.pendingThrows.filter(
    (p) => p.asaId === 0 || !confirmedAsaIds.has(p.asaId)
  );
  const allThrows = [...filteredPending, ...state.confirmedThrows];
  const due       = getDueNotifications(state.local.notifications);

  return (
    <AppCtx.Provider
      value={{
        userName:             "",
        throws:               allThrows,
        throwsLoading:        state.throwsLoading,
        throwsError:          state.throwsError,
        refreshThrows,
        addPendingThrow,
        observations:         state.local.observations,
        addObservation,
        onChainHarvests:      state.onChainHarvests,
        addOptimisticHarvest,
        confirmHarvest,
        removeHarvest,
        notifications:        state.local.notifications,
        unreadCount:          due.length,
        markRead,
        markAllRead:          markAllReadFn,
        reload,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp(): AppCtxType {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
