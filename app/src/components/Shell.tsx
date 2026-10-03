"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store-context";
import { useSpace } from "@/lib/space";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";

export function Shell({ children }: { children: ReactNode }) {
  const { base } = useSpace();
  // Matched without the /demo or /<group id> prefix, so both spaces share the routing below.
  const pathname = usePathname().slice(base.length) || "/";
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { getTask, error, clearError } = useStore();

  const taskId = params?.id ? Number(params.id) : null;
  const task = taskId != null ? getTask(taskId) : undefined;

  const isDetail = /^\/task\/[^/]+$/.test(pathname);
  const isProof = /^\/task\/[^/]+\/proof$/.test(pathname);
  const isSwap = /^\/task\/[^/]+\/swap$/.test(pathname);
  const isOverlay = isDetail || isProof || isSwap;

  let title = "Ambag";
  let subtitle: string | undefined;
  if (isDetail) {
    // The task's own name heads the summary card just below, so the bar doesn't repeat it.
    title = "Task detail";
  } else if (isProof) {
    title = "Submit proof";
    subtitle = task?.title;
  } else if (isSwap) {
    title = "Request swap";
    subtitle = task?.title;
  } else if (pathname === "/pool") {
    title = "Task pool";
    subtitle = "Claim open tasks and keep track of yours";
  } else if (pathname === "/review") {
    title = "Leader review";
    subtitle = "Submissions waiting for a decision";
  } else if (pathname === "/ledger") {
    title = "Member ledger";
    subtitle = "Full visibility, not a scoreboard";
  } else if (pathname === "/share") {
    title = "Share";
    subtitle = "What your professor sees through the read-only link";
  }

  function handleBack() {
    if (isProof || isSwap) router.push(`${base}/task/${taskId}`);
    else if (isDetail) router.push(`${base}/pool`);
  }

  // Phones and tablets: header, content, bottom tab bar. From lg up: a sidebar beside a wide
  // content column, with the tab bar gone. Forms cap their own width; lists use the room.
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <Header
          title={title}
          subtitle={subtitle}
          showBack={isOverlay}
          onBack={handleBack}
          brand={!isOverlay}
        />
        <main className="mx-auto w-full max-w-[640px] flex-1 px-5 py-5 lg:max-w-[1080px] lg:px-10 lg:py-8">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start justify-between gap-3 rounded-[var(--radius-base)] border border-danger-600/30 bg-danger-100 px-4 py-3 text-sm text-danger-700"
            >
              {error}
              <button
                onClick={clearError}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}
          {children}
        </main>
        {!isOverlay && <TabBar />}
      </div>
    </div>
  );
}
