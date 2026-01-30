# assistant-ui usage

Treebot renders the chat thread with `@assistant-ui/react` and custom wrappers that align assistant-ui primitives with AI SDK message data.

## Runtime wiring

`src/app/(app)/chats/[id]/chat-view.tsx` connects the AI SDK to assistant-ui:

- `useChat` (AI SDK) owns the message list and streaming state.
- A custom `ExternalStoreAdapter` maps AI SDK messages to assistant-ui message shapes.
- `useExternalStoreRuntime` turns that adapter into a runtime.
- `AssistantRuntimeProvider` exposes the runtime to the UI.

The adapter uses `toThreadMessageLike()` to translate AI SDK `UIMessage` parts (text, reasoning, sources, tool calls, data) into assistant-ui’s expected content schema.

## Thread UI

`src/components/assistant-ui/thread.tsx` composes assistant-ui primitives and provides the main chat layout:

- `ThreadPrimitive.Root`, `Viewport`, `Messages`, and `Composer` are the core building blocks.
- Custom components inject behavior for:
  - **Forking:** the thread action bar can call `onFork` with a message index.
  - **Scrolling:** custom logic keeps the view pinned during streaming.
  - **Suggestions and welcome state:** rendered when the thread is empty.

## Message rendering and extensions

The assistant-ui wrapper components live in `src/components/assistant-ui/`:

- `markdown-text.tsx` uses `@assistant-ui/react-markdown` with custom syntax highlighting.
- `reasoning.tsx` renders reasoning blocks from model output.
- `tool-fallback.tsx` handles tool call rendering when a tool is unsupported.
- `attachment.tsx` and `tooltip-icon-button.tsx` support rich composer and message actions.

This layer gives assistant-ui a consistent visual style while keeping the data source (AI SDK) isolated in the adapter.

## Attachments

Attachments are wired through the external store runtime:

- `src/app/(app)/chats/[id]/chat-view.tsx` supplies an `attachments` adapter so
  assistant-ui can accept files in the composer.
- Uploaded files are stored via `POST /chats/[id]/attachments` and referenced
  in AI SDK messages as `file` parts with a local URL.
- `toThreadMessageLike()` maps AI SDK file parts to assistant-ui attachments so
  user messages render previews (thumbnails for images, icons for other files).
