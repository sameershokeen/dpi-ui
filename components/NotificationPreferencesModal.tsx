"use client";

import { useState, useEffect } from "react";
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Check,
  Smartphone,
  Sliders,
  Sparkles,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";
import {
  isSoundEnabled,
  setSoundEnabled,
  playSendSuccessSound,
  playNotificationSound,
  playWalletConnectSound,
} from "@/lib/sounds";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NotificationSettings {
  inboundEnabled: boolean;
  pushEnabled: boolean;
  minAmountSol: number;
}

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") {
    return { inboundEnabled: true, pushEnabled: false, minAmountSol: 0.001 };
  }
  try {
    const raw = localStorage.getItem("dpi_notif_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { inboundEnabled: true, pushEnabled: false, minAmountSol: 0.001 };
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dpi_notif_settings", JSON.stringify(settings));
}

export default function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const toast = useToast();
  const [inboundAlerts, setInboundAlerts] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [minAmount, setMinAmount] = useState(0.001);
  const [soundEffects, setSoundEffects] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (!isOpen) return;
    const settings = getNotificationSettings();
    setInboundAlerts(settings.inboundEnabled);
    setPushEnabled(settings.pushEnabled);
    setMinAmount(settings.minAmountSol);
    setSoundEffects(isSoundEnabled());

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState("unsupported");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPushPermission = async () => {
    triggerHaptic("selection");
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser push notifications are not supported in this browser.");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermissionState(perm);
      if (perm === "granted") {
        setPushEnabled(true);
        toast.success("Desktop notifications enabled!");
        new Notification("DPI Notifications Enabled 🔔", {
          body: "You'll be notified of incoming payments in real time.",
          icon: "/dpi-icon-square.png",
        });
      } else {
        setPushEnabled(false);
        toast.error("Notification permission was denied.");
      }
    } catch {
      toast.error("Failed to request notification permission.");
    }
  };

  const handleSave = () => {
    triggerHaptic("success");
    saveNotificationSettings({
      inboundEnabled: inboundAlerts,
      pushEnabled,
      minAmountSol: minAmount,
    });
    setSoundEnabled(soundEffects);
    toast.success("Preferences updated successfully!");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bell size={20} />
          </div>
          <h3 className="text-base font-black text-white">Alerts & Sound Settings</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure inbound payment alerts, push notifications, and sound cues
          </p>
        </div>

        <div className="flex flex-col gap-3 py-1">
          {/* Inbound payment alerts */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/4 border border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Bell size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Inbound Toast Alerts</div>
                <div className="text-[10px] text-slate-400">Show toast on incoming SOL transfers</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={inboundAlerts}
              onChange={(e) => {
                triggerHaptic("selection");
                setInboundAlerts(e.target.checked);
              }}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Browser Push Notifications */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/4 border border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Smartphone size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Browser Push Notifications</div>
                <div className="text-[10px] text-slate-400">
                  {permissionState === "granted"
                    ? "Permitted in browser"
                    : permissionState === "denied"
                    ? "Blocked by browser"
                    : "Native system notifications"}
                </div>
              </div>
            </div>
            {permissionState === "granted" ? (
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => {
                  triggerHaptic("selection");
                  setPushEnabled(e.target.checked);
                }}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
            ) : (
              <button
                type="button"
                onClick={handleRequestPushPermission}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer"
              >
                Enable
              </button>
            )}
          </div>

          {/* Sound Effects (FEAT-044) */}
          <div className="p-3 rounded-2xl bg-white/4 border border-white/8 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                  {soundEffects ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Audio Cues (Web Audio API)</div>
                  <div className="text-[10px] text-slate-400">Chimes on connect & send success</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => {
                  triggerHaptic("selection");
                  const val = e.target.checked;
                  setSoundEffects(val);
                  if (val) {
                    playWalletConnectSound();
                  }
                }}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
            </div>

            {soundEffects && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/6">
                <span className="text-[10px] text-slate-400">Test sound:</span>
                <button
                  type="button"
                  onClick={() => playNotificationSound()}
                  className="px-2 py-0.5 rounded-md bg-white/6 hover:bg-white/10 text-[10px] text-indigo-300 cursor-pointer font-medium"
                >
                  Pop
                </button>
                <button
                  type="button"
                  onClick={() => playSendSuccessSound()}
                  className="px-2 py-0.5 rounded-md bg-white/6 hover:bg-white/10 text-[10px] text-emerald-300 cursor-pointer font-medium"
                >
                  Success Chime
                </button>
              </div>
            )}
          </div>

          {/* Minimum Amount Threshold */}
          <div className="p-3 rounded-2xl bg-white/4 border border-white/8 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Sliders size={14} className="text-indigo-400" />
                <span>Min Amount Threshold</span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400">{minAmount} SOL</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.0001, 0.001, 0.01, 0.1].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    setMinAmount(val);
                  }}
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    minAmount === val
                      ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/60"
                      : "bg-white/3 text-slate-400 border-white/8 hover:bg-white/6"
                  }`}
                >
                  &ge;{val}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
