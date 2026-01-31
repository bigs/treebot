"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import {
  AssistantRuntimeProvider,
  type AssistantRuntime,
  type ExternalStoreAdapter,
  type PendingAttachment,
  type ThreadMessageLike,
  type ThreadUserMessagePart,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { Composer } from "@/components/assistant-ui/thread";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createChatAction,
  createDraftChatAction,
  deleteChatAction,
  finalizeChatWithAttachmentsAction,
} from "@/lib/actions/chat-actions";
import { getAttachmentPolicy } from "@/lib/attachments/policy";
import type { UploadResponse } from "@/lib/attachments/types";
import {
  attachmentToFilePart,
  toThreadMessageLike,
  type FilePart,
} from "@/lib/assistant-ui/conversion";
import {
  buildCompleteAttachment,
  createPendingAttachment,
} from "@/lib/attachments/adapter";
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
  const [messages] = useState<UIMessage[]>([]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const cancelControllerRef = useRef<AbortController | null>(null);
  const draftChatIdRef = useRef<string | null>(null);
  const draftPromiseRef = useRef<Promise<string> | null>(null);
  const draftConfigRef = useRef<{ modelId: string; reasoning?: string } | null>(
    null
  );
  const draftEpochRef = useRef(0);
  const runtimeRef = useRef<AssistantRuntime | null>(null);

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (showReasoning && selection.reasoningLevel === "") {
      // selectedModel is guaranteed non-null when showReasoning is true
      const fallback = selectedModel.defaultReasoningLevel;
      setSelection((prev) => ({
        ...prev,
        reasoningLevel: fallback,
      }));
      localStorage.setItem(LS_REASONING_KEY, fallback);
    }
  }, [showReasoning, selection.reasoningLevel, selectedModel]);

  const cleanupDraft = useCallback(async () => {
    const cleanupEpoch = draftEpochRef.current + 1;
    draftEpochRef.current = cleanupEpoch;
    const existingChatId = draftChatIdRef.current;
    const pendingDraft = draftPromiseRef.current;
    draftChatIdRef.current = null;
    draftPromiseRef.current = null;
    draftConfigRef.current = null;

    if (existingChatId) {
      await deleteChatAction(existingChatId);
      return;
    }

    if (pendingDraft) {
      try {
        const resolvedId = await pendingDraft;
        if (draftEpochRef.current === cleanupEpoch) {
          await deleteChatAction(resolvedId);
        }
      } catch {
        // ignore cleanup failures
      }
    }
  }, []);

  const clearComposerAttachments = useCallback(() => {
    void runtimeRef.current?.thread.composer.clearAttachments();
  }, []);

  const handleModelChange = useCallback(
    (modelId: string) => {
      const newModel = models.find((m) => m.id === modelId);
      if (!newModel) return;

      const storedPreference =
        localStorage.getItem(LS_REASONING_KEY) ?? DEFAULT_REASONING;
      const nextReasoning = validReasoningForModel(newModel, storedPreference);

      void cleanupDraft();
      clearComposerAttachments();
      setError("");
      setSelection({ modelId, reasoningLevel: nextReasoning });
      localStorage.setItem(LS_MODEL_KEY, modelId);
      if (nextReasoning) {
        localStorage.setItem(LS_REASONING_KEY, nextReasoning);
      }
    },
    [cleanupDraft, clearComposerAttachments, models]
  );

  const handleReasoningChange = useCallback(
    (value: string) => {
      void cleanupDraft();
      clearComposerAttachments();
      setError("");
      setSelection((prev) => ({ ...prev, reasoningLevel: value }));
      localStorage.setItem(LS_REASONING_KEY, value);
    },
    [cleanupDraft, clearComposerAttachments]
  );

  const grouped = useMemo(() => {
    const byProvider = new Map<string, ModelInfo[]>();
    for (const model of models) {
      const group = byProvider.get(model.providerName) ?? [];
      group.push(model);
      byProvider.set(model.providerName, group);
    }
    return byProvider;
  }, [models]);

  const ensureDraftChatId = useCallback(async () => {
    if (draftChatIdRef.current) return draftChatIdRef.current;
    if (draftPromiseRef.current) return draftPromiseRef.current;
    if (!selectedModel) {
      throw new Error("Model is required.");
    }

    const reasoning = showReasoning ? selection.reasoningLevel : undefined;
    if (
      draftConfigRef.current &&
      (draftConfigRef.current.modelId !== selectedModel.id ||
        draftConfigRef.current.reasoning !== reasoning)
    ) {
      await cleanupDraft();
    }

    const epoch = draftEpochRef.current;
    const promise = (async () => {
      const result = await createDraftChatAction({
        provider: selectedModel.provider,
        model: selectedModel.id,
        reasoningLevel: reasoning,
      });
      if ("error" in result) {
        throw new Error(result.error);
      }
      if (draftEpochRef.current !== epoch) {
        const deletion = await deleteChatAction(result.chatId);
        if ("error" in deletion) {
          // Best-effort cleanup; ignore if it fails.
        }
        throw new Error("Draft was invalidated.");
      }
      draftChatIdRef.current = result.chatId;
      draftConfigRef.current = { modelId: selectedModel.id, reasoning };
      return result.chatId;
    })();

    draftPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      if (draftPromiseRef.current === promise) {
        draftPromiseRef.current = null;
      }
    }
  }, [cleanupDraft, selectedModel, selection.reasoningLevel, showReasoning]);

  const attachmentAdapter = useMemo(() => {
    if (!selectedModel) {
      return {
        accept: "",
        add: () => {
          throw new Error("Model is required.");
        },
        send: () => Promise.reject(new Error("Model is required.")),
        remove: () => Promise.resolve(),
      };
    }

    const policy = getAttachmentPolicy(selectedModel.provider);
    return {
      accept: policy.accept,
      add: ({ file }: { file: File }) => {
        try {
          return Promise.resolve(
            createPendingAttachment(selectedModel.provider, file)
          );
        } catch (err) {
          return Promise.reject(
            err instanceof Error ? err : new Error("Unsupported file")
          );
        }
      },
      send: async (attachment: PendingAttachment) => {
        const chatId = await ensureDraftChatId();
        const formData = new FormData();
        formData.append("file", attachment.file);
        const res = await fetch(`/chats/${chatId}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = (await res.json()) as UploadResponse;
        return buildCompleteAttachment(attachment, data);
      },
      remove: () => Promise.resolve(),
    };
  }, [ensureDraftChatId, selectedModel]);

  const handleNew = useCallback(
    async (message: ThreadMessageLike) => {
      if (sendingRef.current) return;
      const content: readonly ThreadUserMessagePart[] =
        typeof message.content === "string"
          ? [{ type: "text", text: message.content }]
          : (message.content as readonly ThreadUserMessagePart[]);
      const text = content
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text" && typeof part.text === "string"
        )
        .map((part) => part.text)
        .join("\n\n");
      const fileParts = (message.attachments ?? [])
        .map((attachment) => attachmentToFilePart(attachment))
        .filter((part): part is FilePart => Boolean(part));
      const attachments = fileParts.map((part) => ({
        url: part.url,
        mediaType: part.mediaType,
        filename: part.filename,
      }));
      const trimmed = text.trim();

      if (!trimmed && attachments.length === 0) return;
      if (!selectedModel) {
        setError("Model is required.");
        return;
      }

      sendingRef.current = true;
      const controller = new AbortController();
      cancelControllerRef.current = controller;
      setIsSending(true);
      setError("");

      try {
        if (attachments.length > 0) {
          const chatId = await ensureDraftChatId();
          const result = (await finalizeChatWithAttachmentsAction({
            chatId,
            message: trimmed,
            attachments,
          })) as { success: true } | { error: string };
          if ("error" in result) {
            throw new Error(result.error);
          }
          draftChatIdRef.current = null;
          draftPromiseRef.current = null;
          draftConfigRef.current = null;
          if (!controller.signal.aborted) {
            router.push(`/chats/${chatId}`);
          }
        } else {
          const result = (await createChatAction({
            provider: selectedModel.provider,
            model: selectedModel.id,
            message: trimmed,
            reasoningLevel: showReasoning
              ? selection.reasoningLevel
              : undefined,
          })) as { chatId: string } | { error: string };
          if ("error" in result) {
            throw new Error(result.error);
          }
          if (!controller.signal.aborted) {
            router.push(`/chats/${result.chatId}`);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to start chat");
        }
      } finally {
        if (!controller.signal.aborted) {
          sendingRef.current = false;
          setIsSending(false);
        }
      }
    },
    [
      ensureDraftChatId,
      router,
      selectedModel,
      selection.reasoningLevel,
      showReasoning,
    ]
  );

  const adapter = useMemo<ExternalStoreAdapter<UIMessage>>(
    () => ({
      messages,
      isRunning: isSending,
      onNew: handleNew,
      onCancel: async () => {
        cancelControllerRef.current?.abort();
        sendingRef.current = false;
        setIsSending(false);
        clearComposerAttachments();
        await cleanupDraft();
      },
      onReload: async () => {},
      convertMessage: (message, idx) => toThreadMessageLike(message, idx),
      adapters: {
        attachments: attachmentAdapter,
      },
    }),
    [
      attachmentAdapter,
      clearComposerAttachments,
      cleanupDraft,
      handleNew,
      isSending,
      messages,
    ]
  );

  const runtime = useExternalStoreRuntime(adapter);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  useEffect(() => {
    return () => {
      if (draftChatIdRef.current || draftPromiseRef.current) {
        void cleanupDraft();
      }
    };
  }, [cleanupDraft]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b py-2 pr-4 pl-[calc(env(safe-area-inset-left)+3.5rem)] md:px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">New chat</h1>
          <Select
            value={selection.modelId}
            onValueChange={handleModelChange}
            disabled={isSending}
          >
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
              disabled={isSending}
            >
              <SelectTrigger className="w-[160px]" size="sm">
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
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {mounted ? (
          <AssistantRuntimeProvider runtime={runtime}>
            <div className="flex h-full items-center justify-center px-4">
              <div className="w-full max-w-[44rem]">
                <Composer />
                {error ? (
                  <div className="text-destructive px-2 pt-3 text-sm">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </AssistantRuntimeProvider>
        ) : null}
      </div>
    </div>
  );
}
