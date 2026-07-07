"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingLabel?: string;
};

/**
 * Submit button that reflects the enclosing <form> action's pending state: it disables itself and
 * shows a spinner while the server action runs, preventing double submits and giving the user
 * feedback between click and navigation.
 */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-busy={pending} disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

type ConfirmSubmitButtonProps = SubmitButtonProps & {
  /** Message shown in the confirmation prompt before the form is allowed to submit. */
  confirmMessage: string;
};

/**
 * Submit button that asks for confirmation before submitting a consequential action (role changes,
 * certificate issuance, finance holds). Also reflects the form's pending state.
 */
export function ConfirmSubmitButton({ confirmMessage, onClick, ...props }: ConfirmSubmitButtonProps) {
  return (
    <SubmitButton
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
