"use client";

import { useState, useEffect } from "react";

export interface TokenPrices {
  SOL: number;
  USDC: number;
  EURC: number;
  PYUSD: number;
  [key: string]: number;
}

const DEFAULT_PRICES: TokenPrices = {
  SOL: 145.0,
  USDC: 1.0,
  EURC: 1.08,
  PYUSD: 1.0,
};

const CACHE_KEY = "dpi_price_cache";
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

interface CachedPrices {
  timestamp: number;
  prices: TokenPrices;
}

let memoryCache: CachedPrices | null = null;

export async function fetchTokenPrices(): Promise<TokenPrices> {
  const now = Date.now();

  // Check in-memory cache first
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.prices;
  }

  // Check localStorage cache
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed: CachedPrices = JSON.parse(stored);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache = parsed;
          return parsed.prices;
        }
      }
    } catch {}
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,euro-coin,paypal-usd&vs_currencies=usd",
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const prices: TokenPrices = {
        SOL: data.solana?.usd ?? DEFAULT_PRICES.SOL,
        USDC: data["usd-coin"]?.usd ?? DEFAULT_PRICES.USDC,
        EURC: data["euro-coin"]?.usd ?? DEFAULT_PRICES.EURC,
        PYUSD: data["paypal-usd"]?.usd ?? DEFAULT_PRICES.PYUSD,
      };

      const entry: CachedPrices = { timestamp: now, prices };
      memoryCache = entry;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        } catch {}
      }

      return prices;
    }
  } catch {
    // Return cached or default if network fails
  }

  if (memoryCache) {
    return memoryCache.prices;
  }

  return DEFAULT_PRICES;
}

export function usePrices() {
  const [prices, setPrices] = useState<TokenPrices>(() => {
    if (memoryCache) return memoryCache.prices;
    return DEFAULT_PRICES;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      const p = await fetchTokenPrices();
      if (!ignore) {
        setPrices(p);
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const formatUsd = (amount: number | null | undefined, symbol: string): string => {
    if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
      return "$0.00";
    }
    const rate = prices[symbol.toUpperCase()] ?? (symbol.toUpperCase() === "SOL" ? prices.SOL : 1.0);
    const usdVal = amount * rate;
    if (usdVal < 0.01 && usdVal > 0) {
      return "< $0.01";
    }
    return `$${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getUsdValue = (amount: number | null | undefined, symbol: string): number => {
    if (!amount || isNaN(amount)) return 0;
    const rate = prices[symbol.toUpperCase()] ?? (symbol.toUpperCase() === "SOL" ? prices.SOL : 1.0);
    return amount * rate;
  };

  return { prices, loading, formatUsd, getUsdValue };
}
