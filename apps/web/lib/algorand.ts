import algosdk from "algosdk";

export const EXPLORER_BASE = "https://testnet.explorer.perawallet.app";

const ALGOD_SERVER   = "https://testnet-api.algonode.cloud";
const INDEXER_SERVER = "https://testnet-idx.algonode.cloud";

let _algod:   algosdk.Algodv2 | null = null;
let _indexer: algosdk.Indexer  | null = null;
let _pera:    import("@perawallet/connect").PeraWalletConnect | null = null;

export function getAlgod(): algosdk.Algodv2 {
  if (!_algod)
    _algod = new algosdk.Algodv2("", ALGOD_SERVER, 443);
  return _algod;
}

export function getIndexer(): algosdk.Indexer {
  if (!_indexer)
    _indexer = new algosdk.Indexer("", INDEXER_SERVER, 443);
  return _indexer;
}

export async function getPera(): Promise<
  import("@perawallet/connect").PeraWalletConnect
> {
  if (typeof window === "undefined")
    throw new Error("getPera is browser-only");
  if (!_pera) {
    const { PeraWalletConnect } = await import("@perawallet/connect");
    _pera = new PeraWalletConnect({
      network:               "testnet",
      shouldShowSignTxnToast: true,
    });
  }
  return _pera;
}

export function shortenAddress(addr: string, n = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, n)}...${addr.slice(-n)}`;
}

export function explorerAssetUrl(id: number): string {
  return `${EXPLORER_BASE}/asset/${id}`;
}

export function explorerTxUrl(txId: string): string {
  return `${EXPLORER_BASE}/tx/${txId}`;
}

function sanitiseForJson(val: unknown): unknown {
  if (typeof val === "bigint") return Number(val);
  if (Array.isArray(val))     return val.map(sanitiseForJson);
  if (val !== null && typeof val === "object") {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitiseForJson(v),
      ])
    );
  }
  return val;
}

function buildNote(
  type:  string,
  props: Record<string, unknown>
): Uint8Array {
  const safeProps = sanitiseForJson(props) as Record<string, unknown>;
  return new TextEncoder().encode(
    JSON.stringify({
      standard:     "arc69",
      description:  `Eden Pods — ${type}`,
      external_url: "https://edenpods.earth",
      properties:   { ...safeProps, eden_type: type, eden_version: 1 },
    })
  );
}

function parseNote(note: unknown): Record<string, unknown> | null {
  try {
    let str: string;
    if (note instanceof Uint8Array) {
      str = new TextDecoder().decode(note);
    } else if (typeof note === "string") {
      str = atob(note);
    } else {
      return null;
    }
    const obj = JSON.parse(str);
    if (obj?.standard === "arc69" && obj?.properties?.eden_type)
      return obj.properties as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export interface ThrowMetadata {
  podTypeId:     string;
  podTypeName:   string;
  podTypeIcon:   string;
  throwDate:     string;
  locationLabel: string;
  growthModelId: string;
  thrownBy:      string;
  version:       number;
}

export interface OnChainThrow {
  asaId:         number;
  txId:          string;
  throwDate:     string;
  podTypeId:     string;
  podTypeName:   string;
  podTypeIcon:   string;
  locationLabel: string;
  growthModelId: string;
  thrownBy:      string;
  confirmedAt:   string;
  explorerUrl:   string;
}

export interface OnChainHarvest {
  txId:          string;
  throwAsaId:    number;
  plantId:       string;
  quantityClass: "small" | "medium" | "large";
  harvestedAt:   string;
  notes:         string;
  confirmedAt:   string;
}

export async function buildMintThrowTxns(params: {
  senderAddress: string;
  metadata:      ThrowMetadata;
}): Promise<algosdk.Transaction[]> {
  if (!params.senderAddress) throw new Error("Wallet not connected");
  const sp   = await getAlgod().getTransactionParams().do();
  const name = `Eden Throw ${params.metadata.podTypeIcon} ${params.metadata.podTypeName}`.slice(0, 32);
  const txn  = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender:          params.senderAddress,
    assetName:       name,
    unitName:        "THROW",
    total:           1n,
    decimals:        0,
    defaultFrozen:   false,
    manager:         params.senderAddress,
    reserve:         params.senderAddress,
    assetURL:        "https://edenpods.earth",
    note:            buildNote("throw", params.metadata as unknown as Record<string, unknown>),
    suggestedParams: sp,
  });
  return [txn];
}

export async function buildHarvestTxn(
  senderAddress: string,
  props: {
    throwAsaId:    number;
    plantId:       string;
    quantityClass: string;
    harvestedAt:   string;
    notes:         string;
  }
): Promise<algosdk.Transaction> {
  if (!senderAddress) throw new Error("Wallet not connected");
  const sp = await getAlgod().getTransactionParams().do();
  const safeProps = {
    ...props,
    throwAsaId: Number(props.throwAsaId),
  };
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender:          senderAddress,
    receiver:        senderAddress,
    amount:          0n,
    note:            buildNote("harvest", safeProps),
    suggestedParams: sp,
  });
}

export async function signAndSendTxns(
  txns:          algosdk.Transaction[],
  senderAddress: string
): Promise<{ txIds: string[]; assetId?: number }> {
  if (!senderAddress) throw new Error("Wallet not connected");

  const pera  = await getPera();
  const algod = getAlgod();

  if (txns.length > 1) algosdk.assignGroupID(txns);

  const toSign = txns.map((txn) => ({ txn, signers: [senderAddress] }));
  const signed: Uint8Array[] = await pera.signTransaction([toSign]);

  const txIds:   string[]        = [];
  let   assetId: number | undefined;

  for (const s of signed) {
    const { txid } = await algod.sendRawTransaction(s).do();
    txIds.push(txid);

    const result = await algosdk.waitForConfirmation(algod, txid, 4);

    console.debug(
      "[eden] confirmation result",
      JSON.stringify(sanitiseForJson(result))
    );

    const raw = result as Record<string, unknown>;
    const id  =
      (raw["assetIndex"]  as bigint | number | undefined) ??
      (raw["asset-index"] as bigint | number | undefined);

    if (id != null) assetId = Number(id);
  }

  return { txIds, assetId };
}

const FETCH_BATCH = 5;

async function processAsset(
  // Accept number|bigint so callers don't need to pre-coerce
  assetIndex: number | bigint
): Promise<OnChainThrow | null> {
  // Normalise to plain number immediately — this is the value stored in
  // asaId and used for all comparisons and localStorage.
  const asaId = Number(assetIndex);
  try {
    const indexer = getIndexer();
    const txResp  = await indexer
      .searchForTransactions()
      .assetID(asaId)
      .txType("acfg")
      .do();

    const txns =
      (txResp as { transactions?: Record<string, unknown>[] }).transactions ?? [];
    if (!txns.length) return null;

    for (const tx of [...txns].reverse()) {
      if (!tx.note) continue;
      const props = parseNote(tx.note);
      if (!props || props.eden_type !== "throw") continue;
      const rt = (tx["round-time"] as number) ?? 0;
      return {
        // Always a plain JS number
        asaId,
        txId:          tx.id as string,
        throwDate:     (props.throwDate     as string) ?? new Date(rt * 1000).toISOString(),
        podTypeId:     (props.podTypeId     as string) ?? "",
        podTypeName:   (props.podTypeName   as string) ?? "",
        podTypeIcon:   (props.podTypeIcon   as string) ?? "🌱",
        locationLabel: (props.locationLabel as string) ?? "",
        growthModelId: (props.growthModelId as string) ?? "temperate-herb",
        thrownBy:      (props.thrownBy      as string) ?? "",
        confirmedAt:   new Date(rt * 1000).toISOString(),
        explorerUrl:   explorerAssetUrl(asaId),
      };
    }
    return null;
  } catch (e) {
    console.warn("[fetchThrows] error on asset", asaId, e);
    return null;
  }
}

export async function fetchThrowsForAddress(
  address: string
): Promise<OnChainThrow[]> {
  const indexer = getIndexer();
  const resp    = await indexer.searchForAssets().creator(address).do();

  // algosdk v3 returns asset index as bigint — coerce to number here so
  // the rest of the app only ever sees plain JS numbers for asaId.
  const assets = (
    resp as { assets?: { index: number | bigint }[] }
  ).assets ?? [];

  const out: OnChainThrow[] = [];

  for (let i = 0; i < assets.length; i += FETCH_BATCH) {
    const batch   = assets.slice(i, i + FETCH_BATCH);
    const results = await Promise.allSettled(
      // Pass Number(a.index) — processAsset also coerces but belt-and-suspenders
      batch.map((a) => processAsset(Number(a.index)))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value !== null) {
        out.push(r.value);
      }
    }
  }

  return out.sort(
    (a, b) =>
      new Date(b.throwDate).getTime() - new Date(a.throwDate).getTime()
  );
}

export async function fetchHarvestsForAddress(
  address: string
): Promise<OnChainHarvest[]> {
  const out: OnChainHarvest[] = [];
  try {
    const indexer = getIndexer();
    const resp    = await indexer
      .searchForTransactions()
      .address(address)
      .addressRole("sender")
      .txType("pay")
      .do();

    const txns =
      (resp as { transactions?: Record<string, unknown>[] }).transactions ?? [];

    for (const txn of txns) {
      if (!txn.note) continue;
      const props = parseNote(txn.note);
      if (!props || props.eden_type !== "harvest") continue;
      const rt = (txn["round-time"] as number) ?? 0;
      out.push({
        txId: txn.id as string,
        // Coerce to plain number — props.throwAsaId may be number or string
        // depending on how algosdk decoded the note JSON.
        throwAsaId:    Number(props.throwAsaId    ?? 0),
        plantId:       (props.plantId       as string)                        ?? "",
        quantityClass: (props.quantityClass as "small" | "medium" | "large") ?? "small",
        harvestedAt:   (props.harvestedAt   as string)                        ?? new Date(rt * 1000).toISOString(),
        notes:         (props.notes         as string)                        ?? "",
        confirmedAt:   new Date(rt * 1000).toISOString(),
      });
    }
  } catch (e) {
    console.warn("fetchHarvests failed:", e);
  }

  return out.sort(
    (a, b) =>
      new Date(b.harvestedAt).getTime() - new Date(a.harvestedAt).getTime()
  );
}
