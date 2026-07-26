# DPI — Solana Handle Registry Frontend

**Tagline:** Privacy like crypto. Simplicity like UPI.

## What Was Built

A full Next.js 14 (App Router) frontend for the DPI Handle Registry Solana program with 5 pages and complete Solana wallet integration.

---

## Pages

### 1. `/` — Home
- **Disconnected:** Landing page with DPI branding, feature overview cards, wallet connect CTA
- **Connected:** Live SOL balance card (indigo), @handle status chip, quick-action Send/Receive buttons, shortcut grid to all pages

### 2. `/handle` — @Handle Registration
- Shows your current handle if registered (with frozen/active badge)
- Handle availability checker — live on-chain lookup with 600ms debounce
- Validates: 3–32 chars, lowercase, alphanumeric + `_` and `-`, not in reserved list
- Sends `register_handle` instruction to `CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc`
- On success: shows confirmation with Solana Explorer tx link

### 3. `/handle/[handle]` — Public @Handle Page
- Reads `HandleRegistry` PDA on-chain and displays owner, status (frozen/active)
- "Send SOL to @handle" button links directly to `/send?to=handle`
- Copy wallet address, Explorer link

### 4. `/send` — Send SOL
- Recipient: resolves any `@handle` → wallet address via on-chain `HandleRegistry` PDA lookup
- Also accepts direct wallet addresses (base58)
- Quick-amount buttons (0.01 / 0.05 / 0.1 / 0.5 SOL)
- Transaction summary before signing
- Success screen matching the mockup layout (amount, status, bill ID, share)
- Pre-fills recipient when linked from handle page (`?to=handle`)

### 5. `/community` — Community & Announcements
- DPI team announcements (currently seeded with launch info, governance rules, protocol info, mainnet notice)
- Contract info footer with Explorer link

### 6. `/profile` — Profile
- Avatar derived from first letter of handle
- Live balance + handle count stats
- Wallet address copy, Explorer link
- Disconnect wallet button

---

## Smart Contract Integration

**Program ID:** `CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc`  
**Network:** Solana Devnet

### PDA Derivation (matches contract exactly)
```typescript
// Handle registry
PublicKey.findProgramAddressSync(["handle", handle_bytes], PROGRAM_ID)

// Reverse lookup (owner → handle)
PublicKey.findProgramAddressSync(["reverse", owner_pubkey_bytes], PROGRAM_ID)

// Reserved handle check
PublicKey.findProgramAddressSync(["reserved", handle_bytes], PROGRAM_ID)
```

### `register_handle` instruction encoding
Anchor discriminator (first 8 bytes of `sha256("global:register_handle")`) + 4-byte LE string length + UTF-8 handle bytes. Sent via raw `TransactionInstruction` — no Anchor client dependency needed.

### Account data decoding
- `HandleRegistry`: `[8 discriminator][32 owner pubkey][4 str_len][N handle][1 bump][1 frozen]`
- `ReverseLookup`: `[8 discriminator][32 owner pubkey][4 str_len][N handle]`

---

## Wallet Adapters Supported
- Phantom
- Solflare
- Coinbase Wallet

---

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- TypeScript
- `@solana/web3.js` — all on-chain reads/writes
- `@solana/wallet-adapter-react` + `@solana/wallet-adapter-react-ui`
- Tailwind CSS (utility classes)
- Lucide React (icons)
- No Anchor client — raw instruction encoding for minimal bundle size

---

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — connect a Devnet wallet (Phantom recommended, switch to Devnet in settings).

## Build for Production

```bash
npm run build
npm start
```

---

## Design System

| Token | Value |
|-------|-------|
| Background base | `#F2F1EF` — warm neutral, not dark not light |
| Card | `#FAFAF8` |
| Accent (indigo) | `#5B4FE9` |
| Accent light | `#EEF0FF` |
| Success (mint) | `#22C97A` |
| Text primary | `#1A1917` |
| Text muted | `#9E9C98` |

Typography: system-ui / `-apple-system` stack for UPI-like native feel.

---

## What's Ready to Extend

- **Transfer handle page** — `transfer_handle` instruction scaffold is in `lib/dpi-program.ts`
- **Admin panel** — `freeze_handle`, `unfreeze_handle`, `recover_handle`, `reserve_handle` all documented in IDL
- **Community feed** — replace static announcements array with on-chain events or an API
- **Mainnet toggle** — change `WalletAdapterNetwork.Devnet` to `Mainnet` in `components/WalletProvider.tsx`
