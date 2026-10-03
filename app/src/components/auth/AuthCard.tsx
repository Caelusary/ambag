import Link from "next/link";
import type { ReactNode } from "react";
import { authErrorMessage, authNoticeMessage } from "@/lib/auth-errors";
import { Wordmark } from "@/components/ui/Logo";
import { FIELD_CONTROL } from "@/components/ui/fields";

/** The frame shared by log in, sign up and onboarding: brand, heading, banners, then the form. */
export function AuthCard({
  title,
  subtitle,
  error,
  notice,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  error?: string;
  notice?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const noticeMessage = authNoticeMessage(notice);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </Link>
        <div className="rounded-[var(--radius-card)] border border-neutral-200 bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="font-heading text-[24px] leading-tight text-text">{title}</h1>
          <p className="mt-1.5 mb-6 text-sm text-neutral-700">{subtitle}</p>

          {noticeMessage && (
            <p
              role="status"
              className="mb-4 rounded-[var(--radius-base)] bg-accent-2-100 px-3 py-2.5 text-sm text-accent-2-800"
            >
              {noticeMessage}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-[var(--radius-base)] bg-danger-100 px-3 py-2.5 text-sm text-danger-700"
            >
              {authErrorMessage(error)}
            </p>
          )}

          {children}
        </div>
        {footer && <div className="mt-5 text-center text-sm text-neutral-700">{footer}</div>}
      </div>
    </main>
  );
}

/** Shared by log in and sign up: try everything first without making an account. */
export function DemoOption() {
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3 text-xs text-neutral-700">
        <span className="h-px flex-1 bg-neutral-200" />
        or
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <Link
        href="/demo/pool"
        className="flex min-h-11 w-full items-center justify-center rounded-[var(--radius-pill)] bg-accent-100 px-5 py-2.5 text-[15px] font-semibold text-accent-800 transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent-200 active:scale-[0.97]"
      >
        Try the demo
      </Link>
      <p className="mt-2 text-center text-xs text-neutral-700">
        A sample group with no account needed. Nothing you do there is saved.
      </p>
    </div>
  );
}

export const AUTH_INPUT = `${FIELD_CONTROL} bg-bg`;
export const AUTH_LABEL = "flex flex-col gap-1.5 text-sm font-medium text-neutral-800";
