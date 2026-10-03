"use client";

import dynamic from "next/dynamic";

/**
 * The live store in its own chunk. The group layout serves the demo too, and a static import put
 * supabase-js and its Realtime client (about 72KB gzipped) on every /demo page, which never uses
 * them. Still rendered on the server, so a real group's first frame isn't delayed.
 */
export const LiveStoreProvider = dynamic(() =>
  import("./live-store").then((m) => m.LiveStoreProvider),
);
