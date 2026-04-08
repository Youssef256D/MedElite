"use client";

import { useEffect, useState } from "react";

const positions = [
  "top-6 left-6",
  "top-12 right-8",
  "bottom-10 left-8",
  "bottom-16 right-10",
  "top-1/2 left-1/3 -translate-y-1/2",
  "top-1/3 right-1/4",
];

type WatermarkOverlayProps = {
  fullName: string;
  userId: string;
};

export function WatermarkOverlay({ fullName, userId }: WatermarkOverlayProps) {
  const [positionIndex, setPositionIndex] = useState(0);
  const [timestamp, setTimestamp] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPositionIndex((current) => (current + 1) % positions.length);
      setTimestamp(new Date().toLocaleTimeString());
    }, 8_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded-2xl border border-white/20 bg-black/28 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white/80 backdrop-blur-sm transition-all duration-700 ${positions[positionIndex]}`}
    >
      <p>{fullName}</p>
      <p>ID {userId.slice(0, 8)}</p>
      <p>{timestamp}</p>
    </div>
  );
}
