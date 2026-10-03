"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Fixed reference instant the demo's data is seeded around. Rendering the first frame from a fixed
 * instant on both server and client keeps the markup identical during hydration.
 */
export const EPOCH = 1_767_225_600_000; // 2026-01-01T00:00:00Z

// The instant the first frame is drawn at. The demo uses EPOCH; a real group passes the time the
// server rendered, so deadlines read correctly from the very first frame.
const ClockOriginContext = createContext(EPOCH);

export function ClockProvider({ origin, children }: { origin: number; children: ReactNode }) {
  return createElement(ClockOriginContext.Provider, { value: origin }, children);
}

/**
 * The current time for rendering: starts at the clock's origin (deterministic for SSR) and then
 * advances in real time once mounted, so deadline-derived rules such as the 48-hour swap cutoff
 * recompute live rather than being cached.
 */
export function useNow(intervalMs = 60_000) {
  const origin = useContext(ClockOriginContext);
  const [now, setNow] = useState(origin);

  useEffect(() => {
    const mountedAt = Date.now();
    const tick = () => setNow(origin + (Date.now() - mountedAt));
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [origin, intervalMs]);

  return now;
}
