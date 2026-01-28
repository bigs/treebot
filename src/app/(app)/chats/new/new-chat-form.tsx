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
  const [message, setMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [reasoningLevel, setReasoningLevel] = useState("");
  const [error, setError] = useState("");

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const storedId = localStorage.getItem(LS_MODEL_KEY);
    if (storedId && models.some((m) => m.id === storedId)) {
      setSelectedModelId(storedId);
      const model = models.find((m) => m.id === storedId);
      if (model && model.reasoningLevels.length > 0) {
        const storedLevel = localStorage.getItem(LS_REASONING_KEY);
        setReasoningLevel(validReasoningForModel(model, storedLevel ?? ""));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const showReasoning =
    selectedModel != null && selectedModel.reasoningLevels.length > 0;

  const handleModelChange = useCallback(
    (value: string) => {
      setSelectedModelId(value);
      localStorage.setItem(LS_MODEL_KEY, value);

      const newModel = models.find((m) => m.id === value);
      const next = validReasoningForModel(newModel, reasoningLevel);
      if (next !== reasoningLevel) {
        setReasoningLevel(next);
        localStorage.setItem(LS_REASONING_KEY, next);
      }
    },
    [models, reasoningLevel]
  );

  const handleReasoningChange = useCallback((value: string) => {
    setReasoningLevel(value);
    localStorage.setItem(LS_REASONING_KEY, value);
  }, []);

  // Group models by provider
  const grouped = new Map<string, ModelInfo[]>();
  for (const model of models) {
    const group = grouped.get(model.providerName) ?? [];
    group.push(model);
    grouped.set(model.providerName, group);
  }

  const canSubmit = selectedModelId !== "" && message.trim() !== "";

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedModel) return;

    setError("");
    startTransition(async () => {
      const result = await createChatAction({
        provider: selectedModel.provider,
        model: selectedModel.id,
        message: message.trim(),
        reasoningLevel: showReasoning ? reasoningLevel : undefined,
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
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-lg border px-4 py-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        rows={4}
        placeholder="What's on your mind?"
        autoFocus
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
            handleSubmit(e);
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedModelId} onValueChange={handleModelChange}>
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
          <Select value={reasoningLevel} onValueChange={handleReasoningChange}>
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
