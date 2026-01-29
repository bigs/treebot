"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createChatAction } from "@/lib/actions/chat-actions";
import type { ModelInfo } from "@/lib/models";

const LS_MODEL_KEY = "treebot:last-model";
const LS_REASONING_KEY = "treebot:last-reasoning";
const DEFAULT_MODEL_ID = "gemini-3-pro-preview";
const DEFAULT_REASONING = "high";

function validReasoningForModel(
  model: ModelInfo | undefined,
  current: string
): string {
  if (!model || model.reasoningLevels.length === 0) return "";
  if (model.reasoningLevels.some((l) => l.value === current)) return current;
  return model.defaultReasoningLevel;
}

export function NewChatForm({ models }: { models: ModelInfo[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // We use a single state for the selected model and reasoning to keep them in sync
  const [selection, setSelection] = useState<{
    modelId: string;
    reasoningLevel: string;
  }>(() => {
    const firstModel = models.length > 0 ? models[0] : null;
    const defaultModel =
      models.find((m) => m.id === DEFAULT_MODEL_ID) ?? firstModel;
    return {
      modelId: defaultModel?.id ?? "",
      reasoningLevel: defaultModel
        ? validReasoningForModel(defaultModel, DEFAULT_REASONING)
        : "",
    };
  });

  // Hydrate from localStorage after mount
  useEffect(() => {
    const storedModelId = localStorage.getItem(LS_MODEL_KEY);
    const storedReasoning = localStorage.getItem(LS_REASONING_KEY);

    const resolvedModel =
      models.find((m) => m.id === storedModelId) ??
      models.find((m) => m.id === DEFAULT_MODEL_ID) ??
      (models.length > 0 ? models[0] : null);

    if (resolvedModel) {
      const effectiveReasoning = storedReasoning ?? DEFAULT_REASONING;
      const finalReasoning = validReasoningForModel(
        resolvedModel,
        effectiveReasoning
      );

      setSelection({
        modelId: resolvedModel.id,
        reasoningLevel: finalReasoning,
      });

      // Ensure localStorage is in sync with what we just resolved
      localStorage.setItem(LS_MODEL_KEY, resolvedModel.id);
      if (finalReasoning) {
        localStorage.setItem(LS_REASONING_KEY, finalReasoning);
      }
    }
  }, [models]);

  const selectedModel = models.find((m) => m.id === selection.modelId);
  const showReasoning =
    selectedModel != null && selectedModel.reasoningLevels.length > 0;

  // Fallback for reasoningLevel if it's empty but shouldn't be
  useEffect(() => {
    if (showReasoning && selection.reasoningLevel === "" && selectedModel) {
      const fallback = selectedModel.defaultReasoningLevel;
      setSelection((prev) => ({
        ...prev,
        reasoningLevel: fallback,
      }));
      localStorage.setItem(LS_REASONING_KEY, fallback);
    }
  }, [showReasoning, selection.reasoningLevel, selectedModel]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      const newModel = models.find((m) => m.id === modelId);
      if (!newModel) return;

      const storedPreference =
        localStorage.getItem(LS_REASONING_KEY) ?? DEFAULT_REASONING;
      const nextReasoning = validReasoningForModel(newModel, storedPreference);

      setSelection({ modelId, reasoningLevel: nextReasoning });
      localStorage.setItem(LS_MODEL_KEY, modelId);
      // If we computed a valid reasoning level, make sure it's saved as the new preference
      // or at least ensures the current state is consistent in storage
      if (nextReasoning) {
        localStorage.setItem(LS_REASONING_KEY, nextReasoning);
      }
    },
    [models]
  );

  const handleReasoningChange = useCallback((value: string) => {
    setSelection((prev) => ({ ...prev, reasoningLevel: value }));
    localStorage.setItem(LS_REASONING_KEY, value);
  }, []);

  // Group models by provider
  const grouped = new Map<string, ModelInfo[]>();
  for (const model of models) {
    const group = grouped.get(model.providerName) ?? [];
    group.push(model);
    grouped.set(model.providerName, group);
  }

  const canSubmit = selection.modelId !== "" && message.trim() !== "";

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedModel) return;

    setError("");
    startTransition(async () => {
      const result = await createChatAction({
        provider: selectedModel.provider,
        model: selectedModel.id,
        message: message.trim(),
        reasoningLevel: showReasoning ? selection.reasoningLevel : undefined,
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/chats/${result.chatId}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
      <textarea
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none overflow-y-auto rounded-lg border px-4 py-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        rows={4}
        style={{ fieldSizing: "content", maxHeight: "140px" }}
        placeholder="What's on your mind?"
        autoFocus
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit) handleSubmit(e);
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selection.modelId} onValueChange={handleModelChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {[...grouped.entries()].map(([providerName, providerModels]) => (
              <SelectGroup key={providerName}>
                <SelectLabel>{providerName}</SelectLabel>
                {providerModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {showReasoning && (
          <Select
            key={selection.modelId}
            value={selection.reasoningLevel}
            onValueChange={handleReasoningChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Reasoning" />
            </SelectTrigger>
            <SelectContent>
              {selectedModel.reasoningLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label} reasoning
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit || isPending}
          className="ml-auto rounded-full"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
}
