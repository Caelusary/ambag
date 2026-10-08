"use client";

import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

/**
 * A failed server load (the group snapshot or the group list) throws, and without a boundary that
 * blanks the whole page. This keeps the brand on screen and offers a retry.
 */
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </Link>
        <div
          role="alert"
          className="rounded-[var(--radius-card)] border border-neutral-200 bg-surface p-6 shadow-sm sm:p-8"
        >
          <h1 className="font-heading text-[24px] leading-tight text-text">
            Couldn&apos;t load this page
          </h1>
          <p className="mt-1.5 mb-6 text-sm text-neutral-700">
            Check your connection and try again.
          </p>
          <Button block onClick={() => retry()}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
