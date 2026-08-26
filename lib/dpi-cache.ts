import { Connection, PublicKey } from "@solana/web3.js";
import { getHandleRegistryPDA, getReverseLookupPDA } from "./dpi-program";

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const handleCache = new Map<string, CacheEntry<{ owner: string; frozen: boolean } | null>>();
const reverseCache = new Map<string, CacheEntry<string | null>>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function lookupHandleCached(
  connection: Connection,
  handle: string
): Promise<{ owner: string; frozen: boolean } | null> {
  const normalized = handle.toLowerCase().trim();
  const cached = handleCache.get(normalized);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    const [handlePDA] = getHandleRegistryPDA(normalized);
    const info = await connection.getAccountInfo(handlePDA);
    if (!info?.data) {
      handleCache.set(normalized, { data: null, expiry: now + CACHE_TTL_MS });
      return null;
    }

    const d = info.data;
    const owner = new PublicKey(d.slice(8, 40)).toBase58();
    const strLen = d.readUInt32LE(40);
    const frozen = d[44 + strLen + 1] === 1;

    const result = { owner, frozen };
    handleCache.set(normalized, { data: result, expiry: now + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.warn("Error resolving handle:", err);
    return null;
  }
}

export async function lookupReverseCached(
  connection: Connection,
  owner: PublicKey
): Promise<string | null> {
  const keyStr = owner.toBase58();
  const cached = reverseCache.get(keyStr);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    const [reversePDA] = getReverseLookupPDA(owner);
    const info = await connection.getAccountInfo(reversePDA);
    if (!info?.data) {
      reverseCache.set(keyStr, { data: null, expiry: now + CACHE_TTL_MS });
      return null;
    }

    const data = info.data;
    const strLen = data.readUInt32LE(8 + 32);
    const handleStr = data.slice(8 + 32 + 4, 8 + 32 + 4 + strLen).toString("utf-8");

    reverseCache.set(keyStr, { data: handleStr, expiry: now + CACHE_TTL_MS });
    return handleStr;
  } catch (err) {
    console.warn("Error resolving reverse lookup:", err);
    return null;
  }
}

export function invalidateHandleCache(handle?: string, owner?: PublicKey) {
  if (handle) {
    handleCache.delete(handle.toLowerCase().trim());
  }
  if (owner) {
    reverseCache.delete(owner.toBase58());
  }
}
