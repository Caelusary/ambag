"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", hour: "numeric", minute: "2-digit" };

/**
 * A timestamp in the viewer's own time zone. The server doesn't know that zone, so the first frame
 * renders in UTC on both sides (keeping hydration consistent) and switches once mounted.
 */
export function LocalTime({ ts }: { ts: number }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = new Date(ts);
  return (
    <time dateTime={date.toISOString()}>
      {date.toLocaleString("en-US", mounted ? FORMAT : { ...FORMAT, timeZone: "UTC" })}
    </time>
  );
}
