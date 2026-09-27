import test from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { invalidateHandleCache } from "../lib/dpi-cache.ts";

test("DPI Cache Manager", async (t) => {
  await t.test("invalidateHandleCache executes safely without window", () => {
    assert.doesNotThrow(() => {
      invalidateHandleCache("satoshi");
      const dummy = new PublicKey("11111111111111111111111111111111");
      invalidateHandleCache(undefined, dummy);
    });
  });
});
