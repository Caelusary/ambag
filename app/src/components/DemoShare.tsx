"use client";

import { StoreProvider } from "@/lib/store";
import { PublicShare } from "./PublicShare";

/** The demo's public link, backed by its own in-memory store since there's no server data. */
export function DemoShare({ token }: { token: string }) {
  return (
    <StoreProvider>
      <PublicShare token={token} />
    </StoreProvider>
  );
}
