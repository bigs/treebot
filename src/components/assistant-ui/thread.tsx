import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  GitForkIcon,
  HandIcon,
  MoreHorizontalIcon,
  SquareIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";

// Context for fork callback
const ForkContext = createContext<((messageIndex: number) => void) | null>(
  null
);
const HandoffContext = createContext<((messageIndex: number) => void) | null>(
  null
);

export interface ThreadProps {
  onFork?: (messageIndex: number) => void;
  onHandoff?: (messageIndex: number) => void;
}

export const Thread: FC<ThreadProps> = ({ onFork, onHandoff }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isRunning = useAuiState(({ thread }) => thread.isRunning);

  // Track scroll state
  const wasRunningRef = useRef(false);
  const scrollLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pendingScrollRef = useRef(false);

  const scrollToLastUserMessage = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const userMessages = viewport.querySelectorAll('[data-role="user"]');
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (lastUserMessage instanceof HTMLElement) {
      const messageTop = lastUserMessage.offsetTop;
      viewport.scrollTo({ top: messageTop, behavior: "auto" });
    }
  }, []);

  // Detect when isRunning transitions from false to true (user just sent a message)
  useEffect(() => {
    const wasRunning = wasRunningRef.current;
    wasRunningRef.current = isRunning;

    // Detect transition from not running to running
    if (isRunning && !wasRunning) {
      pendingScrollRef.current = true;

      // Clear any existing timeout
      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }

      // Scroll immediately and set up repeated scrolls to fight any library scrolling
      const doScroll = () => {
        if (pendingScrollRef.current) {
          scrollToLastUserMessage();
        }
      };

      // Scroll multiple times with RAF and timeouts to ensure it sticks
      doScroll();
      requestAnimationFrame(doScroll);
      requestAnimationFrame(() => requestAnimationFrame(doScroll));

      // Keep scrolling for a brief period to counter any library scroll behavior
      const intervals = [16, 32, 50, 100, 150, 200, 300];
      intervals.forEach((delay) => {
        setTimeout(doScroll, delay);
      });

      // Stop forcing scroll after 350ms to allow user to scroll freely
      scrollLockTimeoutRef.current = setTimeout(() => {
        pendingScrollRef.current = false;
      }, 350);
    }

    return () => {
      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }
    };
  }, [isRunning, scrollToLastUserMessage]);

  return (
    <ForkContext.Provider value={onFork ?? null}>
      <HandoffContext.Provider value={onHandoff ?? null}>
        <ThreadPrimitive.Root
          className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
          style={{
            ["--thread-max-width" as string]: "44rem",
          }}
        >
          <ThreadPrimitive.Viewport
            turnAnchor="top"
            autoScroll={false}
            scrollToBottomOnRunStart={false}
            scrollToBottomOnInitialize={false}
            scrollToBottomOnThreadSwitch={false}
            ref={viewportRef}
            className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll px-4 pt-4 [overflow-anchor:none]"
          >
            <AuiIf condition={({ thread }) => thread.isEmpty}>
              <ThreadWelcome />
            </AuiIf>

            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                EditComposer,
                AssistantMessage,
              }}
            />
            <AuiIf
              condition={({ thread }) => !thread.isEmpty && !thread.isRunning}
            >
              <div className="min-h-8 grow" />
            </AuiIf>
            <AuiIf condition={({ thread }) => thread.isRunning}>
              <div className="h-[80vh] shrink-0" />
            </AuiIf>

            <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible pb-4 md:pb-6">
              <ThreadScrollToBottom />
              <Composer />
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </HandoffContext.Provider>
    </ForkContext.Provider>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in text-2xl font-semibold duration-200">
            Hello there!
          </h1>
          <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in text-muted-foreground text-xl delay-75 duration-200">
            How can I help you today?
          </p>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full gap-2 pb-4 @md:grid-cols-2">
      <ThreadPrimitive.Suggestions
        components={{
          Suggestion: ThreadSuggestionItem,
        }}
      />
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200 nth-[n+3]:hidden @md:nth-[n+3]:block">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion hover:bg-muted h-auto w-full flex-wrap items-start justify-start gap-1 rounded-2xl border px-4 py-3 text-left text-sm transition-colors @md:flex-col"
        >
          <span className="aui-thread-welcome-suggestion-text-1 font-medium">
            <SuggestionPrimitive.Title />
          </span>
          <span className="aui-thread-welcome-suggestion-text-2 text-muted-foreground">
            <SuggestionPrimitive.Description />
          </span>
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

export const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone className="aui-composer-attachment-dropzone border-input bg-background has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:bg-accent/50 flex w-full flex-col rounded-2xl border px-1 pt-2 transition-shadow outline-none has-[textarea:focus-visible]:ring-2 data-[dragging=true]:border-dashed">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="aui-composer-input placeholder:text-muted-foreground mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none focus-visible:ring-0"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative mx-2 mb-2 flex items-center justify-between">
      <ComposerAddAttachment />
      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="aui-composer-send size-8 rounded-full"
            aria-label="Send message"
          >
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-8 rounded-full"
            aria-label="Stop generating"
          >
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 animate-in relative mx-auto w-full max-w-(--thread-max-width) py-3 duration-150"
      data-role="assistant"
    >
      <div className="aui-assistant-message-content text-foreground px-2 leading-relaxed wrap-break-word">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            Reasoning,
            ReasoningGroup,
            tools: { Fallback: ToolFallback },
          }}
        />
        <MessageError />
      </div>

      <div className="aui-assistant-message-footer mt-1 ml-2 flex">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

function getMessageText(content: readonly unknown[]): string {
  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part
    )
    .map((part) => part.text)
    .join("\n\n");
}

const CopyMessageButton: FC = () => {
  const [isCopied, setIsCopied] = useState(false);
  const content = useAuiState(({ message }) => message.content);

  const handleCopy = () => {
    const text = getMessageText(content);
    void copyToClipboard(text).then((success) => {
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    });
  };

  return (
    <TooltipIconButton tooltip="Copy" onClick={handleCopy}>
      {isCopied ? <CheckIcon /> : <CopyIcon />}
    </TooltipIconButton>
  );
};

const ForkButton: FC = () => {
  const onFork = useContext(ForkContext);
  const messageId = useAuiState(({ message }) => message.id);
  const messages = useAuiState(({ thread }) => thread.messages);

  const handleFork = () => {
    if (!onFork) return;
    const index = messages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      onFork(index);
    }
  };

  if (!onFork) return null;

  return (
    <TooltipIconButton tooltip="Fork" onClick={handleFork}>
      <GitForkIcon />
    </TooltipIconButton>
  );
};

const HandoffButton: FC = () => {
  const onHandoff = useContext(HandoffContext);
  const messageId = useAuiState(({ message }) => message.id);
  const messages = useAuiState(({ thread }) => thread.messages);

  const handleHandoff = () => {
    if (!onHandoff) return;
    const index = messages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      onHandoff(index);
    }
  };

  if (!onHandoff) return null;

  return (
    <TooltipIconButton tooltip="Handoff" onClick={handleHandoff}>
      <HandIcon />
    </TooltipIconButton>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="aui-assistant-action-bar-root text-muted-foreground -ml-1 flex gap-1"
    >
      <CopyMessageButton />
      <ForkButton />
      <HandoffButton />
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 animate-in mx-auto grid w-full max-w-(--thread-max-width) auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper col-start-2 min-w-0">
        <div className="aui-user-message-content bg-muted text-foreground rounded-2xl px-4 py-2.5 wrap-break-word">
          <MessagePrimitive.Parts />
        </div>
      </div>

      <div className="aui-user-message-footer col-start-2 mt-1 flex justify-start">
        <UserActionBar />
      </div>

      <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-4 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="aui-user-action-bar-root text-muted-foreground flex gap-1"
    >
      <CopyMessageButton />
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root bg-muted ml-auto flex w-full max-w-[85%] flex-col rounded-2xl">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent p-4 text-sm outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground mr-2 -ml-2 inline-flex items-center text-xs",
        className
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
