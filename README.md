# DPI (Decentralized Public Infrastructure) ⚡

> **Tagline:** Privacy like crypto. Simplicity like UPI.

A decentralized identity, payment, and handle registry Web3 application built on Solana. DPI allows users to send and receive SOL and SPL tokens using human-readable `@handles` (e.g., `@alex`, `@sameer`) instead of complex 44-character base58 wallet addresses.

![DPI Preview](public/file.svg)

---

## 🚀 Key Features

* **🪪 Human-Readable @Handles**: Register and manage unique on-chain handles on Solana Devnet mapped to your wallet public key via PDA (Program Derived Address).
* **💸 Fast Multi-Token Transfers**: Send native SOL or Devnet SPL tokens (USDC, EURC, PYUSD) by typing `@handle` or wallet address.
* **🧾 Transaction Receipts & History**: Instant receipt rendering with non-blocking concurrent counterparty resolution (`app/history`).
* **🖼️ Profile & Avatar Management**: Custom avatar image upload (with 3MB size limit & MIME validation) and high-resolution photo preview modal.
* **🌐 Public Handle Pages**: Shareable vanity handle pages (`/handle/[handle]`) with 1-click payment triggers.
* **🔮 Dark Glassmorphism Interface**: Sleek dark UI with ambient glows, frosted glass cards (`backdrop-blur-2xl`), responsive mobile ergonomics, and fixed bottom navigation.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Language**: TypeScript 5
* **Blockchain**: Solana (`@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/spl-token`)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Custom Glassmorphic Utilities
* **Icons**: [Lucide React](https://lucide.dev/)
* **Smart Contract**: Native Buffer layout serialization & raw instruction encoding (Zero heavy Anchor client dependencies)

---

## 📁 Project Structure

```text
dpi-app/
├── app/
│   ├── api/
│   │   └── upload/          # Profile photo upload API with MIME/size validation
│   ├── community/           # Protocol announcements & updates
│   ├── handle/              # @Handle registration & live validation
│   │   └── [handle]/        # Public vanity @handle profile page
│   ├── history/             # Transaction receipts with counterparty resolution
│   ├── profile/             # Profile management, SOL balance & avatar preview modal
│   ├── send/                # Multi-token transfer engine with handle resolution
│   ├── globals.css          # Tailwind CSS v4 setup & dark glassmorphic tokens
│   ├── layout.tsx           # Root layout with WalletProvider & fixed BottomNav
│   └── page.tsx             # Home dashboard & quick actions
├── components/
│   ├── BottomNav.tsx        # Viewport-pinned mobile navigation bar
│   ├── Card.tsx             # Reusable glassmorphic card container
│   ├── Header.tsx           # Application header with network & wallet badge
│   ├── StatusBadge.tsx      # On-chain active/frozen status badges
│   ├── WalletButton.tsx     # SSR-safe Solana wallet connection button
│   └── WalletProvider.tsx   # Solana wallet adapter provider with error boundaries
├── lib/
│   └── dpi-program.ts       # On-chain PDA derivation & instruction encoders
├── public/                  # Static assets & icons
├── issues.md                # Issue audit & resolution log
└── feature.md               # Feature roadmap & upcoming specifications
```

---

## ⛓️ Solana Smart Contract Integration

* **Program ID**: `CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc`
* **Cluster**: Solana Devnet

### PDA Derivations

```typescript
// 1. Handle Registry PDA (handle -> owner)
const [handlePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("handle"), Buffer.from(handle)],
  PROGRAM_ID
);

// 2. Reverse Lookup PDA (owner -> handle)
const [reversePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("reverse"), publicKey.toBuffer()],
  PROGRAM_ID
);
```

---

## ⚡ Getting Started Locally

### 1. Prerequisites
- Node.js 18.18+ or 20+
- npm, yarn, or pnpm
- Solana browser wallet extension (e.g. [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/)) set to **Devnet**.

### 2. Installation & Run

```bash
# Clone the repository
git clone <repo-url>
cd dpi-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build

```bash
npm run build
npm start
```

---

## 📚 Documentation & Roadmap

* 📄 [issues.md](issues.md) — Complete audit log of all security, mobile UX, and performance fixes.
* 🚀 [feature.md](feature.md) — Feature roadmap including QR codes, recent recipient chips, 1-click airdrop, and toast notifications.
