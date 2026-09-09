import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import dpiIdl from "./dpi_registry.json";
import type { DpiRegistry } from "@/types/dpi_registry";

export const PROGRAM_ID = new PublicKey(
  "CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc"
);

// Backward-compatible alias
export const DPI_PROGRAM_ID = PROGRAM_ID;

export const SEEDS = {
  CONFIG: Buffer.from("config"),
  HANDLE: Buffer.from("handle"),
  REVERSE: Buffer.from("reverse"),
  RESERVED: Buffer.from("reserved"),
};

export const CONFIG_SEED = SEEDS.CONFIG;
export const HANDLE_SEED = SEEDS.HANDLE;
export const REVERSE_SEED = SEEDS.REVERSE;
export const RESERVED_SEED = SEEDS.RESERVED;

export const MIN_HANDLE_LEN = 3;
export const MAX_HANDLE_LEN = 32;
export const MAX_BATCH_RESERVE = 20;

export const RESERVED_WORDS = [
  "admin",
  "support",
  "help",
  "security",
  "dpi",
  "team",
];

// Backward-compatible alias
export const RESERVED_HANDLES = RESERVED_WORDS;

// ==========================================
// 1. PDA Derivation Map
// ==========================================

export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.CONFIG], PROGRAM_ID);
}

export function getHandlePda(handle: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.HANDLE, Buffer.from(handle.trim().toLowerCase())],
    PROGRAM_ID
  );
}

export function getReverseLookupPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.REVERSE, wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getReservedHandlePda(handle: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.RESERVED, Buffer.from(handle.trim().toLowerCase())],
    PROGRAM_ID
  );
}

// Aliases matching frontend.md recipes exactly
export const deriveConfigPda = getConfigPda;
export const deriveHandlePda = getHandlePda;
export const deriveReverseLookupPda = getReverseLookupPda;
export const deriveReservedHandlePda = getReservedHandlePda;

// Backward-compatible uppercase aliases
export const getConfigPDA = getConfigPda;
export const getHandleRegistryPDA = getHandlePda;
export const getReverseLookupPDA = getReverseLookupPda;
export const getReservedHandlePDA = getReservedHandlePda;

// ==========================================
// 2. Client-Side Validation Rules
// ==========================================

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateHandleInput(raw: string): { valid: boolean; error?: string } {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (raw !== trimmed) {
    return { valid: false, error: "Handle cannot contain leading or trailing spaces" };
  }
  if (raw !== lower) {
    return { valid: false, error: "Handle must be completely lowercase" };
  }
  if (lower.length < MIN_HANDLE_LEN) {
    return { valid: false, error: `Handle too short (minimum ${MIN_HANDLE_LEN} characters)` };
  }
  if (lower.length > MAX_HANDLE_LEN) {
    return { valid: false, error: `Handle too long (maximum ${MAX_HANDLE_LEN} characters)` };
  }
  if (RESERVED_WORDS.includes(lower)) {
    return { valid: false, error: `"${lower}" is a reserved system handle` };
  }
  if (!/^[a-z0-9_-]+$/.test(lower)) {
    return { valid: false, error: "Only letters (a-z), numbers (0-9), '_' and '-' are allowed" };
  }
  return { valid: true };
}

// Dual-format validation function for frontend.md compatibility
export function validateHandle(handle: string): any {
  const res = validateHandleInput(handle);
  // If called in boolean context or object check
  return {
    valid: res.valid,
    error: res.error,
    // Allows string truthiness check if used as string validator
    toString: () => res.error || "",
  };
}

// ==========================================
// 3. Anchor Program Factory
// ==========================================

export interface WalletLike {
  publicKey: PublicKey | null;
  signTransaction?: (tx: any) => Promise<any>;
  signAllTransactions?: (txs: any[]) => Promise<any[]>;
}

export function getDpiProgram(
  connection: Connection,
  wallet?: WalletLike | null
): Program<DpiRegistry> {
  const dummyWallet = {
    publicKey: wallet?.publicKey || PublicKey.default,
    signTransaction: wallet?.signTransaction || (async (tx: any) => tx),
    signAllTransactions: wallet?.signAllTransactions || (async (txs: any[]) => txs),
  };
  const provider = new AnchorProvider(connection, dummyWallet as any, {
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
  return new Program<DpiRegistry>(dpiIdl as any, provider);
}

// Export raw IDL
export const DPI_IDL = dpiIdl;

// ==========================================
// 4. User Protocol Features
// ==========================================

export type HandleStatus =
  | { state: "AVAILABLE" }
  | { state: "RESERVED" }
  | { state: "REGISTERED"; owner: PublicKey; frozen: boolean };

/** Feature 1: Handle Search & Availability Checker */
export async function checkHandleAvailability(
  program: Program<DpiRegistry>,
  handle: string
): Promise<HandleStatus> {
  const normalized = handle.trim().toLowerCase();

  // 1. Check static reserved handles
  if (RESERVED_WORDS.includes(normalized)) {
    return { state: "RESERVED" };
  }

  // 2. Check on-chain ReservedHandle PDA
  const [reservedPda] = getReservedHandlePda(normalized);
  try {
    const reservedAcc = await program.account.reservedHandle.fetchNullable(reservedPda);
    if (reservedAcc) {
      return { state: "RESERVED" };
    }
  } catch {}

  // 3. Check on-chain HandleRegistry PDA
  const [handlePda] = getHandlePda(normalized);
  try {
    const handleAcc = await program.account.handleRegistry.fetchNullable(handlePda);
    if (handleAcc) {
      return {
        state: "REGISTERED",
        owner: handleAcc.owner,
        frozen: Boolean(handleAcc.frozen),
      };
    }
  } catch {}

  return { state: "AVAILABLE" };
}

// Backward-compatible alias
export async function checkAvailability(
  program: Program<DpiRegistry>,
  handle: string
) {
  const status = await checkHandleAvailability(program, handle);
  if (status.state === "RESERVED") return { status: "RESERVED" as const };
  if (status.state === "REGISTERED") {
    return {
      status: "TAKEN" as const,
      owner: status.owner,
      frozen: status.frozen,
    };
  }
  return { status: "AVAILABLE" as const };
}

/** Feature 2: Register Handle */
export async function registerHandle(
  program: Program<DpiRegistry>,
  wallet: WalletLike,
  handle: string
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const cleanHandle = handle.trim().toLowerCase();
  const [handlePda] = getHandlePda(cleanHandle);
  const [reversePda] = getReverseLookupPda(wallet.publicKey);
  const [reservedPda] = getReservedHandlePda(cleanHandle);

  const tx = await program.methods
    .registerHandle(cleanHandle)
    .accountsStrict({
      authority: wallet.publicKey,
      handleRegistry: handlePda,
      reverseLookup: reversePda,
      reservedHandle: reservedPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export const registerHandleAction = registerHandle;

/** Feature 3: User Dashboard & Reverse Lookup */
export async function fetchUserHandle(
  program: Program<DpiRegistry>,
  walletPubkey: PublicKey
): Promise<{ handle: string; frozen: boolean } | null> {
  const [reversePda] = getReverseLookupPda(walletPubkey);
  try {
    const reverseAcc = await program.account.reverseLookup.fetchNullable(reversePda);
    if (!reverseAcc || !reverseAcc.handle) return null;

    const [handlePda] = getHandlePda(reverseAcc.handle);
    const registryAcc = await program.account.handleRegistry.fetchNullable(handlePda);

    return {
      handle: reverseAcc.handle,
      frozen: registryAcc ? Boolean(registryAcc.frozen) : false,
    };
  } catch {
    return null;
  }
}

/** Feature 4: Transfer Handle */
export async function transferHandle(
  program: Program<DpiRegistry>,
  wallet: WalletLike,
  handle: string,
  recipient: PublicKey
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const cleanHandle = handle.trim().toLowerCase();
  const [handlePda] = getHandlePda(cleanHandle);
  const [oldReversePda] = getReverseLookupPda(wallet.publicKey);
  const [newReversePda] = getReverseLookupPda(recipient);

  const tx = await program.methods
    .transferHandle()
    .accountsStrict({
      currentOwner: wallet.publicKey,
      handleRegistry: handlePda,
      owner: wallet.publicKey,
      oldReverseLookup: oldReversePda,
      newReverseLookup: newReversePda,
      newOwner: recipient,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// frontend.md recipe alias
export async function executeHandleTransfer(
  program: Program<DpiRegistry>,
  wallet: WalletLike,
  handle: string,
  newOwnerAddress: string
): Promise<string> {
  const newOwner = new PublicKey(newOwnerAddress);
  return await transferHandle(program, wallet, handle, newOwner);
}

// ==========================================
// 5. Admin Console Features
// ==========================================

export async function fetchRegistryConfig(
  program: Program<DpiRegistry>
): Promise<{ admin: PublicKey } | null> {
  try {
    const [configPda] = getConfigPda();
    const config = await program.account.registryConfig.fetchNullable(configPda);
    return config ? { admin: config.admin } : null;
  } catch {
    return null;
  }
}

/** Check if wallet is configured as protocol admin */
export async function checkIsAdmin(
  program: Program<DpiRegistry>,
  walletPubkey: PublicKey | null
): Promise<boolean> {
  if (!walletPubkey) return false;
  try {
    const config = await fetchRegistryConfig(program);
    if (!config) return false;
    return config.admin.equals(walletPubkey);
  } catch {
    return false;
  }
}

/** Initialize Config PDA (Devnet Bootstrap) */
export async function initConfig(
  program: Program<DpiRegistry>,
  adminWallet: WalletLike
): Promise<string> {
  if (!adminWallet.publicKey) throw new Error("Admin wallet required");
  const [configPda] = getConfigPda();

  const tx = await program.methods
    .initConfig()
    .accountsStrict({
      admin: adminWallet.publicKey,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/** Feature 5: Freeze Handle */
export async function freezeHandle(
  program: Program<DpiRegistry>,
  adminWallet: WalletLike,
  handle: string
): Promise<string> {
  if (!adminWallet.publicKey) throw new Error("Admin wallet required");
  const cleanHandle = handle.trim().toLowerCase();
  const [configPda] = getConfigPda();
  const [handlePda] = getHandlePda(cleanHandle);

  const tx = await program.methods
    .freezeHandle()
    .accountsStrict({
      admin: adminWallet.publicKey,
      config: configPda,
      handleRegistry: handlePda,
    })
    .rpc();

  return tx;
}

export const adminFreezeHandle = freezeHandle;

/** Feature 6: Unfreeze Handle */
export async function unfreezeHandle(
  program: Program<DpiRegistry>,
  adminWallet: WalletLike,
  handle: string
): Promise<string> {
  if (!adminWallet.publicKey) throw new Error("Admin wallet required");
  const cleanHandle = handle.trim().toLowerCase();
  const [configPda] = getConfigPda();
  const [handlePda] = getHandlePda(cleanHandle);

  const tx = await program.methods
    .unfreezeHandle()
    .accountsStrict({
      admin: adminWallet.publicKey,
      config: configPda,
      handleRegistry: handlePda,
    })
    .rpc();

  return tx;
}

export const adminUnfreezeHandle = unfreezeHandle;

/** Feature 7: Single Handle Reservation */
export async function reserveHandle(
  program: Program<DpiRegistry>,
  adminWallet: WalletLike,
  handle: string
): Promise<string> {
  if (!adminWallet.publicKey) throw new Error("Admin wallet required");
  const cleanHandle = handle.trim().toLowerCase();
  const [configPda] = getConfigPda();
  const [reservedPda] = getReservedHandlePda(cleanHandle);

  const tx = await program.methods
    .reserveHandle(cleanHandle)
    .accountsStrict({
      admin: adminWallet.publicKey,
      config: configPda,
      reservedHandle: reservedPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export const adminReserveHandle = reserveHandle;

/** Feature 8: Batch Handle Reservation (1 <= handles.length <= 20) */
export async function batchReserveHandles(
  program: Program<DpiRegistry>,
  adminWallet: WalletLike,
  handles: string[]
): Promise<string> {
  if (!adminWallet.publicKey) throw new Error("Admin wallet required");
  if (handles.length === 0 || handles.length > MAX_BATCH_RESERVE) {
    throw new Error(`Batch size must be between 1 and ${MAX_BATCH_RESERVE} handles`);
  }

  const cleanHandles = handles.map((h) => h.trim().toLowerCase());
  const [configPda] = getConfigPda();

  const remainingAccounts = cleanHandles.map((h) => {
    const [pda] = getReservedHandlePda(h);
    return {
      pubkey: pda,
      isWritable: true,
      isSigner: false,
    };
  });

  const tx = await program.methods
    .batchReserveHandles(cleanHandles)
    .accountsStrict({
      admin: adminWallet.publicKey,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .rpc();

  return tx;
}

export const adminBatchReserve = batchReserveHandles;

/** Feature 9: Recover Handle (Administrative Override) */
export async function recoverHandle(
  program: Program<DpiRegistry>,
  adminWallet: WalletLike,
  handle: string,
  newOwner: PublicKey
): Promise<string> {
  if (!adminWallet.publicKey) throw new Error("Admin wallet required");
  const cleanHandle = handle.trim().toLowerCase();
  const [configPda] = getConfigPda();
  const [handlePda] = getHandlePda(cleanHandle);

  const handleAcc = await program.account.handleRegistry.fetch(handlePda);
  const [oldReversePda] = getReverseLookupPda(handleAcc.owner);
  const [newReversePda] = getReverseLookupPda(newOwner);

  const tx = await program.methods
    .recoverHandle(newOwner)
    .accountsStrict({
      admin: adminWallet.publicKey,
      config: configPda,
      handleRegistry: handlePda,
      oldReverseLookup: oldReversePda,
      newReverseLookup: newReversePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function adminRecoverHandle(
  program: Program<DpiRegistry>,
  wallet: WalletLike,
  handle: string,
  newOwnerAddress: string
): Promise<string> {
  const newOwner = new PublicKey(newOwnerAddress);
  return await recoverHandle(program, wallet, handle, newOwner);
}

/** Feature 10: Update Config (Transfer Admin Key) */
export async function updateAdminConfig(
  program: Program<DpiRegistry>,
  currentAdmin: WalletLike,
  newAdmin: PublicKey
): Promise<string> {
  if (!currentAdmin.publicKey) throw new Error("Admin wallet required");
  const [configPda] = getConfigPda();

  const tx = await program.methods
    .updateConfig()
    .accountsStrict({
      admin: currentAdmin.publicKey,
      config: configPda,
      newAdmin: newAdmin,
    })
    .rpc();

  return tx;
}

export async function adminUpdateConfig(
  program: Program<DpiRegistry>,
  wallet: WalletLike,
  newAdminAddress: string
): Promise<string> {
  const newAdmin = new PublicKey(newAdminAddress);
  return await updateAdminConfig(program, wallet, newAdmin);
}

// ==========================================
// 5. Community Directory & Activity (frontend.md recipes)
// ==========================================

export async function fetchAllRegisteredHandles(
  program: Program<DpiRegistry>
): Promise<Array<{ publicKey: string; owner: string; handle: string; frozen: boolean }>> {
  const allAccounts = await program.account.handleRegistry.all();
  return allAccounts.map((item) => ({
    publicKey: item.publicKey.toBase58(),
    owner: item.account.owner.toBase58(),
    handle: item.account.handle,
    frozen: Boolean(item.account.frozen),
  }));
}

export async function fetchRecentProtocolActivity(
  connection: Connection,
  limit = 20
) {
  const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, {
    limit,
  });

  return signatures.map((tx) => ({
    signature: tx.signature,
    slot: tx.slot,
    err: tx.err,
    blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : "Unknown",
    timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
    explorerUrl: `https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`,
  }));
}

// ==========================================
// 6. Real-Time Event Subscriptions (WebSockets)
// ==========================================

export function initProtocolEventListener(
  program: Program<DpiRegistry>,
  onEvent: (name: string, payload: any) => void
): () => void {
  const listeners: number[] = [];

  const eventNames = [
    "handleRegistered",
    "handleTransferred",
    "handleFrozen",
    "handleUnfrozen",
    "handleReserved",
    "handleRecovered",
    "configUpdated",
  ] as const;

  for (const name of eventNames) {
    try {
      const id = (program as any).addEventListener(name, (event: any, slot: any) => {
        onEvent(name, { event, slot });
      });
      listeners.push(id);
    } catch {
      // Ignore websocket connection issues on RPCs without pubsub
    }
  }

  return () => {
    for (const id of listeners) {
      try {
        (program as any).removeEventListener(id);
      } catch {}
    }
  };
}

export function subscribeToEvents(
  program: Program<DpiRegistry>,
  onEvent: (name: string, data: any) => void
): number[] {
  const listenerIds: number[] = [];

  const events = [
    "handleRegistered",
    "handleTransferred",
    "handleFrozen",
    "handleUnfrozen",
    "handleReserved",
    "handleRecovered",
    "configUpdated",
  ] as const;

  for (const eventName of events) {
    try {
      const id = (program as any).addEventListener(eventName, (event: any, slot: any) => {
        onEvent(eventName, { event, slot });
      });
      listenerIds.push(id);
    } catch {}
  }

  return listenerIds;
}

export function unsubscribeEvents(
  program: Program<DpiRegistry>,
  listenerIds: number[]
) {
  for (const id of listenerIds) {
    try {
      (program as any).removeEventListener(id);
    } catch {}
  }
}

// ==========================================
// 7. Error Code Handling & Toast Notifications
// ==========================================

export function parseAnchorError(error: any): string {
  if (error?.error?.errorCode?.code) {
    const code = error.error.errorCode.code;
    switch (code) {
      case "HandleTooShort":
        return "Handle must be at least 3 characters long.";
      case "HandleTooLong":
        return "Handle cannot exceed 32 characters.";
      case "ReservedHandle":
      case "HandleAlreadyReserved":
        return "This handle is reserved by the DPI Protocol.";
      case "HandleFrozen":
        return "This handle is frozen. Transfers are currently disabled.";
      case "UnauthorizedAdmin":
        return "Unauthorized: Connected wallet is not the admin.";
      case "TooManyHandles":
        return `Batch limit exceeded. You can reserve up to ${MAX_BATCH_RESERVE} handles at once.`;
      case "InvalidHandle":
        return "Invalid handle format. Use lowercase letters, digits, '_' or '-' only.";
      case "HandleAlreadyOwned":
        return "This wallet already owns a registered handle.";
      case "HandleNotFound":
        return "Handle was not found in the registry.";
      case "Unauthorized":
        return "Unauthorized action.";
    }
  }

  const rawMsg: string = error?.message || String(error || "");
  if (
    rawMsg.includes("already in use") ||
    rawMsg.includes("0x0") ||
    rawMsg.includes("custom program error: 0x0")
  ) {
    return "This handle or wallet mapping is already registered.";
  }

  if (rawMsg.includes("User rejected the request")) {
    return "Transaction was cancelled in wallet.";
  }

  return rawMsg || "Transaction failed. Please try again.";
}
