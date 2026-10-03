"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./Button";

/** A form's submit button that disables itself and says what's happening while the action runs. */
export function SubmitButton({
  pendingLabel,
  children,
  ...rest
}: ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...rest}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
