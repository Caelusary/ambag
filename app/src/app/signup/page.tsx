import Link from "next/link";
import { signup } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AUTH_INPUT, AUTH_LABEL, AuthCard, DemoOption } from "@/components/auth/AuthCard";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start a group for your project, or join one with an invite code."
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent-700 underline underline-offset-2"
          >
            Log in
          </Link>
        </>
      }
    >
      <form action={signup} className="flex flex-col gap-4">
        <label className={AUTH_LABEL}>
          Your name
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={40}
            className={AUTH_INPUT}
          />
          <span className="text-xs font-normal text-neutral-700">
            What teammates see on tasks and in the log.
          </span>
        </label>
        <label className={AUTH_LABEL}>
          Email
          <input name="email" type="email" autoComplete="email" required className={AUTH_INPUT} />
        </label>
        <label className={AUTH_LABEL}>
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className={AUTH_INPUT}
          />
          <span className="text-xs font-normal text-neutral-700">At least 6 characters.</span>
        </label>
        <SubmitButton block pendingLabel="Creating account…" className="mt-1">
          Sign up
        </SubmitButton>
      </form>

      <DemoOption />
    </AuthCard>
  );
}
