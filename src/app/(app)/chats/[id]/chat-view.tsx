"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export function ChatView({
  chatId,
  modelName,
  reasoningLevels,
  initialReasoningLevel,
  initialMessages,
  initialTitle,
}: ChatViewProps) {
  const [reasoningLevel, setReasoningLevel] = useState(initialReasoningLevel);
  const [title, setTitle] = useState(initialTitle);
  const [mounted, setMounted] = useState(false);

  // Sync title from server after router.refresh()
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">{title ?? modelName}</h1>
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

      <ChatBody chatId={chatId} initialMessages={initialMessages} />
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
}: {
  chatId: string;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoTriggeredRef = useRef(false);

  const [transport] = useState(
    () => new DefaultChatTransport({ api: `/chats/${chatId}/stream` })
  );

  const chat = useChat({
    id: chatId,
    transport,
    messages: initialMessages,
    onFinish: () => {
      router.refresh();
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isActive) return;
    void chat.sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="space-y-6">
            {chat.messages.map((message, index) => (
              <MessageBubble
                key={message.id || `${message.role}-${String(index)}`}
                message={message}
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

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const textContent = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

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
      <div className="max-w-[80%]">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {textContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
