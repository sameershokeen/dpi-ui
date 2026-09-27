import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/WalletProvider";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
import ProtocolEventListener from "@/components/ProtocolEventListener";
import ErrorBoundary from "@/components/ErrorBoundary";
import CommandPalette from "@/components/CommandPalette";
import { ThemeProvider } from "@/components/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dpi-app.dev"),
  title: "DPI — Solana Decentralized Public Infrastructure",
  description:
    "Privacy like crypto, simplicity like UPI. Decentralized handle registry and instant payments on Solana.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/dpi-icon-square.png", sizes: "1024x1024", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/dpi-icon-square.png",
  },
  openGraph: {
    title: "DPI — Solana Decentralized Public Infrastructure",
    description:
      "Privacy like crypto, simplicity like UPI. Decentralized handle registry and instant payments on Solana.",
    url: "https://dpi-app.dev",
    siteName: "DPI",
    images: [
      {
        url: "/dpi-icon.png",
        width: 1536,
        height: 1024,
        alt: "DPI — Solana Based UPI",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DPI — Solana Decentralized Public Infrastructure",
    description:
      "Privacy like crypto, simplicity like UPI. Decentralized handle registry and instant payments on Solana.",
    images: ["/dpi-icon.png"],
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
      <body className="antialiased min-h-screen bg-background text-foreground relative selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <ToastProvider>
            <SolanaWalletProvider>
            {/* Ambient Lighting Gradients */}
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
              className="z-10 shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] border-x border-(--border) bg-background transition-colors duration-200"
            >
              <main className="flex-1 w-full pb-20">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              <Footer />
            </div>
            <BottomNav />
            <ProtocolEventListener />
            {/* FEAT-045: Global Keyboard Command Palette (Cmd+K) */}
            <CommandPalette />
          </SolanaWalletProvider>
        </ToastProvider>
      </ThemeProvider>
    </body>
  </html>
  );
}
