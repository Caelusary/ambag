"use client";

import { useEffect, useState } from "react";

/**
 * Fixed reference instant used to seed the demo data and to render the first
 * frame on both server and client, so markup matches during hydration.
 * When real data lands, this is replaced by timestamps from the backend.
 */
export const EPOCH = 1_767_225_600_000; // 2026-01-01T00:00:00Z

/**
 * Demo clock: starts at EPOCH (deterministic for SSR) and then advances in real
 * time once mounted, so deadline-derived rules such as the 48-hour swap cutoff
 * recompute live rather than being cached.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(EPOCH);

  useEffect(() => {
    const mountedAt = Date.now();
    const tick = () => setNow(EPOCH + (Date.now() - mountedAt));
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
