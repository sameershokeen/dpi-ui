import test from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import {
  validateHandleInput,
  normalizeHandle,
  getConfigPda,
  getHandlePda,
  getReverseLookupPda,
  getReservedHandlePda,
  PROGRAM_ID,
  MIN_HANDLE_LEN,
  MAX_HANDLE_LEN,
} from "../lib/dpi-program.ts";
import { PREDEFINED_TOKENS, getTokenMetaByMint, isKnownTokenMint } from "../lib/tokens.ts";

test("Handle Normalization & Validation", async (t) => {
  await t.test("normalizes handle to trimmed lowercase", () => {
    assert.equal(normalizeHandle("  Alice  "), "alice");
    assert.equal(normalizeHandle("BOB"), "bob");
  });

  await t.test("rejects handle shorter than MIN_HANDLE_LEN", () => {
    const res = validateHandleInput("ab");
    assert.equal(res.valid, false);
    assert.match(res.error || "", /too short/);
  });

  await t.test("rejects handle longer than MAX_HANDLE_LEN", () => {
    const long = "a".repeat(MAX_HANDLE_LEN + 1);
    const res = validateHandleInput(long);
    assert.equal(res.valid, false);
    assert.match(res.error || "", /too long/);
  });

  await t.test("rejects uppercase characters", () => {
    const res = validateHandleInput("Alice");
    assert.equal(res.valid, false);
    assert.match(res.error || "", /lowercase/);
  });

  await t.test("rejects invalid special characters", () => {
    const res = validateHandleInput("alice@sol");
    assert.equal(res.valid, false);
    assert.match(res.error || "", /Only letters/);
  });

  await t.test("rejects reserved system handles", () => {
    const res = validateHandleInput("admin");
    assert.equal(res.valid, false);
    assert.match(res.error || "", /reserved system handle/);
  });

  await t.test("accepts valid alphanumeric handles with dashes and underscores", () => {
    assert.equal(validateHandleInput("satoshi").valid, true);
    assert.equal(validateHandleInput("user_01").valid, true);
    assert.equal(validateHandleInput("my-handle").valid, true);
  });
});

test("PDA Derivations", async (t) => {
  await t.test("getConfigPda derives valid PDA", () => {
    const [pda, bump] = getConfigPda();
    assert.ok(PublicKey.isOnCurve(pda.toBytes()) === false);
    assert.equal(typeof bump, "number");
  });

  await t.test("getHandlePda derives canonical deterministic address", () => {
    const [pda1, bump1] = getHandlePda("satoshi");
    const [pda2, bump2] = getHandlePda("SATOSHI ");
    assert.equal(pda1.toBase58(), pda2.toBase58());
    assert.equal(bump1, bump2);
  });

  await t.test("getReverseLookupPda derives deterministic wallet lookup address", () => {
    const dummyKey = new PublicKey("11111111111111111111111111111111");
    const [rev1] = getReverseLookupPda(dummyKey);
    const [rev2] = getReverseLookupPda(dummyKey);
    assert.equal(rev1.toBase58(), rev2.toBase58());
  });

  await t.test("getReservedHandlePda derives reserved namespace PDA", () => {
    const [res1] = getReservedHandlePda("admin");
    const [res2] = getReservedHandlePda("admin");
    assert.equal(res1.toBase58(), res2.toBase58());
  });
});

test("Token Registry & Metadata", async (t) => {
  await t.test("correctly recognizes official devnet token mints", () => {
    assert.equal(isKnownTokenMint(PREDEFINED_TOKENS.USDC.mint), true);
    assert.equal(isKnownTokenMint(PREDEFINED_TOKENS.EURC.mint), true);
    assert.equal(isKnownTokenMint(PREDEFINED_TOKENS.PYUSD.mint), true);
    assert.equal(isKnownTokenMint("11111111111111111111111111111111"), false);
  });

  await t.test("resolves correct metadata by mint address", () => {
    const usdc = getTokenMetaByMint(PREDEFINED_TOKENS.USDC.mint);
    assert.equal(usdc.symbol, "USDC");
    assert.equal(usdc.decimals, 6);

    const unknown = getTokenMetaByMint("UnknownMintAddress123");
    assert.match(unknown.symbol, /^SPL/);
    assert.equal(unknown.decimals, 6);
  });
});
