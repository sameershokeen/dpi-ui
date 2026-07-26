"use client";

import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { Megaphone, Globe, Shield, Zap, ExternalLink } from "lucide-react";

const ANNOUNCEMENTS = [
  {
    id: 1,
    type: "launch",
    icon: Zap,
    iconColor: "#5B4FE9",
    iconBg: "#EEF0FF",
    title: "DPI Registry is live on Devnet!",
    body: "The DPI Handle Registry smart contract has been deployed on Solana Devnet. Claim your @handle now. Program ID: CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc",
    badge: "Launch",
    badgeStatus: "accent" as const,
    date: "Today",
    link: "https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet",
    linkLabel: "View Contract",
  },
  {
    id: 2,
    type: "info",
    icon: Shield,
    iconColor: "#22C97A",
    iconBg: "#E8FAF1",
    title: "Handle governance rules",
    body: "DPI maintains a reserved handle list to protect the ecosystem: admin, support, help, security, dpi, team. These cannot be registered by any wallet. Admin can also freeze handles violating community standards.",
    badge: "Governance",
    badgeStatus: "success" as const,
    date: "Pinned",
  },
  {
    id: 3,
    type: "info",
    icon: Globe,
    iconColor: "#F5A623",
    iconBg: "#FFF8EC",
    title: "One wallet. One handle. Always.",
    body: "The DPI protocol enforces that each wallet can only register one handle. This is enforced on-chain via a ReverseLookup PDA — no way around it. Handles are transferable unless frozen by admin.",
    badge: "Protocol",
    badgeStatus: "warning" as const,
    date: "Pinned",
  },
  {
    id: 4,
    type: "announcement",
    icon: Megaphone,
    iconColor: "#E8453C",
    iconBg: "#FFEEED",
    title: "Mainnet launch coming soon",
    body: "We are currently on Devnet. Mainnet deployment is planned after thorough security audits. All Devnet handles will not carry over — claim early to secure your handle name for mainnet.",
    badge: "Upcoming",
    badgeStatus: "danger" as const,
    date: "Upcoming",
  },
];

export default function CommunityPage() {
  return (
    <div>
      <Header title="Community" />
      <div style={{ padding: "20px" }}>
        {/* Header section */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, #7B6FF0 100%)",
            borderRadius: 16,
            padding: "20px",
            marginBottom: 20,
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Megaphone size={20} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>DPI Announcements</span>
          </div>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
            Official updates from the DPI team. Protocol governance, feature launches, and community news.
          </p>
        </div>

        {/* Announcements */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ANNOUNCEMENTS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} style={{ padding: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: item.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color={item.iconColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <StatusBadge status={item.badgeStatus}>{item.badge}</StatusBadge>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {item.date}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, lineHeight: 1.3 }}>
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.body}
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 10,
                          fontSize: 12,
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        {item.linkLabel} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Contract info footer */}
        <Card style={{ padding: "16px", marginTop: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            CONTRACT INFO
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <div>
              Program ID:{" "}
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "var(--text-primary)",
                  wordBreak: "break-all",
                }}
              >
                CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc
              </span>
            </div>
            <div style={{ marginTop: 4 }}>Network: Solana Devnet</div>
          </div>
          <a
            href="https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 10,
              fontSize: 12,
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Open in Explorer <ExternalLink size={12} />
          </a>
        </Card>
      </div>
    </div>
  );
}
