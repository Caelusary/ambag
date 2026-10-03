/**
 * Fixed allowlist of messages for the sign-in, sign-up and onboarding banners. Never render
 * Supabase's raw error text (or any other free-form string) there: a `?error=` query param with
 * attacker-controlled text is a phishing vector. Only codes from these tables, or "unknown", are
 * ever displayed.
 */
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Confirm your email before logging in.",
  user_already_exists: "An account with that email already exists.",
  weak_password: "That password is too weak. Use at least 6 characters.",
  over_email_send_rate_limit: "Too many emails sent. Wait a moment and try again.",
  email_address_invalid: "That email address doesn't look valid.",
  invalid_input: "Enter a valid email and a password of at least 6 characters.",
  invalid_name: "Enter your name, up to 40 characters.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
  link_expired: "That confirmation link has expired or was already used. Log in to get a new one.",
  invalid_group_name: "Give the group a name, up to 60 characters.",
  invite_not_found: "No group has that invite code. Check it with your leader.",
};

const DEFAULT_CODE = "unknown";
const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

export function authErrorCode(error: { code?: string } | null | undefined): string {
  return error?.code && error.code in ERROR_MESSAGES ? error.code : DEFAULT_CODE;
}

export function authErrorMessage(code: string | undefined): string {
  if (!code) return DEFAULT_MESSAGE;
  return ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}

// Same allowlist principle, for non-error banners.
const NOTICE_MESSAGES: Record<string, string> = {
  check_email: "Check your inbox for a confirmation link, then log in.",
  confirmation_resent: "Confirmation email resent. Check your inbox and spam folder.",
};

export function authNoticeMessage(code: string | undefined): string | null {
  if (!code) return null;
  return NOTICE_MESSAGES[code] ?? null;
}
