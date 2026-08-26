import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/WalletProvider";
import BottomNav from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DPI — Solana Decentralized Public Infrastructure",
  description:
    "Privacy like crypto, simplicity like UPI. Decentralized handle registry and instant payments on Solana.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#06080F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen bg-[#06080F] text-[#FFFFFF] relative selection:bg-indigo-500 selection:text-white">
        <ToastProvider>
          <SolanaWalletProvider>
            {/* Ambient Lighting Gradients (vison.webp aesthetic) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <div className="absolute inset-0 ambient-glow-top" />
              <div className="absolute inset-0 ambient-glow-bottom" />
              <div className="absolute inset-0 bg-grid-pattern opacity-60" />
            </div>

            <div
              style={{
                minHeight: "100dvh",
                maxWidth: 480,
                margin: "0 auto",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
              className="z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-x border-white/12 bg-[#06080F]/95"
            >
              <main className="flex-1 w-full pb-24">{children}</main>
            </div>
            <BottomNav />
          </SolanaWalletProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
