# Application hierarchy

This project is a Next.js 16 App Router application. The structure below explains what lives where and how the runtime pieces connect.

## Top-level layout

- `src/app/` contains App Router routes, layouts, and UI pages.
- `src/components/` holds shared UI components (including assistant-ui wrappers and the sidebar shell).
- `src/db/` defines the SQLite schema and synchronous Drizzle queries.
- `src/lib/` provides server actions, AI integration, auth helpers, and utilities.
- `src/proxy.ts` exports a Next.js middleware function for session gating (not currently wired to `middleware.ts`).
- `drizzle/` contains migration artifacts.
- `public/` hosts static assets.

## App Router structure

- `src/app/layout.tsx` is the root layout (fonts, global CSS).
- `src/app/page.tsx` is the entry route that redirects users to onboarding, login, or home based on user count and session.
- `src/app/(auth)/` contains public auth pages (`/login`, `/register`).
- `src/app/(app)/` contains authenticated pages (`/home`, `/chats/*`, `/settings`).
- `src/app/onboarding/` contains the first-run setup flow (`/onboarding/step-1`, `/onboarding/step-2`).

## App shell hierarchy

Protected pages are wrapped by the `(app)` layout in `src/app/(app)/layout.tsx`, which:

1. Verifies the session.
2. Loads the user’s chat list from the DB.
3. Builds the chat tree.
4. Renders `AppShell` from `src/components/sidebar/app-shell.tsx`.

`AppShell` creates the sidebar layout, composed as:

- `AppShell` -> `SidebarProvider` -> `ShellContent` -> `Sidebar` + `<main>`

## Supporting layers

- **Server actions:** `src/lib/actions/*` handles form-driven mutations (auth, chat create/delete, API keys, password changes).
- **AI integration:** `src/lib/ai.ts`, `src/lib/models.ts`, and chat routes under `src/app/(app)/chats/[id]/`.
- **Chat UI:** `src/components/assistant-ui/*` wraps assistant-ui primitives and renders the chat thread.
- **Auth/session:** `src/lib/auth.ts` for JWT cookies; session checks are performed in layouts and route handlers.
