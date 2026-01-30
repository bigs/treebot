# Data models

The database is SQLite with Drizzle ORM. Schema lives in `src/db/schema.ts`, and all queries are synchronous in `src/db/queries.ts`.

## users

Represents application users.

- `id` (integer, PK, auto-increment)
- `username` (text, unique)
- `password` (text, Argon2 hash)
- `is_admin` (boolean, default false)
- `created_at` (ISO timestamp)

## api_keys

Encrypted API keys per user and provider.

- `id` (integer, PK, auto-increment)
- `user_id` (FK -> users.id)
- `platform` (enum: `google` | `openai`)
- `encrypted_key` (text, AES-256-GCM)
- `created_at`, `updated_at` (ISO timestamps)

Unique index on `(user_id, platform)`.

## chats

Stores chat threads and their fork relationships.

- `id` (text, PK, UUID)
- `user_id` (FK -> users.id)
- `parent_id` (nullable text, points to another chat for forks)
- `provider` (enum: `google` | `openai`)
- `model` (text, model ID)
- `model_params` (JSON; currently holds `reasoning_effort`)
- `title` (nullable text)
- `messages` (JSON; AI SDK `UIMessage[]`)
- `created_at`, `updated_at` (ISO timestamps)

The fork tree is built from `parent_id` in `src/lib/chat-tree.ts`.

## invite_codes

Invite-only registration support.

- `id` (integer, PK, auto-increment)
- `code` (text, unique)
- `created_by` (FK -> users.id)
- `redeemed_by` (nullable FK -> users.id)
- `created_at`, `redeemed_at` (ISO timestamps)

Registration requires a valid, unredeemed invite code.
