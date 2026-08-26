"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4000) => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-3), newToast]); // keep max 4 at a time

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string, duration?: number) =>
      addToast("success", message, title, duration),
    error: (message: string, title?: string, duration?: number) =>
      addToast("error", message, title, duration),
    info: (message: string, title?: string, duration?: number) =>
      addToast("info", message, title, duration),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
              t.type === "success"
                ? "bg-[#0c1a14]/90 border-emerald-500/30 text-white"
                : t.type === "error"
                ? "bg-[#1c0d12]/90 border-rose-500/30 text-white"
                : "bg-[#0f172a]/90 border-indigo-500/30 text-white"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && <CheckCircle2 size={18} className="text-emerald-400" />}
              {t.type === "error" && <AlertCircle size={18} className="text-rose-400" />}
              {t.type === "info" && <Info size={18} className="text-indigo-400" />}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && (
                <div className="text-xs font-bold tracking-tight text-white mb-0.5">
                  {t.title}
                </div>
              )}
              <div className="text-xs text-slate-300 leading-relaxed warp-break-words">
                {t.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg: string, title?: string) => console.log("[Toast Success]", title, msg),
      error: (msg: string, title?: string) => console.error("[Toast Error]", title, msg),
      info: (msg: string, title?: string) => console.log("[Toast Info]", title, msg),
    };
  }
  return context.toast;
}
