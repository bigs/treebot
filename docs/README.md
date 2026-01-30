# Treebot Documentation

Treebot is a chatbot interface that lets users fork or handoff from any point in a conversation, creating a branching tree of chats. The goal is to make learning conversations easier by letting you explore alternative paths without losing context.

## Project overview

- **Web app:** Next.js App Router with route groups for public auth pages, protected app pages, and first-run onboarding.
- **Chat experience:** A branching chat UI with forks and handoffs, powered by the Vercel AI SDK for streaming and assistant-ui for the thread UI.
- **Data layer:** SQLite + Drizzle ORM with tables for users, API keys, chats (including parent-child links), and invite codes.
- **Server actions:** Auth, chat creation, key management, and settings live in `src/lib/actions/*`.
- **Session/auth:** JWT cookies (jose) and a server-side session check on protected routes.

## Documentation modules

- [Application hierarchy](architecture/application-hierarchy.md)
- [Site map](architecture/site-map.md)
- [AI SDK usage](ai/ai-sdk.md)
- [assistant-ui usage](ai/assistant-ui.md)
- [Data models](data/data-models.md)
- [Onboarding workflow](features/onboarding.md)
- [Admin capabilities](features/admin.md)
- [Handoffs](features/handoffs.md)
- [Attachments](features/attachments.md)
- [API routes](api/routes.md)
