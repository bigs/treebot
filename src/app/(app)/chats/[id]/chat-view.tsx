"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ArrowUp, Copy, GitBranch, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReasoningOption } from "@/lib/models";

function normalizeMathDelimiters(markdown: string) {
  if (!markdown) return markdown;

  const applyReplacements = (value: string) =>
    value
      .replace(/\\\[((?:.|\n)*?)\\\]/g, (_match, inner) => `$$${inner}$$`)
      .replace(/\\\(((?:.|\n)*?)\\\)/g, (_match, inner) => `$${inner}$`);

  let result = "";
  let buffer = "";
  let i = 0;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    result += applyReplacements(buffer);
    buffer = "";
  };

  while (i < markdown.length) {
    const char = markdown[i];
    const atLineStart = i === 0 || markdown[i - 1] === "\n";

    if (atLineStart && (markdown.startsWith("```", i) || markdown.startsWith("~~~", i))) {
      flushBuffer();
      const fence = markdown.startsWith("```", i) ? "```" : "~~~";
      const fenceStart = i;
      i += fence.length;
      while (i < markdown.length && markdown[i] !== "\n") i += 1;
      if (i < markdown.length) i += 1;

      while (i < markdown.length) {
        if ((i === 0 || markdown[i - 1] === "\n") && markdown.startsWith(fence, i)) {
          i += fence.length;
          while (i < markdown.length && markdown[i] !== "\n") i += 1;
          if (i < markdown.length) i += 1;
          break;
        }
        i += 1;
      }

      result += markdown.slice(fenceStart, i);
      continue;
    }

    if (char === "`") {
      flushBuffer();
      let backtickCount = 1;
      while (i + backtickCount < markdown.length && markdown[i + backtickCount] === "`") {
        backtickCount += 1;
      }
      const start = i;
      i += backtickCount;
      while (i < markdown.length) {
        if (markdown.startsWith("`".repeat(backtickCount), i)) {
          i += backtickCount;
          break;
        }
        i += 1;
      }
      result += markdown.slice(start, i);
      continue;
    }

    buffer += char;
    i += 1;
  }

  flushBuffer();
  return result;
}

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
          <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoTriggeredRef = useRef(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const initialScrollRef = useRef(true);
  const [forkingIndex, setForkingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

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

  const isActive = chat.status === "streaming" || chat.status === "submitted";

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

  // Auto-scroll on new messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const behavior = initialScrollRef.current ? "auto" : "smooth";
    container.scrollTo({ top: container.scrollHeight, behavior });
    initialScrollRef.current = false;
  }, [chat.messages]);

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isActive) return;
    void chat.sendMessage({ text: trimmed });
    setInput("");
  }

  async function handleFork(index: number) {
    if (forkingIndex !== null) return;
    setForkingIndex(index);
    try {
      const res = await fetch(`/chats/${chatId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      if (!res.ok) {
        console.error("Failed to fork chat", await res.text());
        return;
      }
      const data = (await res.json()) as { chatId: string };
      router.push(`/chats/${data.chatId}`);
      router.refresh();
    } finally {
      setForkingIndex(null);
    }
  }

  async function handleCopy(text: string, index: number) {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedIndex(index);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setCopiedIndex(null);
        toastTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  }

  return (
    <>
      <main
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="space-y-6">
            {chat.messages.map((message, index) => (
              <MessageBubble
                key={message.id || `${message.role}-${String(index)}`}
                message={message}
                index={index}
                isForking={forkingIndex === index}
                isCopied={copiedIndex === index}
                onFork={handleFork}
                onCopy={handleCopy}
              />
            ))}
            {chat.error && (
              <div className="text-destructive text-sm">
                Error: {chat.error.message}
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="border-t px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex-1 resize-none overflow-y-auto rounded-lg border px-4 py-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            rows={1}
            style={{ fieldSizing: "content", maxHeight: "140px" }}
            placeholder="Send a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          {isActive ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0 rounded-full"
              onClick={() => void chat.stop()}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="shrink-0 rounded-full"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>

    </>
  );
}

function MessageBubble({
  message,
  index,
  isForking,
  isCopied,
  onFork,
  onCopy,
}: {
  message: UIMessage;
  index: number;
  isForking: boolean;
  isCopied: boolean;
  onFork: (index: number) => void;
  onCopy: (text: string, index: number) => void;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const textContent = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  const reasoningParts = message.parts.filter(
    (p): p is { type: "reasoning"; text: string } => p.type === "reasoning"
  );

  const isStreaming = message.parts.some(
    (part): part is { state?: "streaming" | "done" } =>
      "state" in part && part.state === "streaming"
  );

  const reasoningContent = reasoningParts
    .map((p) => p.text)
    .join("\n\n");

  const normalizedReasoningContent = normalizeMathDelimiters(reasoningContent);

  const reasoningLines = reasoningContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const isBoldOnly = (line: string) => /^\*\*[^*]+\*\*$/.test(line);

  const reasoningBlocks: Array<{ title?: string; body: string[] }> = [];
  for (const line of reasoningLines) {
    if (isBoldOnly(line)) {
      reasoningBlocks.push({ title: line, body: [] });
      continue;
    }
    const current = reasoningBlocks.at(-1);
    if (!current) {
      reasoningBlocks.push({ body: [line] });
      continue;
    }
    current.body.push(line);
  }

  const previewBlock = isStreaming
    ? reasoningBlocks.at(-1)
    : reasoningBlocks.at(0);

  const previewLine = (() => {
    if (!previewBlock) return undefined;
    const bodyLine = previewBlock.body[0];
    if (previewBlock.title && bodyLine) {
      return `${previewBlock.title}: ${bodyLine}`;
    }
    return previewBlock.title ?? bodyLine;
  })();

  const normalizedPreviewLine = previewLine
    ? normalizeMathDelimiters(previewLine)
    : undefined;

  const normalizedTextContent = normalizeMathDelimiters(textContent);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2.5 text-sm">
          {textContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        {reasoningContent.trim().length > 0 && (
          <details className="group rounded-lg border bg-muted/30">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span
                  className="arrow text-muted-foreground/70 flex h-5 w-5 items-center justify-center text-[28px] leading-none transition-transform duration-150"
                  aria-hidden
                  style={{ marginTop: -2 }}
                >
                  ▸
                </span>
                <span className="truncate">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => <span>{children}</span>,
                    }}
                  >
                    {normalizedPreviewLine ?? "Thinking…"}
                  </ReactMarkdown>
                </span>
              </div>
            </summary>
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {normalizedReasoningContent}
              </ReactMarkdown>
            </div>
          </details>
        )}
        {normalizedTextContent.trim().length > 0 && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {normalizedTextContent}
            </ReactMarkdown>
          </div>
        )}
        {isAssistant && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground disabled:cursor-not-allowed"
              onClick={() => onFork(index)}
              disabled={isForking}
            >
              <GitBranch className="size-3.5" />
              Fork
            </button>
            <span className="relative inline-flex">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
                onClick={() => onCopy(textContent, index)}
              >
                <Copy className="size-3.5" />
                Copy
              </button>
              {isCopied && (
                <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 rounded border bg-background px-2 py-1 text-[10px] text-foreground shadow">
                  Copied
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
