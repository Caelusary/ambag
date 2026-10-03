import { describe, expect, it } from "vitest";
import { authErrorCode, authErrorMessage, authNoticeMessage } from "./auth-errors";

describe("auth error allowlist", () => {
  it("passes through codes it knows", () => {
    expect(authErrorCode({ code: "invalid_credentials" })).toBe("invalid_credentials");
    expect(authErrorMessage("invalid_credentials")).toBe("Incorrect email or password.");
  });

  it("collapses anything else to a generic code, so raw error text never reaches the page", () => {
    expect(authErrorCode({ code: "some_new_supabase_code" })).toBe("unknown");
    expect(authErrorCode(null)).toBe("unknown");
  });

  it("never echoes a crafted ?error= value", () => {
    const crafted = "Your account is locked. Call 555-0100 to verify";
    expect(authErrorMessage(crafted)).toBe("Something went wrong. Please try again.");
    expect(authNoticeMessage(crafted)).toBeNull();
  });
});
