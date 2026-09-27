# DPI App — Developer & AI Agent Guide

DPI (Decentralized Public Infrastructure) is a Solana-native identity and instant payment protocol ("UPI on Solana"). It maps human-readable `@handles` to Solana public keys and provides direct SOL and SPL token transfers.

## Tech Stack & Architecture
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React icons, Glassmorphism dark theme (`#06080F`)
- **Blockchain**: Solana Web3.js (`@solana/web3.js`), Anchor Framework (`@coral-xyz/anchor`), SPL Token (`@solana/spl-token`), Solana Wallet Adapter
- **On-chain Program ID**: `DPIreg1111111111111111111111111111111111111` (Solana Devnet)

## Core Protocol PDAs & Seeds
Defined in `lib/dpi-program.ts`:
- **Config PDA**: `[Buffer.from("config")]`
- **Handle PDA**: `[Buffer.from("handle"), Buffer.from(cleanHandle)]`
- **Reverse Lookup PDA**: `[Buffer.from("reverse"), walletPublicKey.toBuffer()]`
- **Reserved Handle PDA**: `[Buffer.from("reserved"), Buffer.from(cleanHandle)]`

## Key Libraries & Utilities
- `lib/dpi-program.ts`: Canonical Anchor client, PDA derivation helpers (`getHandlePda`, `getReverseLookupPda`, etc.), transaction confirmation (`confirmTx`), handle input validation (`validateHandleInput`).
- `lib/tokens.ts`: Devnet token mint definitions (USDC, EURC, PYUSD), symbol lookup, decimal resolution.
- `lib/dpi-cache.ts`: Memory + SessionStorage caching for handle and reverse lookups (`lookupHandleCached`, `lookupReverseCached`, `invalidateHandleCache`). Use `skipCache: true` when performing state-critical operations (e.g. pre-send checks).
- `lib/haptics.ts`: Native navigator vibration triggers for interactive UI feedback.
- `components/TransferHandleModal.tsx`: Reusable modal for transferring handle ownership with reverse-lookup synchronization.
- `components/ErrorBoundary.tsx`: Top-level React error boundary preventing blank screen crashes on unexpected RPC errors.

## Development & Build Commands
- `npm run dev`: Start development server on port 3000
- `npm run build`: Production Next.js build
- `npx tsc --noEmit`: Typecheck codebase without emitting JavaScript
- `npm test`: Run automated unit tests

## Code Conventions
- Use `confirmTx(connection, tx, commitment)` instead of raw `connection.confirmTransaction(tx, commitment)`.
- Wrap asynchronous state setters in mounted guards (`isMountedRef` or `ignore` flags) inside `useEffect`.
- Handle inputs must always be normalized via `clean = raw.trim().toLowerCase().replace(/^@/, "")`.
- Always wrap `localStorage` and `sessionStorage` in `try/catch` to prevent `QuotaExceededError` or private browsing exceptions.
