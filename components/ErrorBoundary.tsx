"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering error in DPI app:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full bg-[#111827] border border-rose-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle size={28} />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected RPC or rendering issue occurred. Your funds and wallet remain safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="w-full p-3 rounded-xl bg-black/40 border border-white/8 text-[11px] text-rose-300/90 font-mono text-left max-h-24 overflow-y-auto break-all">
                {this.state.error.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 w-full mt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <RefreshCw size={13} />
                Try Again
              </button>

              <Link
                href="/"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="py-2.5 px-3 rounded-xl bg-white/8 hover:bg-white/12 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Home size={13} />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
