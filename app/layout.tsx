import type { Metadata } from "next";
import "./globals.css";
import SolanaWalletProvider from "@/components/WalletProvider";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "DPI — Privacy like crypto, simplicity like UPI",
  description:
    "DPI is a decentralized handle registry on Solana. Claim your @handle, send SOL, and join the community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletProvider>
          <div
            style={{
              minHeight: "100dvh",
              maxWidth: 480,
              margin: "0 auto",
              background: "var(--bg-base)",
              position: "relative",
            }}
          >
            <main style={{ paddingBottom: 100 }}>{children}</main>
            <BottomNav />
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
