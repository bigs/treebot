"use client";

import { useActionState, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveApiKeys,
  type ApiKeyActionState,
} from "@/lib/actions/api-key-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS = [
  { name: "google", label: "Google AI Studio" },
  { name: "openai", label: "OpenAI" },
] as const;

export function ApiKeyForm({ savedPlatforms }: { savedPlatforms: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const wrappedAction = useCallback(
    async (prev: ApiKeyActionState, formData: FormData) => {
      const result = await saveApiKeys(prev, formData);
      if (result && "success" in result) {
        setEditing({});
        router.refresh();
      }
      return result;
    },
    [router]
  );

  const [state, action, pending] = useActionState<ApiKeyActionState, FormData>(
    wrappedAction,
    undefined
  );

  const hasSaved = savedPlatforms.length > 0 || (state && "success" in state);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        {FIELDS.map((field) => {
          const isSaved = savedPlatforms.includes(field.name);
          const isEditing = editing[field.name] ?? false;
          const isDisabled = isSaved && !isEditing;
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {isSaved && (
                  <span className="bg-muted text-muted-foreground ml-2 rounded px-1.5 py-0.5 text-xs">
                    key saved
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder={
                    isDisabled
                      ? "••••••••"
                      : isSaved
                        ? "Enter new key to replace"
                        : "Enter API key"
                  }
                  autoComplete="off"
                  disabled={isDisabled}
                />
                {isSaved && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() =>
                      setEditing((prev) => ({
                        ...prev,
                        [field.name]: !prev[field.name],
                      }))
                    }
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {state && "error" in state && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}
        {state && "success" in state && (
          <p className="text-sm text-green-600 dark:text-green-400">
            API keys saved successfully.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </form>
      <Button
        variant="outline"
        className="w-full"
        disabled={!hasSaved}
        onClick={() => router.push("/")}
      >
        Continue
      </Button>
    </div>
  );
}
