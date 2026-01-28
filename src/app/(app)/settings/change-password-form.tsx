"use client";

import { useActionState } from "react";
import {
  changePassword,
  type ChangePasswordState,
} from "@/lib/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePassword, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {state && "error" in state && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {state.success}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Changing..." : "Change password"}
      </Button>
    </form>
  );
}
