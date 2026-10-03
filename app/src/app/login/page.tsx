import Link from "next/link";
import { login, resendConfirmation } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AUTH_INPUT, AUTH_LABEL, AuthCard, DemoOption } from "@/components/auth/AuthCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to see your group's tasks."
      error={error}
      notice={notice}
      footer={
        <>
          No account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-accent-700 underline underline-offset-2"
          >
            Sign up
          </Link>
        </>
      }
    >
      {/*
        "Email not confirmed" is the one login error with a next step (Supabase emailed a link on
        sign-up), so offer to resend it instead of leaving the user stuck.
      */}
      {error === "email_not_confirmed" && (
        <form
          action={resendConfirmation}
          className="mb-5 flex flex-col gap-3 rounded-[var(--radius-base)] bg-bg p-3"
        >
          <label className={AUTH_LABEL}>
            Resend the confirmation email to
            <input name="email" type="email" autoComplete="email" required className={AUTH_INPUT} />
          </label>
          <SubmitButton variant="secondary" size="sm" pendingLabel="Resending…">
            Resend confirmation email
          </SubmitButton>
        </form>
      )}

      <form action={login} className="flex flex-col gap-4">
        <label className={AUTH_LABEL}>
          Email
          <input name="email" type="email" autoComplete="email" required className={AUTH_INPUT} />
        </label>
        <label className={AUTH_LABEL}>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            className={AUTH_INPUT}
          />
        </label>
        <SubmitButton block pendingLabel="Logging in…" className="mt-1">
          Log in
        </SubmitButton>
      </form>

      <DemoOption />
    </AuthCard>
  );
}
