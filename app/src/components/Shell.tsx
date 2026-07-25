"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Header } from "./Header";
import { TabBar } from "./TabBar";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { getTask } = useStore();

  const taskId = params?.id ? Number(params.id) : null;
  const task = taskId != null ? getTask(taskId) : undefined;

  const isDetail = /^\/task\/[^/]+$/.test(pathname);
  const isProof = /^\/task\/[^/]+\/proof$/.test(pathname);
  const isSwap = /^\/task\/[^/]+\/swap$/.test(pathname);
  const isOverlay = isDetail || isProof || isSwap;

  let title = "Ambag";
  let subtitle: string | undefined;
  if (isDetail) {
    title = task?.title ?? "Ambag";
    subtitle = "Task detail";
  } else if (isProof) {
    title = "Submit proof";
    subtitle = task?.title;
  } else if (isSwap) {
    title = "Request swap";
    subtitle = task?.title;
  } else if (pathname === "/pool") {
    subtitle = "Task pool";
  } else if (pathname === "/review") {
    subtitle = "Leader review";
  } else if (pathname === "/ledger") {
    subtitle = "Member ledger";
  } else if (pathname === "/share") {
    subtitle = "Shared read-only view";
  }

  function handleBack() {
    if (isProof || isSwap) router.push(`/task/${taskId}`);
    else if (isDetail) router.push("/pool");
  }

  return (
    <div className="flex min-h-dvh w-full justify-center bg-neutral-200 sm:items-center sm:py-8">
      <div className="flex w-full max-w-[480px] min-h-dvh flex-col bg-bg sm:h-[min(860px,calc(100dvh-4rem))] sm:min-h-0 sm:overflow-hidden sm:rounded-[32px] sm:shadow-lg">
        <Header title={title} subtitle={subtitle} showBack={isOverlay} onBack={handleBack} />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
        {!isOverlay && <TabBar />}
      </div>
    </div>
  );
}
