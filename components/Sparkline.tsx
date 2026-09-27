"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, X, Clock, BarChart2 } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface SparklineProps {
  symbol: string;
  dataPoints?: number[];
  change24h?: number;
  width?: number;
  height?: number;
}

// Deterministic mock sparkline generator for tokens if live trend points aren't provided
export function generateMockTrend(symbol: string, days = 7): number[] {
  let basePrice = 145; // default for SOL
  let volatility = 0.03;
  if (symbol === "USDC" || symbol === "EURC" || symbol === "PYUSD") {
    basePrice = 1.0;
    volatility = 0.001;
  }

  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const points: number[] = [];
  let current = basePrice;

  for (let i = 0; i < days * 4; i++) {
    const pseudoRand = Math.sin(seed + i * 1.5);
    current += current * pseudoRand * volatility;
    points.push(current);
  }
  return points;
}

export default function Sparkline({
  symbol,
  dataPoints,
  change24h = symbol === "SOL" ? 3.4 : symbol === "USDC" ? 0.02 : symbol === "EURC" ? -0.15 : 0.01,
  width = 64,
  height = 24,
}: SparklineProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"1D" | "7D" | "30D">("7D");

  const points = dataPoints && dataPoints.length > 0 ? dataPoints : generateMockTrend(symbol, 7);
  const isPositive = change24h >= 0;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  // Map to SVG coordinates with 2px padding
  const pad = 2;
  const polyPoints = points
    .map((val, idx) => {
      const x = pad + (idx / (points.length - 1)) * (width - pad * 2);
      const y = height - pad - ((val - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = isPositive ? "#10B981" : "#EF4444";

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic("tap");
          setModalOpen(true);
        }}
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
        title="Click to view full price chart"
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyPoints}
          />
        </svg>

        <span
          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
            isPositive
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
              : "bg-rose-500/15 text-rose-400 border border-rose-500/25"
          }`}
        >
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPositive ? `+${change24h.toFixed(1)}%` : `${change24h.toFixed(1)}%`}
        </span>
      </div>

      {/* Expanded Price Chart Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-indigo-400" />
                <h3 className="text-base font-black text-white">{symbol} Price Action</h3>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-black text-white font-mono">
                  ${points[points.length - 1].toFixed(2)}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                    isPositive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {isPositive ? `+${change24h}% (24h)` : `${change24h}% (24h)`}
                </span>
              </div>
            </div>

            {/* Timeframe switch */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-white/4 border border-white/8 text-xs font-bold font-mono">
              {(["1D", "7D", "30D"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setTimeframe(tf);
                  }}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    timeframe === tf
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Modal chart SVG */}
            <div className="h-40 w-full rounded-2xl bg-white/2 border border-white/6 p-3 flex flex-col justify-between">
              <div className="text-[10px] text-slate-500 font-mono text-right">
                High: ${max.toFixed(2)}
              </div>
              <div className="w-full h-24">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 280 80"
                  preserveAspectRatio="none"
                  className="overflow-visible"
                >
                  <defs>
                    <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Fill area */}
                  <polygon
                    fill={`url(#grad-${symbol})`}
                    points={`0,80 ${points
                      .map((val, idx) => {
                        const x = (idx / (points.length - 1)) * 280;
                        const y = 80 - 4 - ((val - min) / range) * 72;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(" ")} 280,80`}
                  />
                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points
                      .map((val, idx) => {
                        const x = (idx / (points.length - 1)) * 280;
                        const y = 80 - 4 - ((val - min) / range) * 72;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
              <div className="text-[10px] text-slate-500 font-mono text-right">
                Low: ${min.toFixed(2)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
