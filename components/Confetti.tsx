"use client";

import React, { useEffect, useState } from "react";

interface ConfettiProps {
  active: boolean;
  particleCount?: number;
}

interface Particle {
  id: number;
  x: number; // percentage or offset
  y: number;
  color: string;
  size: number;
  isCircle: boolean;
  angle: number;
  delay: number;
  duration: number;
}

const BRAND_COLORS = [
  "#6366F1", // indigo
  "#A855F7", // purple
  "#10B981", // emerald
  "#38BDF8", // sky
  "#EC4899", // pink
  "#F59E0B", // amber
];

export default function Confetti({ active, particleCount = 28 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Trigger subtle haptic feedback if supported on mobile
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      try {
        navigator.vibrate([20, 30, 50, 30, 20]);
      } catch {
        // Ignore haptic error
      }
    }

    const generated: Particle[] = Array.from({ length: particleCount }).map((_, i) => {
      // Angles from -80deg to +80deg around downward or outward trajectory
      const angle = (Math.random() - 0.5) * 160;
      const x = (Math.random() - 0.5) * 180; // horizontal drift px
      const y = Math.random() * 200 + 100; // vertical drop px
      const color = BRAND_COLORS[i % BRAND_COLORS.length];
      const size = Math.floor(Math.random() * 6) + 6; // 6px to 12px
      const isCircle = Math.random() > 0.4;
      const delay = Math.random() * 0.2; // 0s - 0.2s delay
      const duration = 1.2 + Math.random() * 0.5; // 1.2s - 1.7s

      return { id: i, x, y, color, size, isCircle, angle, delay, duration };
    });

    setParticles(generated);
  }, [active, particleCount]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-60 flex items-start justify-center">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-8 inline-block opacity-0 animate-confetti-fall"
          style={
            {
              backgroundColor: p.color,
              width: `${p.size}px`,
              height: p.isCircle ? `${p.size}px` : `${p.size * 1.5}px`,
              borderRadius: p.isCircle ? "50%" : "2px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--confetti-x": `${p.x}px`,
              "--confetti-y": `${p.y}px`,
              "--confetti-angle": `${p.angle}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
