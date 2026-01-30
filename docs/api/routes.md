# API routes

All API routes are in the App Router under `src/app/(app)/chats/[id]/`. They require an authenticated session cookie.

## POST /chats/[id]/stream

Streams assistant responses for a chat.

**File:** `src/app/(app)/chats/[id]/stream/route.ts`

**Auth:** Required (session cookie)

**Request body:**

```json
{
  "messages": ["UIMessage", "..."]
}
```

- `messages` is an array of AI SDK `UIMessage` objects.

**Response:**

- An AI SDK streaming response (`toUIMessageStreamResponse`).
- On completion, the route stores normalized messages in the `chats` table and may generate a title.

**Error responses:**

- `401 Unauthorized` if not logged in.
- `404 Not found` if the chat does not exist for the user.
- `400 No API key configured for <platform>` if the user lacks a provider key.

## POST /chats/[id]/fork

Creates a forked chat from a specific message index.

**File:** `src/app/(app)/chats/[id]/fork/route.ts`

**Auth:** Required (session cookie)

**Request body:**

```json
{
  "index": 3
}
```

- `index` is a zero-based integer pointing at the message to fork from.

**Response:**

```json
{
  "chatId": "new-chat-uuid"
}
```

**Error responses:**

- `401 Unauthorized` if not logged in.
- `404 Not found` if the chat does not exist for the user.
- `400 Invalid index` if `index` is missing or not an integer.
- `400 Index out of range` if the index exceeds the message list.
- `400 Invalid chat messages` if stored messages are malformed.

## GET /chats/[id]/title

Fetches the latest title and update timestamp for a chat.

**File:** `src/app/(app)/chats/[id]/title/route.ts`

**Auth:** Required (session cookie)

**Response:**

```json
{
  "title": "Chat title or null",
  "updatedAt": "ISO timestamp"
}
```

**Error responses:**

- `401 Unauthorized` if not logged in.
- `404 Not found` if the chat does not exist for the user.
