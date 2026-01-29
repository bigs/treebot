"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AssistantRuntimeProvider,
  type ExternalStoreAdapter,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReasoningOption } from "@/lib/models";

interface ChatViewProps {
  chatId: string;
  modelName: string;
  reasoningLevels: ReasoningOption[];
  initialReasoningLevel: string;
  initialMessages: UIMessage[];
  initialTitle?: string;
  initialParentId?: string | null;
  initialCreatedAt?: string;
  initialUpdatedAt?: string;
}

const isChatRunning = (status: string) =>
  status === "streaming" || status === "submitted";

const toThreadMessageLike = (
  message: UIMessage,
  idx: number,
): ThreadMessageLike => {
  const resolvedId = message.id?.trim() ? message.id : `message-${idx}`;
  // Build content array - using explicit type to avoid readonly issues
  const contentArr: Array<
    | { type: "text"; text: string }
    | { type: "reasoning"; text: string }
    | { type: "source"; sourceType: "url"; id: string; url: string; title?: string }
    | { type: "tool-call"; toolCallId: string; toolName: string; args: Record<string, unknown>; argsText: string; result: unknown; isError: boolean }
    | { type: "data"; name: string; data: unknown }
  > = [];
  for (const part of message.parts) {
    if (part.type === "text") {
      contentArr.push({ type: "text", text: part.text });
    } else if (part.type === "reasoning") {
      contentArr.push({ type: "reasoning", text: part.text });
    } else if (part.type === "source-url") {
      contentArr.push({
        type: "source",
        sourceType: "url",
        id: part.sourceId,
        url: part.url,
        title: part.title,
      });
    } else if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
      const toolPart = part as {
        type: string;
        toolName?: string;
        toolCallId?: string;
        input?: unknown;
        output?: unknown;
        errorText?: string;
        state?: string;
      };
      const toolName =
        toolPart.type === "dynamic-tool"
          ? toolPart.toolName ?? "tool"
          : toolPart.type.slice("tool-".length);
      const toolCallId = toolPart.toolCallId ?? `${toolName}-${resolvedId}`;
      const input = toolPart.input;
      const args =
        input && typeof input === "object"
          ? (input as Record<string, unknown>)
          : {};
      const argsText =
        typeof input === "string" ? input : JSON.stringify(input ?? {});
      const state = toolPart.state;
      const result = toolPart.output;
      const errorText = toolPart.errorText;

      contentArr.push({
        type: "tool-call",
        toolCallId,
        toolName,
        args,
        argsText,
        result: result ?? errorText,
        isError: state === "output-error" || state === "output-denied",
      });
    } else if (part.type.startsWith("data-")) {
      const dataPart = part as { type: string; data: unknown };
      contentArr.push({
        type: "data",
        name: part.type.slice("data-".length),
        data: dataPart.data,
      });
    }
  }

  return {
    role: message.role,
    id: resolvedId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: contentArr as any,
  };
};

export function ChatView({
  chatId,
  modelName,
  reasoningLevels,
  initialReasoningLevel,
  initialMessages,
  initialTitle,
  initialParentId,
  initialCreatedAt,
  initialUpdatedAt,
}: ChatViewProps) {
  const router = useRouter();
  const [reasoningLevel, setReasoningLevel] = useState(initialReasoningLevel);
  const [title, setTitle] = useState(initialTitle);
  const [mounted, setMounted] = useState(false);
  const initialTitleRef = useRef<string | null>(initialTitle ?? null);
  const pollTimeoutRef = useRef<number | null>(null);
  const pollAttemptsRef = useRef(0);
  const pollActiveRef = useRef(false);
  const pollEligibleRef = useRef(
    Boolean(
      initialParentId &&
        initialCreatedAt &&
        initialUpdatedAt &&
        initialCreatedAt === initialUpdatedAt,
    ),
  );

  // Sync title from server after router.refresh()
  useEffect(() => {
    const nextTitle = initialTitle ?? null;
    if (initialTitleRef.current !== nextTitle) {
      initialTitleRef.current = nextTitle;
      pollEligibleRef.current = false;
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      pollActiveRef.current = false;
    }
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      pollActiveRef.current = false;
    };
  }, []);

  function startTitlePolling() {
    if (!pollEligibleRef.current || pollActiveRef.current) return;
    pollActiveRef.current = true;
    pollAttemptsRef.current = 0;

    const maxAttempts = 8;
    const intervalMs = 1500;

    const poll = async () => {
      if (!pollActiveRef.current) return;
      pollAttemptsRef.current += 1;

      try {
        const res = await fetch(`/chats/${chatId}/title`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { title: string | null };
          if (data.title && data.title !== initialTitleRef.current) {
            pollActiveRef.current = false;
            pollEligibleRef.current = false;
            if (pollTimeoutRef.current) {
              window.clearTimeout(pollTimeoutRef.current);
              pollTimeoutRef.current = null;
            }
            router.refresh();
            return;
          }
        }
      } catch {
        // ignore transient polling errors
      }

      if (pollAttemptsRef.current >= maxAttempts) {
        pollActiveRef.current = false;
        return;
      }

      pollTimeoutRef.current = window.setTimeout(poll, intervalMs);
    };

    pollTimeoutRef.current = window.setTimeout(poll, intervalMs);
  }

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">{title ?? modelName}</h1>
          <span className="bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
            {modelName}
          </span>
          {mounted && reasoningLevels.length > 0 && (
            <Select value={reasoningLevel} onValueChange={setReasoningLevel}>
              <SelectTrigger className="w-[160px]" size="sm">
                <SelectValue placeholder="Reasoning" />
              </SelectTrigger>
              <SelectContent>
                {reasoningLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label} reasoning
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <ChatBody
        chatId={chatId}
        initialMessages={initialMessages}
        onAssistantFinish={startTitlePolling}
      />
    </div>
  );
}

/**
 * Separated from ChatView so that useChat's internal useSyncExternalStore
 * hooks don't shift Radix Select's useId()-generated aria attributes,
 * which caused a hydration mismatch.
 */
function ChatBody({
  chatId,
  initialMessages,
  onAssistantFinish,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  onAssistantFinish?: () => void;
}) {
  const router = useRouter();
  const autoTriggeredRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [transport] = useState(
    () => new DefaultChatTransport({ api: `/chats/${chatId}/stream` }),
  );

  const chat = useChat({
    id: chatId,
    transport,
    messages: initialMessages,
    onFinish: () => {
      router.refresh();
      onAssistantFinish?.();
    },
  });

  const adapter = useMemo<ExternalStoreAdapter<UIMessage>>(
    () => ({
      messages: chat.messages,
      isRunning: isChatRunning(chat.status),
      onNew: async (message) => {
        const text = message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n\n");
        if (!text.trim()) return;
        await chat.sendMessage({ text });
      },
      onCancel: async () => {
        chat.stop();
      },
      onReload: async () => {
        chat.regenerate();
      },
      convertMessage: (message, idx) => toThreadMessageLike(message, idx),
    }),
    [chat.messages, chat.status, chat.sendMessage, chat.stop, chat.regenerate],
  );

  const runtime = useExternalStoreRuntime(adapter);

  const handleFork = useCallback(
    async (messageIndex: number) => {
      try {
        const res = await fetch(`/chats/${chatId}/fork`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: messageIndex }),
        });
        if (!res.ok) {
          console.error("Failed to fork chat", await res.text());
          return;
        }
        const data = (await res.json()) as { chatId: string };
        router.push(`/chats/${data.chatId}`);
        router.refresh();
      } catch (err) {
        console.error("Failed to fork chat", err);
      }
    },
    [chatId, router],
  );

  // Auto-trigger for new chats: if all messages are user-only, send to get assistant response
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    const hasAssistant = initialMessages.some((m) => m.role === "assistant");
    if (!hasAssistant && initialMessages.length > 0) {
      autoTriggeredRef.current = true;
      void chat.sendMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  return (
    <div className="min-h-0 flex-1">
      {mounted ? (
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread onFork={handleFork} />
        </AssistantRuntimeProvider>
      ) : null}
      {chat.error ? (
        <div className="px-4 pb-4 text-sm text-destructive">
          Error: {chat.error.message}
        </div>
      ) : null}
    </div>
  );
}
