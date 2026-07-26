import { PublicKey } from "@solana/web3.js";

export const DPI_PROGRAM_ID = new PublicKey(
  "CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc"
);

export const SEEDS = {
  CONFIG: Buffer.from("config"),
  HANDLE: Buffer.from("handle"),
  REVERSE: Buffer.from("reverse"),
  RESERVED: Buffer.from("reserved"),
};

export function getHandleRegistryPDA(handle: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.HANDLE, Buffer.from(handle)],
    DPI_PROGRAM_ID
  );
}

export function getReverseLookupPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.REVERSE, owner.toBuffer()],
    DPI_PROGRAM_ID
  );
}

export function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.CONFIG], DPI_PROGRAM_ID);
}

export function getReservedHandlePDA(handle: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.RESERVED, Buffer.from(handle)],
    DPI_PROGRAM_ID
  );
}

export const DPI_IDL = {
  version: "0.1.0",
  name: "dpi_registry",
  instructions: [
    {
      name: "initConfig",
      accounts: [
        { name: "admin", isMut: true, isSigner: true },
        { name: "config", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "registerHandle",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "handleRegistry", isMut: true, isSigner: false },
        { name: "reverseLookup", isMut: true, isSigner: false },
        { name: "reservedHandle", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "handle", type: "string" }],
    },
    {
      name: "transferHandle",
      accounts: [
        { name: "currentOwner", isMut: false, isSigner: true },
        { name: "handleRegistry", isMut: true, isSigner: false },
        { name: "owner", isMut: false, isSigner: false },
        { name: "newOwner", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "freezeHandle",
      accounts: [
        { name: "admin", isMut: false, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "handleRegistry", isMut: true, isSigner: false },
      ],
      args: [],
    },
    {
      name: "unfreezeHandle",
      accounts: [
        { name: "admin", isMut: false, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "handleRegistry", isMut: true, isSigner: false },
      ],
      args: [],
    },
    {
      name: "reserveHandle",
      accounts: [
        { name: "admin", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "reservedHandle", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "handle", type: "string" }],
    },
    {
      name: "recoverHandle",
      accounts: [
        { name: "admin", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "handleRegistry", isMut: true, isSigner: false },
      ],
      args: [{ name: "newOwner", type: "publicKey" }],
    },
  ],
  accounts: [
    {
      name: "RegistryConfig",
      type: {
        kind: "struct",
        fields: [{ name: "admin", type: "publicKey" }],
      },
    },
    {
      name: "HandleRegistry",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "publicKey" },
          { name: "handle", type: "string" },
          { name: "bump", type: "u8" },
          { name: "frozen", type: "bool" },
        ],
      },
    },
    {
      name: "ReverseLookup",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "publicKey" },
          { name: "handle", type: "string" },
        ],
      },
    },
    {
      name: "ReservedHandle",
      type: {
        kind: "struct",
        fields: [{ name: "handle", type: "string" }],
      },
    },
  ],
  errors: [
    { code: 6000, name: "HandleTooShort", msg: "Handle too short" },
    { code: 6001, name: "HandleTooLong", msg: "Handle too long" },
    { code: 6002, name: "ReservedHandle", msg: "Reserved handle" },
    { code: 6003, name: "UnauthorizedAdmin", msg: "Unauthorized admin" },
    { code: 6004, name: "Unauthorized", msg: "Unauthorized" },
    { code: 6005, name: "HandleFrozen", msg: "Handle is frozen" },
    { code: 6006, name: "HandleAlreadyReserved", msg: "Handle already reserved" },
    { code: 6007, name: "HandleNotFound", msg: "Handle not found" },
    { code: 6008, name: "TooManyHandles", msg: "Too many handles" },
    { code: 6009, name: "InvalidHandle", msg: "Invalid handle" },
    { code: 6010, name: "HandleAlreadyOwned", msg: "Wallet already owns a handle" },
  ],
};

export function validateHandle(handle: string): string | null {
  const trimmed = handle.trim().toLowerCase();
  if (trimmed !== handle) return "Handle must be lowercase and trimmed";
  if (handle.length < 3) return "Handle must be at least 3 characters";
  if (handle.length > 32) return "Handle must be 32 characters or less";
  if (!/^[a-z0-9_-]+$/.test(handle)) return "Only lowercase letters, numbers, _ and - allowed";
  const reserved = ["admin", "support", "help", "security", "dpi", "team"];
  if (reserved.includes(handle)) return "This handle is reserved";
  return null;
}
