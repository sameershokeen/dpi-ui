"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, AlertCircle, Loader, Flashlight } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedValue: string) => void;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScan,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let isSubscribed = true;
    setError(null);
    setLoading(true);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setLoading(false);
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setLoading(false);
        setError("Camera permission denied or camera unavailable.");
      }
    }

    startCamera();

    // Check BarcodeDetector API if available
    let intervalId: any = null;
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });

        intervalId = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue;
                triggerHaptic("success");
                toast.success("QR Code Scanned!");
                onScan(rawVal);
                onClose();
              }
            } catch {}
          }
        }, 500);
      } catch {}
    }

    return () => {
      isSubscribed = false;
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, onScan, onClose, toast]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-xs sm:max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close scanner"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mt-1">
          <h3 className="text-base font-black text-white">Scan Recipient QR</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Point your camera at a Solana Pay or @handle QR code
          </p>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black border border-indigo-500/40 shadow-inner flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0c101d] text-indigo-400">
              <Loader size={24} className="animate-spin" />
              <span className="text-xs text-slate-400">Starting camera...</span>
            </div>
          )}

          {error ? (
            <div className="p-4 text-center text-rose-400 flex flex-col items-center gap-2">
              <AlertCircle size={24} />
              <p className="text-xs text-slate-300">{error}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          )}

          {/* Scanner Reticle Overlay */}
          {!error && !loading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-indigo-400/80 rounded-xl relative animate-pulse">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/6 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
