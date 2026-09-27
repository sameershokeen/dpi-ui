export const TOKEN_STANDARD_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export interface TokenExtensionInfo {
  type: "transferFee" | "interestBearing" | "confidentialTransfer" | "memoTransfer";
  details?: string;
}

export interface TokenInfo {
  symbol: string;
  decimals: number;
  mint: string;
  name: string;
  programId: string;
  isToken2022?: boolean;
  extensions?: TokenExtensionInfo[];
}

export const PREDEFINED_TOKENS: Record<string, TokenInfo> = {
  SOL: {
    symbol: "SOL",
    decimals: 9,
    mint: "",
    name: "Solana (Native)",
    programId: "11111111111111111111111111111111",
    isToken2022: false,
  },
  USDC: {
    symbol: "USDC",
    decimals: 6,
    mint: "4zMMC9zT5H24GsmVBtBq7B8RFKu1e79mksqtCRRjh482",
    name: "USD Coin (Circle Devnet)",
    programId: TOKEN_STANDARD_PROGRAM_ID,
    isToken2022: false,
  },
  EURC: {
    symbol: "EURC",
    decimals: 6,
    mint: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
    name: "EURC (Circle Devnet)",
    programId: TOKEN_STANDARD_PROGRAM_ID,
    isToken2022: false,
  },
  PYUSD: {
    symbol: "PYUSD",
    decimals: 6,
    mint: "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM",
    name: "PayPal USD (Devnet)",
    programId: TOKEN_STANDARD_PROGRAM_ID,
    isToken2022: false,
  },
};

export const KNOWN_MINTS: Record<
  string,
  {
    symbol: string;
    name: string;
    decimals: number;
    programId?: string;
    isToken2022?: boolean;
    extensions?: TokenExtensionInfo[];
  }
> = {
  "4zMMC9zT5H24GsmVBtBq7B8RFKu1e79mksqtCRRjh482": {
    symbol: "USDC",
    name: "USD Coin (Circle Devnet)",
    decimals: 6,
    programId: TOKEN_STANDARD_PROGRAM_ID,
    isToken2022: false,
  },
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
    symbol: "USDC",
    name: "USD Coin (Circle Devnet Alternate)",
    decimals: 6,
    programId: TOKEN_STANDARD_PROGRAM_ID,
    isToken2022: false,
  },
  HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr: {
    symbol: "EURC",
    name: "EURC (Circle Devnet)",
    decimals: 6,
    programId: TOKEN_STANDARD_PROGRAM_ID,
    isToken2022: false,
  },
  CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM: {
    symbol: "PYUSD",
    name: "PayPal USD (Devnet)",
    decimals: 6,
    programId: TOKEN_STANDARD_PROGRAM_ID,
    isToken2022: false,
  },
};

export function isToken2022Program(programId?: string): boolean {
  return programId === TOKEN_2022_PROGRAM_ID;
}

export function getTokenMetaByMint(mint: string): {
  symbol: string;
  name: string;
  decimals: number;
  isToken2022?: boolean;
  programId?: string;
} {
  if (KNOWN_MINTS[mint]) {
    return KNOWN_MINTS[mint];
  }
  return {
    symbol: mint ? `SPL (${mint.slice(0, 4)}...${mint.slice(-4)})` : "Token",
    name: "SPL Token",
    decimals: 6,
    isToken2022: false,
    programId: TOKEN_STANDARD_PROGRAM_ID,
  };
}

export function isKnownTokenMint(mint: string): boolean {
  return Boolean(KNOWN_MINTS[mint]);
}
