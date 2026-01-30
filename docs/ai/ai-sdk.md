# AI SDK usage

Treebot uses the Vercel AI SDK for both streaming chat responses and auxiliary tasks (like title generation). Integration is split between server-side route handlers and client-side hooks.

## Provider setup

Core helpers live in `src/lib/ai.ts`:

- `createModel(platform, apiKey, modelId)` builds a `LanguageModel` from either `@ai-sdk/google` or `@ai-sdk/openai`.
- `buildTools(platform, apiKey)` enables provider-specific web search tools:
  - Google: `google_search`
  - OpenAI: `web_search`
- `buildProviderOptions(platform, reasoningEffort)` normalizes reasoning config across providers.
- `getSystemPrompt()` generates a basic system prompt with the current timestamp.

## Streaming chat responses

The main chat streaming route is `POST /chats/[id]/stream` in `src/app/(app)/chats/[id]/stream/route.ts`:

- Uses `streamText` from `ai`.
- Converts UI messages into model messages via `convertToModelMessages`.
- Supplies `system`, `providerOptions`, and `tools` from `src/lib/ai.ts`.
- Streams results back to the client using `toUIMessageStreamResponse`.
- On completion, writes the normalized message list to the DB.

## Client integration

Client-side chat state is in `src/app/(app)/chats/[id]/chat-view.tsx`:

- Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointing at `/chats/[id]/stream`.
- Manages message state, run status, and error reporting.
- Calls `chat.sendMessage`, `chat.regenerate`, and `chat.stop` to control the stream.

## Model metadata and reasoning levels

`src/lib/models.ts` fetches model metadata from `https://models.dev/api.json` and merges it with local defaults:

- Supported providers and model IDs are hardcoded in `SUPPORTED_MODELS`.
- Reasoning levels are normalized per model to drive the UI.
- Results are cached in-memory for 1 hour, with a hardcoded fallback if the fetch fails.

## Title generation

Chat titles are generated with `generateText` in `src/lib/chat-title.ts`:

- Pulls the user's API key from the DB.
- Chooses a lightweight model for Google, or the current model for OpenAI.
- Summarizes either the conversation history or the initial prompt.
- Stores the cleaned title back on the chat record.
