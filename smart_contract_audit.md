# DPI Smart Contract Audit

> **Program ID:** `CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc`  
> **Version:** `0.1.0` | **Framework:** Anchor  
> **Audit Scope:** IDL (`dpi_registry.json`) cross-referenced against all frontend usage in `lib/dpi-program.ts`, `app/send/page.tsx`, `app/handle/page.tsx`, `app/admin/page.tsx`, `app/community/page.tsx`, `feature.md`  
> **Generated:** 2026-09-19

---

## What the Program Actually Has

### Instructions (9 total)

| Instruction | Signer Required | Auth Level | Frontend Uses? |
|---|---|---|---|
| `init_config` | `admin` | Deployer only | ✅ `app/admin/page.tsx` |
| `register_handle` | `authority` | Any wallet | ✅ `app/handle/page.tsx` |
| `transfer_handle` | `current_owner` | Handle owner | ✅ `app/handle/page.tsx`, `app/profile/page.tsx` |
| `freeze_handle` | `admin` | Admin only | ✅ `app/admin/page.tsx` |
| `unfreeze_handle` | `admin` | Admin only | ✅ `app/admin/page.tsx` |
| `reserve_handle` | `admin` | Admin only | ✅ `app/admin/page.tsx` |
| `batch_reserve_handles` | `admin` | Admin only | ✅ `app/admin/page.tsx` |
| `recover_handle` | `admin` | Admin only | ✅ `app/admin/page.tsx` |
| `update_config` | `admin` | Admin only | ✅ `app/admin/page.tsx` |

### Accounts (4 PDAs)

| Account | Seeds | Fields |
|---|---|---|
| `RegistryConfig` | `["config"]` | `admin: pubkey` |
| `HandleRegistry` | `["handle", handle_str]` | `owner: pubkey`, `handle: string`, `bump: u8`, `frozen: bool` |
| `ReverseLookup` | `["reverse", owner_pubkey]` | `owner: pubkey`, `handle: string` |
| `ReservedHandle` | `["reserved", handle_str]` | `handle: string` |

### Events (8 emitted)

`HandleRegistered`, `HandleTransferred`, `HandleFrozen`, `HandleUnfrozen`, `HandleReserved`, `HandleRecovered`, `ConfigUpdated`, `ReverseLookupCreated`

### Error Codes (11)

`HandleTooShort`, `HandleTooLong`, `ReservedHandle`, `UnauthorizedAdmin`, `Unauthorized`, `HandleFrozen`, `HandleAlreadyReserved`, `HandleNotFound`, `TooManyHandles`, `InvalidHandle`, `HandleAlreadyOwned`

---

## Critical Gaps — Frontend Needs vs. Program Reality

### GAP-001: `transfer_handle` does NOT enforce the frozen flag on-chain

**Frontend expects:**  
`app/send/page.tsx` calls `lookupHandleCached` to pre-check the `frozen` flag before sending, and it reads `handleAcc.frozen` from the `HandleRegistry` account. The expectation is that a frozen handle cannot be used to receive payments.

**What the program actually does:**  
`freeze_handle` sets the `frozen: bool` field in `HandleRegistry`. The `transfer_handle` instruction correctly checks and rejects if `frozen == true`.

**BUT — the `register_handle` payment routing itself is not a program instruction at all.** SOL and SPL token transfers are raw `SystemProgram::transfer` / SPL `transfer` calls made by the frontend directly — the DPI program is never invoked during an actual payment. The program has **no on-chain enforcement** that a frozen handle cannot receive payments.

**Impact:** An admin freezes a handle expecting payments to be blocked. But any frontend that skips the `frozen` check (or uses a direct wallet transfer) can still send SOL/SPL tokens to the frozen handle owner's wallet. The freeze is purely advisory — it is only enforced by the frontend cache, which has a 60-second TTL (see ISSUE-022 in `issues.md`).

**Smart contract fix needed:**  
Add a `route_payment` instruction to the program that validates freeze status, resolves the `ReverseLookup` PDA for the handle, and executes the transfer atomically on-chain. This makes freeze enforcement trustless.

---

### GAP-002: `HandleRegistry` has NO `created_at` timestamp field

**Frontend needs (from `feature.md` FEAT-002 and public profile):**  
- Handle expiry/renewal system
- "Registered on" date on the public profile page (`/handle/[handle]`)
- Handle age display in the community directory

**What the program has:**  
`HandleRegistry` fields: `owner`, `handle`, `bump`, `frozen`. There is **no `created_at` or `registered_at` timestamp**. The frontend currently shows no registration date. When profile pages are built (FEAT-012), there will be no on-chain source of truth for registration time.

**Smart contract fix needed:**  
Add `created_at: i64` (Unix timestamp via `Clock::get()?.unix_timestamp`) to `HandleRegistry`. For the expiry feature (FEAT-002), also add `expires_at: i64` and update `transfer_handle`, `freeze_handle` to check expiry.

---

### GAP-003: `ReservedHandle` account stores no metadata (reserved by whom, when, why)

**Frontend needs:**  
The admin console's Reservations tab shows a list of reserved handles. Currently there is no way to display who reserved a handle or when, because the `ReservedHandle` account only stores `handle: string`.

**What the program has:**  
```json
"ReservedHandle": {
  "fields": [{ "name": "handle", "type": "string" }]
}
```

**Smart contract fix needed:**  
Add `reserved_by: pubkey` and `reserved_at: i64` fields to `ReservedHandle`. This enables an admin audit trail and supports the admin activity log (FEAT-021).

---

### GAP-004: No `delete_handle` / `close_handle` instruction

**Frontend needs (from `feature.md` FEAT-002, handle marketplace FEAT-019):**  
- Handle expiry: when a handle expires, the account needs to be closed to reclaim rent
- Handle surrender: a user should be able to voluntarily release their handle
- Handle marketplace: when a transfer is accepted, the old listing state should be cleaned up

**What the program has:**  
There is no `close_handle`, `delete_handle`, or `burn_handle` instruction. Once registered, a handle can only be transferred or frozen — never deleted. This means:
1. Rent is permanently locked in every `HandleRegistry` + `ReverseLookup` account pair
2. A wallet that loses its private key permanently wastes namespace
3. The expiry feature (FEAT-002) cannot release accounts after expiry

**Smart contract fix needed:**  
Add `close_handle` instruction that:
- Requires signer == handle owner (or admin for admin-forced close)
- Closes `HandleRegistry` and `ReverseLookup` accounts, returning rent to the owner
- Emits a `HandleClosed` event

---

### GAP-005: No `update_handle` / profile fields in `HandleRegistry`

**Frontend needs (from `feature.md` FEAT-012 — public profile pages):**  
- User bio/description
- Profile avatar URL (or Arweave/IPFS hash)
- Social links (Twitter, website)
- Display name (different from handle)

**What the program has:**  
`HandleRegistry` is: `owner`, `handle`, `bump`, `frozen`. There are no extensible profile fields. Currently the frontend stores avatar URL in `localStorage` only — it is not on-chain and cannot be seen by other users on the public profile page.

**Smart contract fix needed:**  
Option A (minimal): Add a `metadata_uri: Option<String>` field pointing to an off-chain JSON metadata document (like NFT metadata standard).  
Option B (full): Add `display_name: Option<String>`, `bio: Option<String>`, `avatar_uri: Option<String>` directly on-chain.  
Add an `update_handle_profile` instruction callable by the handle owner.

---

### GAP-006: No on-chain payment routing instruction — transfers bypass the protocol entirely

**Frontend needs (from `feature.md` FEAT-003 — payment requests, FEAT-004 — memos):**  
- Payment request links that auto-route to a handle
- Memo/note attached to a payment
- Protocol-level payment history queryable by handle (not just wallet address)

**What the program does:**  
The DPI program is a **pure identity registry** — it maps handles to wallets. All actual SOL/SPL token transfers in `app/send/page.tsx` are plain `SystemProgram::transfer` or SPL `transfer` instructions that go directly wallet-to-wallet, completely bypassing the DPI program.

**Consequences:**
1. There is no on-chain record that a payment was made via DPI handle — you cannot query "all payments sent to @alice" from the program
2. Memos (FEAT-004) would require the `spl-memo` program, not DPI
3. Payment routing fees (for potential protocol revenue) are impossible without routing through DPI
4. The `route_payment` instruction needed for freeze enforcement (GAP-001) is also missing

**Smart contract fix needed:**  
Add a `route_payment` instruction:
```
route_payment(amount: u64, token_mint: Option<Pubkey>, memo: Option<String>)
accounts: sender, handle_registry (checks frozen), reverse_lookup (resolves owner), destination wallet
```
This makes freeze enforcement, memos, and payment analytics possible on-chain.

---

### GAP-007: `RegistryConfig` stores ONLY `admin: pubkey` — no protocol parameters

**Frontend needs:**  
- Protocol fee settings (for marketplace FEAT-019)
- Maximum handle length (currently hardcoded in frontend at 32 — should come from on-chain config)
- Minimum handle length (currently hardcoded at 3)
- Global pause/emergency stop capability
- Multi-sig admin support

**What the program has:**  
```json
"RegistryConfig": {
  "fields": [{ "name": "admin", "type": "pubkey" }]
}
```

Only the admin's public key is stored. All validation parameters (min/max handle length, reserved words, batch size limit) are hardcoded in the Rust program itself and duplicated in the frontend's `lib/dpi-program.ts`. If the program needs to change these limits, a redeployment is required.

**Smart contract fix needed:**  
Expand `RegistryConfig` to include:
- `max_handle_len: u8`
- `min_handle_len: u8`
- `registration_fee: u64` (lamports, 0 = free)
- `paused: bool` (global emergency stop)
- `treasury: pubkey` (fee recipient)

---

### GAP-008: `transfer_handle` passes `handle` arg in account constraint but NOT as an instruction arg

**Frontend code in `lib/dpi-program.ts`:**
```ts
const tx = await program.methods
  .transferHandle()   // ← no handle argument passed
  .accountsStrict({
    currentOwner: wallet.publicKey,
    handleRegistry: handlePda,
    owner: wallet.publicKey,     // ← owner passed twice
    ...
  })
```

**What the IDL shows:**  
`transfer_handle` takes **zero args** (`"args": []`). The handle is implicit from the `handle_registry` account. This is technically correct, but the `owner` account is passed as `wallet.publicKey` AND as `current_owner` — these are duplicated in the frontend call, which is unnecessary and confusing.

**Risk:** If `owner` and `current_owner` were ever different (e.g., relay transaction pattern), the authorization check could be bypassed. The IDL uses `relations: ["handle_registry"]` to enforce that `owner == handle_registry.owner`, which is correct, but this adds confusion in the frontend.

---

### GAP-009: `freeze_handle` and `unfreeze_handle` do NOT close or modify `ReverseLookup`

**Frontend behavior:**  
When a handle is frozen, the frontend disables the send flow. But `ReverseLookup` still maps the wallet to the handle. If someone calls `fetchUserHandle()` on a frozen handle owner's wallet, it returns the handle as if it's normally usable.

**Program behavior:**  
`freeze_handle` only sets `handle_registry.frozen = true`. It does NOT touch `ReverseLookup`. There is no way to query "is my reverse lookup pointing to a frozen handle?" without fetching both PDAs.

**Impact:**  
- The `InboundPaymentListener` has no way to warn the user that their handle is frozen
- The home screen handle display shows frozen handles as if they are active (no frozen badge on `ConnectedView`)

---

### GAP-010: `ReverseLookupCreated` event payload is NOT used by the frontend event listener

**What the IDL has:**  
```json
"ReverseLookupCreated": {
  "fields": [{ "name": "owner", "type": "pubkey" }, { "name": "handle", "type": "string" }]
}
```

**What the frontend does:**  
`lib/dpi-program.ts` → `initProtocolEventListener` only listens to 7 events:
```ts
["handleRegistered", "handleTransferred", "handleFrozen", "handleUnfrozen",
 "handleReserved", "handleRecovered", "configUpdated"]
```

`ReverseLookupCreated` is emitted by the program on every `register_handle` call but **is never subscribed to** by the frontend event listener. This means the real-time notification for "your reverse lookup was created" (which fires alongside `HandleRegistered`) is silently dropped.

**Impact:** Low — `HandleRegistered` fires at the same time and carries similar info. But the unused subscription is a mismatch that will confuse future developers.

---

## Missing Instructions vs. Frontend Feature Requests

| Feature from `feature.md` | Required Program Instruction | Current Status |
|---|---|---|
| FEAT-002: Handle renewal/expiry | `renew_handle`, `expire_handle`, `close_handle` | ❌ Not implemented |
| FEAT-003: Payment request links | `route_payment` (validate handle, transfer) | ❌ Not implemented |
| FEAT-004: Transaction memos | `route_payment` with `memo: Option<String>` | ❌ Not implemented |
| FEAT-005: Contacts / address book | No program change needed (client-side) | ✅ Frontend only |
| FEAT-006: SPL Token-2022 | No program change needed (client-side) | ✅ Frontend only |
| FEAT-012: Profile pages with bio | `update_handle_profile`, profile fields on `HandleRegistry` | ❌ Not implemented |
| FEAT-019: Handle marketplace | `list_handle`, `accept_offer`, `cancel_listing` + escrow | ❌ Not implemented |
| FEAT-020: Solana Pay QR standard | No program change — routing is off-chain | ✅ Frontend only |
| FEAT-021: Admin activity log | No new instruction — parse existing signatures | ✅ Frontend only |
| FEAT-025: Handle analytics | No new instruction — parse existing signatures | ✅ Frontend only |

---

## On-Chain Security Issues

### SEC-001: Single admin key with no multi-sig support

All privileged instructions (`freeze_handle`, `unfreeze_handle`, `reserve_handle`, `recover_handle`, `update_config`) check only `config.admin == signer`. There is no:
- Timelock on admin actions
- Multi-sig threshold requirement
- Emergency pause mechanism (single call freezes entire protocol)

If the admin private key is compromised, an attacker can recover any handle to their own wallet, unfreeze all frozen handles, or transfer the admin role to themselves permanently.

**Recommendation:**
- Add a `timelock: u64` delay on destructive admin actions (`recover_handle`, `update_config`)
- Add a `paused: bool` to `RegistryConfig` with a safe-mode that blocks all user writes
- Consider upgrading `admin` to a Squads multi-sig

---

### SEC-002: `recover_handle` closes the old `ReverseLookup` but NOT the `HandleRegistry` in the old account

From the IDL, `recover_handle` takes `old_reverse_lookup` (writable) and `new_reverse_lookup` (writable). This allows the program to close the old reverse lookup and create a new one for the new owner. However, the program does NOT explicitly close the old `HandleRegistry` account — it mutates it in place (changing `owner`).

If the rent model ever changes, or if the old owner somehow retains a reference to the old `HandleRegistry` PDA, stale state could be observed.

---

### SEC-003: `batch_reserve_handles` uses `remaining_accounts` with no program-side limit enforcement visible in IDL

The IDL shows `batch_reserve_handles` takes `handles: Vec<String>` as an arg. The frontend enforces `handles.length <= 20`. However, the IDL itself shows no `max_accounts` constraint visible in the instruction definition — the 20-handle limit relies entirely on a Rust-side check (not visible from IDL alone). If the program-side limit is different from the frontend's `MAX_BATCH_RESERVE = 20`, overflow is possible.

**Recommendation:** Confirm the Rust source enforces `handles.len() <= 20` with the `TooManyHandles` error, and that the IDL/client constant matches.

---

### SEC-004: `HandleRegistry` has no version/schema field for future migrations

`HandleRegistry` contains no `version: u8` or schema version field. If the account layout ever needs to change (e.g., adding `created_at`), existing accounts cannot be migrated without a custom migration instruction, and the old and new account shapes would clash on deserialization.

**Recommendation:** Add `version: u8` initialized to `1` in `init_handle` to enable forward-compatible schema upgrades.

---

## Summary Table

| Category | Item | Severity | Status |
|---|---|---|---|
| Freeze enforcement | No on-chain freeze for payments | 🔴 Critical | Missing |
| Payment routing | No `route_payment` instruction | 🔴 Critical | Missing |
| Timestamp | No `created_at` on `HandleRegistry` | 🟠 High | Missing |
| Profile data | No profile fields on-chain | 🟠 High | Missing |
| Handle deletion | No `close_handle` instruction | 🟠 High | Missing |
| Config params | `RegistryConfig` only stores admin key | 🟠 High | Missing |
| Admin security | Single key, no timelock, no multisig | 🟠 High | Missing |
| Reserved handle metadata | No `reserved_by`/`reserved_at` | 🟡 Medium | Missing |
| Event listener | `ReverseLookupCreated` not subscribed | 🟡 Medium | Frontend gap |
| Frozen reverse lookup | Freeze doesn't invalidate reverse lookup | 🟡 Medium | Incomplete |
| Transfer call | Duplicate `owner`/`current_owner` args | 🟢 Low | Confusing |
| Schema versioning | No version field on accounts | 🟢 Low | Missing |
