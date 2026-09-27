import { Connection, PublicKey } from "@solana/web3.js";
import {
  getHandlePda,
  getReverseLookupPda,
  getDpiProgram,
} from "./dpi-program.ts";

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const handleCache = new Map<string, CacheEntry<{ owner: string; frozen: boolean } | null>>();
const reverseCache = new Map<string, CacheEntry<string | null>>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Helper to safely access sessionStorage
function getSessionItem<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.expiry === "number") {
      return parsed as CacheEntry<T>;
    }
  } catch {
    // Ignore storage parse/access errors
  }
  return null;
}

function setSessionItem<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage quota errors
  }
}

function removeSessionItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

export async function lookupHandleCached(
  connection: Connection,
  handle: string,
  skipCache: boolean = false
): Promise<{ owner: string; frozen: boolean } | null> {
  const normalized = handle.toLowerCase().trim();
  const now = Date.now();

  if (!skipCache) {
    // 1. Check in-memory cache
    const cached = handleCache.get(normalized);
    if (cached && cached.expiry > now) {
      return cached.data;
    }

    // 2. Check sessionStorage fallback
    const sessionCached = getSessionItem<{ owner: string; frozen: boolean } | null>(`dpi_h_${normalized}`);
    if (sessionCached && sessionCached.expiry > now) {
      handleCache.set(normalized, sessionCached);
      return sessionCached.data;
    }
  }

  // 3. Query on-chain RPC
  try {
    const [handlePDA] = getHandlePda(normalized);
    const program = getDpiProgram(connection);
    const acc = await program.account.handleRegistry.fetchNullable(handlePDA);

    if (!acc) {
      const entry = { data: null, expiry: now + CACHE_TTL_MS };
      handleCache.set(normalized, entry);
      setSessionItem(`dpi_h_${normalized}`, entry);
      return null;
    }

    const result = {
      owner: acc.owner.toBase58(),
      frozen: Boolean(acc.frozen),
    };
    const entry = { data: result, expiry: now + CACHE_TTL_MS };
    handleCache.set(normalized, entry);
    setSessionItem(`dpi_h_${normalized}`, entry);
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
  const now = Date.now();

  // 1. Check in-memory cache
  const cached = reverseCache.get(keyStr);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  // 2. Check sessionStorage fallback
  const sessionCached = getSessionItem<string | null>(`dpi_r_${keyStr}`);
  if (sessionCached && sessionCached.expiry > now) {
    reverseCache.set(keyStr, sessionCached);
    return sessionCached.data;
  }

  // 3. Query on-chain RPC
  try {
    const [reversePDA] = getReverseLookupPda(owner);
    const program = getDpiProgram(connection);
    const acc = await program.account.reverseLookup.fetchNullable(reversePDA);

    if (!acc || !acc.handle) {
      const entry = { data: null, expiry: now + CACHE_TTL_MS };
      reverseCache.set(keyStr, entry);
      setSessionItem(`dpi_r_${keyStr}`, entry);
      return null;
    }

    const handleStr = acc.handle;
    const entry = { data: handleStr, expiry: now + CACHE_TTL_MS };
    reverseCache.set(keyStr, entry);
    setSessionItem(`dpi_r_${keyStr}`, entry);
    return handleStr;
  } catch (err) {
    console.warn("Error resolving reverse lookup:", err);
    return null;
  }
}

export function invalidateHandleCache(handle?: string, owner?: PublicKey) {
  if (handle) {
    const normalized = handle.toLowerCase().trim();
    handleCache.delete(normalized);
    removeSessionItem(`dpi_h_${normalized}`);
  }
  if (owner) {
    const keyStr = owner.toBase58();
    reverseCache.delete(keyStr);
    removeSessionItem(`dpi_r_${keyStr}`);
  }
}
