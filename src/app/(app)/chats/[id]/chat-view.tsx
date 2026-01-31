"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AssistantRuntimeProvider,
  type PendingAttachment,
  type ExternalStoreAdapter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { MarkdownPreview } from "@/components/assistant-ui/markdown-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReasoningOption } from "@/lib/models";
import type { Platform } from "@/db/schema";
import { getAttachmentPolicy } from "@/lib/attachments/policy";
import {
  attachmentToFilePart,
  toThreadMessageLike,
  type FilePart,
} from "@/lib/assistant-ui/conversion";
import {
  buildCompleteAttachment,
  createPendingAttachment,
} from "@/lib/attachments/adapter";
import type { UploadResponse } from "@/lib/attachments/types";
import { generateClientId } from "@/lib/client-id";
import { Loader2, MoreHorizontal } from "lucide-react";

interface ChatViewProps {
  chatId: string;
  platform: Platform;
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

const HANDOFF_PROMPT_QUESTION =
  "Where do you want to lead the new conversation?";

function extractTextFromParts(parts: UIMessage["parts"]) {
  return parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("\n\n");
}

function buildHandoffPrompt(userPrompt: string) {
  const trimmed = userPrompt.trim();
  return `You are preparing a handoff summary from an ongoing conversation.

Your task: compact and summarize the conversation so far, emphasizing details that are most relevant to the new direction the user wants to explore. Your response will be used as the first user message in a brand new conversation, so it must preserve the user's intent and include the context needed to continue.

Output format requirements:
- Start with a short "Context" section in bullet points.
- Explicitly frame this as a continuation of an ongoing conversation.
- Focus on salient details needed to continue in the new direction.
- After the bullets, include a blank line, then reproduce the user's prompt verbatim as a natural paragraph (no label).

The user's prompt for the handoff (include it verbatim at the end of your response) is:
${trimmed}`;
}

export function ChatView({
  chatId,
  platform,
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
      initialCreatedAt === initialUpdatedAt
    )
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync prop to state
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount detection pattern
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

      pollTimeoutRef.current = window.setTimeout(() => void poll(), intervalMs);
    };

    pollTimeoutRef.current = window.setTimeout(() => void poll(), intervalMs);
  }

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyWidth = document.body.style.width;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = "0";
    document.body.style.left = "0";
    document.documentElement.style.overflow = "hidden";

    const layoutHeightRef = { current: window.innerHeight };
    const updateLayoutHeight = () => {
      const next = window.innerHeight;
      if (next > layoutHeightRef.current) {
        layoutHeightRef.current = next;
      }
    };
    const setKeyboardOffset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        document.documentElement.style.setProperty("--keyboard-offset", "0px");
        document.documentElement.style.setProperty(
          "--chat-viewport-height",
          `${layoutHeightRef.current}px`
        );
        return;
      }
      const offset = Math.max(
        0,
        layoutHeightRef.current - viewport.height - viewport.offsetTop
      );
      document.documentElement.style.setProperty(
        "--keyboard-offset",
        `${offset}px`
      );
      document.documentElement.style.setProperty(
        "--chat-viewport-height",
        `${layoutHeightRef.current - offset}px`
      );
    };
    const handleResize = () => {
      updateLayoutHeight();
      setKeyboardOffset();
    };

    updateLayoutHeight();
    setKeyboardOffset();
    window.visualViewport?.addEventListener("resize", setKeyboardOffset);
    window.visualViewport?.addEventListener("scroll", setKeyboardOffset);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", setKeyboardOffset);
      window.visualViewport?.removeEventListener("scroll", setKeyboardOffset);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.documentElement.style.removeProperty("--keyboard-offset");
      document.documentElement.style.removeProperty("--chat-viewport-height");
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.width = previousBodyWidth;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div
      className="flex h-screen h-[100dvh] flex-col overflow-hidden"
      style={{ height: "var(--chat-viewport-height, 100dvh)" }}
    >
      <header className="border-b pb-2 pr-4 pl-[calc(env(safe-area-inset-left)+3.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] md:py-2 md:px-4">
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium md:flex-none md:max-w-[50%]">
            {title ?? modelName}
          </h1>
          <span className="bg-muted text-muted-foreground hidden shrink-0 rounded-full border px-2 py-0.5 text-xs md:inline-flex">
            {modelName}
          </span>
          {mounted && reasoningLevels.length > 0 && (
            <Select
              value={reasoningLevel}
              onValueChange={setReasoningLevel}
            >
              <SelectTrigger className="hidden w-[160px] md:inline-flex" size="sm">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hover:bg-muted text-foreground inline-flex size-8 items-center justify-center rounded-md md:hidden"
                aria-label="Chat options"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Model</DropdownMenuLabel>
              <div className="text-muted-foreground px-2 pb-2 text-sm">
                {modelName}
              </div>
              {mounted && reasoningLevels.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Reasoning</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={reasoningLevel}
                    onValueChange={setReasoningLevel}
                  >
                    {reasoningLevels.map((level) => (
                      <DropdownMenuRadioItem
                        key={level.value}
                        value={level.value}
                      >
                        {level.label} reasoning
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ChatBody
        chatId={chatId}
        platform={platform}
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
  platform,
  initialMessages,
  onAssistantFinish,
}: {
  chatId: string;
  platform: Platform;
  initialMessages: UIMessage[];
  onAssistantFinish?: () => void;
}) {
  const router = useRouter();
  const autoTriggeredRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [handoffPromptOpen, setHandoffPromptOpen] = useState(false);
  const [handoffPreviewOpen, setHandoffPreviewOpen] = useState(false);
  const [handoffPrompt, setHandoffPrompt] = useState("");
  const [handoffFeedback, setHandoffFeedback] = useState("");
  const [handoffMessages, setHandoffMessages] = useState<UIMessage[] | null>(
    null
  );
  const [handoffPreviewMessage, setHandoffPreviewMessage] =
    useState<UIMessage | null>(null);
  const [handoffIndex, setHandoffIndex] = useState<number | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffAccepting, setHandoffAccepting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [transport] = useState(
    () => new DefaultChatTransport({ api: `/chats/${chatId}/stream` })
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

  const attachmentAdapter = useMemo(() => {
    const policy = getAttachmentPolicy(platform);
    return {
      accept: policy.accept,
      add: ({ file }: { file: File }) => {
        try {
          return Promise.resolve(createPendingAttachment(platform, file));
        } catch (err) {
          return Promise.reject(
            err instanceof Error ? err : new Error("Unsupported file")
          );
        }
      },
      send: async (attachment: PendingAttachment) => {
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
  }, [chatId, platform]);

  const adapter = useMemo<ExternalStoreAdapter<UIMessage>>(
    () => ({
      messages: chat.messages,
      isRunning: isChatRunning(chat.status),
      onNew: async (message) => {
        const text = message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n\n");
        const fileParts = (message.attachments ?? [])
          .map((attachment) => attachmentToFilePart(attachment))
          .filter((part): part is FilePart => Boolean(part));
        const parts: UIMessage["parts"] = [
          ...fileParts,
          ...(text.trim() ? [{ type: "text" as const, text }] : []),
        ];
        if (parts.length === 0) return;
        await chat.sendMessage({ parts });
      },
      onCancel: async () => {
        await chat.stop();
      },
      onReload: async () => {
        await chat.regenerate();
      },
      convertMessage: (message, idx) => toThreadMessageLike(message, idx),
      adapters: {
        attachments: attachmentAdapter,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specific chat properties are more stable than `chat` object
    [
      chat.messages,
      chat.status,
      chat.sendMessage,
      chat.stop,
      chat.regenerate,
      attachmentAdapter,
    ]
  );

  const runtime = useExternalStoreRuntime(adapter);

  const resetHandoffState = useCallback(() => {
    setHandoffPrompt("");
    setHandoffFeedback("");
    setHandoffMessages(null);
    setHandoffPreviewMessage(null);
    setHandoffIndex(null);
    setHandoffError(null);
    setHandoffLoading(false);
    setHandoffAccepting(false);
  }, []);

  const requestHandoffPreview = useCallback(
    async (messages: UIMessage[], index: number) => {
      const res = await fetch(`/chats/${chatId}/handoff/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, messages }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as { message: UIMessage };
      return data.message;
    },
    [chatId]
  );

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
    [chatId, router]
  );

  const handleHandoffStart = useCallback((messageIndex: number) => {
    setHandoffIndex(messageIndex);
    setHandoffPrompt("");
    setHandoffFeedback("");
    setHandoffMessages(null);
    setHandoffPreviewMessage(null);
    setHandoffError(null);
    setHandoffAccepting(false);
    setHandoffPromptOpen(true);
  }, []);

  const handleHandoffSubmit = useCallback(async () => {
    const trimmed = handoffPrompt.trim();
    if (!trimmed || handoffIndex === null) return;

    setHandoffLoading(true);
    setHandoffError(null);

    try {
      const history = chat.messages.slice(0, handoffIndex + 1);
      const syntheticMessage: UIMessage = {
        id: generateClientId(),
        role: "user",
        parts: [{ type: "text", text: buildHandoffPrompt(trimmed) }],
      };
      const requestMessages = [...history, syntheticMessage];
      const assistantMessage = await requestHandoffPreview(
        requestMessages,
        handoffIndex
      );
      const nextMessages = [...requestMessages, assistantMessage];

      setHandoffMessages(nextMessages);
      setHandoffPreviewMessage(assistantMessage);
      setHandoffPromptOpen(false);
      setHandoffPreviewOpen(true);
    } catch (err) {
      setHandoffError(
        err instanceof Error
          ? err.message
          : "Failed to generate handoff summary"
      );
    } finally {
      setHandoffLoading(false);
    }
  }, [chat.messages, handoffIndex, handoffPrompt, requestHandoffPreview]);

  const handleHandoffRevision = useCallback(async () => {
    const trimmed = handoffFeedback.trim();
    if (!trimmed || !handoffMessages || handoffIndex === null) return;

    setHandoffLoading(true);
    setHandoffError(null);

    try {
      const feedbackMessage: UIMessage = {
        id: generateClientId(),
        role: "user",
        parts: [{ type: "text", text: trimmed }],
      };
      const requestMessages = [...handoffMessages, feedbackMessage];
      const assistantMessage = await requestHandoffPreview(
        requestMessages,
        handoffIndex
      );
      const nextMessages = [...requestMessages, assistantMessage];

      setHandoffMessages(nextMessages);
      setHandoffPreviewMessage(assistantMessage);
      setHandoffFeedback("");
    } catch (err) {
      setHandoffError(
        err instanceof Error ? err.message : "Failed to revise handoff summary"
      );
    } finally {
      setHandoffLoading(false);
    }
  }, [handoffFeedback, handoffIndex, handoffMessages, requestHandoffPreview]);

  const handleHandoffAccept = useCallback(async () => {
    if (!handoffPreviewMessage || handoffIndex === null) return;
    const previewText = extractTextFromParts(handoffPreviewMessage.parts);
    if (!previewText.trim()) {
      setHandoffError("Summary is empty.");
      return;
    }

    setHandoffAccepting(true);
    setHandoffError(null);

    try {
      const res = await fetch(`/chats/${chatId}/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: handoffIndex, text: previewText }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as { chatId: string };
      setHandoffPreviewOpen(false);
      resetHandoffState();
      router.push(`/chats/${data.chatId}`);
      router.refresh();
    } catch (err) {
      setHandoffError(
        err instanceof Error ? err.message : "Failed to create handoff chat"
      );
    } finally {
      setHandoffAccepting(false);
    }
  }, [chatId, handoffIndex, handoffPreviewMessage, resetHandoffState, router]);

  const previewText = handoffPreviewMessage
    ? extractTextFromParts(handoffPreviewMessage.parts)
    : "";
  const canSubmitHandoff = handoffPrompt.trim() !== "";
  const canReviseHandoff = handoffFeedback.trim() !== "";

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
          <Thread
            onFork={(idx) => void handleFork(idx)}
            onHandoff={(idx) => handleHandoffStart(idx)}
            compactMobileComposer
          />
        </AssistantRuntimeProvider>
      ) : null}
      {chat.error ? (
        <div className="text-destructive px-4 pb-4 text-sm">
          Error: {chat.error.message}
        </div>
      ) : null}
      <Dialog
        open={handoffPromptOpen}
        onOpenChange={(open) => {
          if (!open && handoffLoading) {
            return;
          }
          if (!open) {
            resetHandoffState();
          }
          setHandoffPromptOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start a handoff</DialogTitle>
            <DialogDescription>{HANDOFF_PROMPT_QUESTION}</DialogDescription>
          </DialogHeader>
          <textarea
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none overflow-y-auto rounded-lg border px-4 py-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            rows={1}
            style={{ fieldSizing: "content", maxHeight: "160px" }}
            placeholder="Share the new direction..."
            value={handoffPrompt}
            onChange={(e) => setHandoffPrompt(e.target.value)}
          />
          {handoffError ? (
            <p className="text-destructive text-sm">{handoffError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (handoffLoading) return;
                setHandoffPromptOpen(false);
                resetHandoffState();
              }}
              disabled={handoffLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleHandoffSubmit()}
              disabled={!canSubmitHandoff || handoffLoading}
            >
              {handoffLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Generate summary"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={handoffPreviewOpen}
        onOpenChange={(open) => {
          if (!open && (handoffLoading || handoffAccepting)) {
            return;
          }
          if (!open) {
            resetHandoffState();
          }
          setHandoffPreviewOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review handoff summary</DialogTitle>
            <DialogDescription>
              Accept the summary to start a new chat, or leave feedback to
              revise it.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 rounded-lg border p-4 text-sm">
            {previewText ? (
              <MarkdownPreview content={previewText} />
            ) : (
              <p className="text-muted-foreground">No summary generated yet.</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="handoff-feedback">
              Revise summary
            </label>
            <textarea
              id="handoff-feedback"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none overflow-y-auto rounded-lg border px-4 py-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              rows={1}
              style={{ fieldSizing: "content", maxHeight: "160px" }}
              placeholder="Add feedback or request changes..."
              value={handoffFeedback}
              onChange={(e) => setHandoffFeedback(e.target.value)}
              disabled={handoffLoading || handoffAccepting}
            />
          </div>
          {handoffError ? (
            <p className="text-destructive text-sm">{handoffError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (handoffLoading || handoffAccepting) return;
                setHandoffPreviewOpen(false);
                resetHandoffState();
              }}
              disabled={handoffLoading || handoffAccepting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleHandoffRevision()}
              disabled={!canReviseHandoff || handoffLoading || handoffAccepting}
            >
              {handoffLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Revise"
              )}
            </Button>
            <Button
              type="button"
              onClick={() => void handleHandoffAccept()}
              disabled={
                handoffLoading || handoffAccepting || !previewText.trim()
              }
            >
              {handoffAccepting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Accept"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
