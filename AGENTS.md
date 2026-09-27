# Agent Guidelines for DPI App

This project runs on modern Next.js with App Router and React 19.

## Next.js Best Practices
- All client components must declare `"use client"` at the top of the file.
- Keep route pages clean and modular; extract sub-components into `components/`.
- Handle SSR gracefully: guard browser APIs (`window`, `localStorage`, `sessionStorage`, `navigator`) with `typeof window !== "undefined"` or inside `useEffect`.
- Next.js configuration and metadata should follow official Next.js documentation (https://nextjs.org/docs).
- For Solana interactions, always use `@solana/wallet-adapter-react` hooks and Anchor utilities from `lib/dpi-program.ts`.
