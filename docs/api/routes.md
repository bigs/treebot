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

## POST /chats/[id]/attachments

Uploads a file attachment for the current chat.

**File:** `src/app/(app)/chats/[id]/attachments/route.ts`

**Auth:** Required (session cookie)

**Request body:** `multipart/form-data`

- `file` is the uploaded attachment.

**Response:**

```json
{
  "filename": "stored-filename.ext",
  "originalName": "original-filename.ext",
  "mediaType": "image/png",
  "size": 123456,
  "url": "/chats/<id>/attachments/stored-filename.ext"
}
```

**Error responses:**

- `401 Unauthorized` if not logged in.
- `404 Not found` if the chat does not exist for the user.
- `400 Invalid file upload` if the payload is malformed.
- `400 Unsupported file type` or `400 File is too large` if validation fails.

## GET /chats/[id]/attachments/[filename]

Serves an uploaded attachment for the authenticated chat owner.

**File:** `src/app/(app)/chats/[id]/attachments/[filename]/route.ts`

**Auth:** Required (session cookie)

**Response:**

- The raw file bytes with a best-effort `Content-Type`.

**Error responses:**

- `401 Unauthorized` if not logged in.
- `404 Not found` if the chat or file does not exist for the user.

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

## POST /chats/[id]/handoff/preview

Generates a handoff summary preview for a selected assistant message.

**File:** `src/app/(app)/chats/[id]/handoff/preview/route.ts`

**Auth:** Required (session cookie)

**Request body:**

```json
{
  "index": 3,
  "messages": ["UIMessage", "..."]
}
```

- `index` is a zero-based integer pointing at the assistant message to hand off from.
- `messages` is the full compaction conversation, including the truncated chat history and the synthetic handoff prompt.

**Response:**

```json
{
  "message": "UIMessage"
}
```

- `message` is the assistant summary preview in `UIMessage` format.

**Error responses:**

- `401 Unauthorized` if not logged in.
- `404 Not found` if the chat does not exist for the user.
- `400 Invalid index` if `index` is missing or not an integer.
- `400 Index out of range` if the index exceeds the message list.
- `400 Invalid chat messages` if stored messages are malformed.
- `400 Invalid messages` if the compaction payload is malformed.
- `400 Handoff only supported for assistant messages` if the index points to a user message.
- `400 No API key configured for <platform>` if the user lacks a provider key.

## POST /chats/[id]/handoff

Creates a handoff child chat from the approved summary text.

**File:** `src/app/(app)/chats/[id]/handoff/route.ts`

**Auth:** Required (session cookie)

**Request body:**

```json
{
  "index": 3,
  "text": "Approved summary text"
}
```

- `index` is a zero-based integer pointing at the assistant message to hand off from.
- `text` is the approved summary that becomes the first user message in the child chat.

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
- `400 Invalid text` if the approved summary is not a string.
- `400 Text cannot be empty` if the approved summary is blank.
- `400 Handoff only supported for assistant messages` if the index points to a user message.

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
