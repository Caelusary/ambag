"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Where the pages are running: the in-browser demo, or one real group. The same page files serve
 * both, under /demo/... and /<group id>/..., so links are built from `base`.
 */
export interface Space {
  kind: "demo" | "live";
  /** The URL prefix every in-app link starts with. */
  base: string;
  groupId: string | null;
  groupName: string;
  /** Members share this to bring teammates in. Null in the demo. */
  inviteCode: string | null;
  /** Every group the signed-in user belongs to, for the switcher. Empty in the demo. */
  groups: { id: string; name: string }[];
}

// Pages rendered on their own, as in the unit tests, get the demo with root-relative links.
const DEFAULT_SPACE: Space = {
  kind: "demo",
  base: "",
  groupId: null,
  groupName: "Demo group",
  inviteCode: null,
  groups: [],
};

const SpaceContext = createContext<Space>(DEFAULT_SPACE);

export function SpaceProvider({ value, children }: { value: Space; children: ReactNode }) {
  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace() {
  return useContext(SpaceContext);
}
