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
- `src/app/(app)/` contains authenticated pages (`/home`, `/ws/*`, `/settings`). Legacy `/chats/*` routes redirect to `/ws/*`.
- `src/app/(app)/(shell)/` wraps non-workspace pages in the sidebar shell (`/home`, `/settings`).
- `src/app/(app)/ws/[workspaceId]/` wraps workspace routes with the sidebar shell and workspace chat tree.
- `src/app/onboarding/` contains the first-run setup flow (`/onboarding/step-1`, `/onboarding/step-2`).

## App shell hierarchy

Protected pages are wrapped by layered layouts:

1. `src/app/(app)/layout.tsx` verifies the session and enforces admin API key setup.
2. `src/app/(app)/(shell)/layout.tsx` loads workspaces and renders `AppShell` for `/home` and `/settings`.
3. `src/app/(app)/ws/[workspaceId]/layout.tsx` loads workspaces plus the chat tree for that workspace and renders `AppShell`.

`AppShell` creates the sidebar layout, composed as:

- `AppShell` -> `SidebarProvider` -> `ShellContent` -> `Sidebar` + `<main>`

Mobile layout notes:

- `Sidebar` becomes an off-canvas panel with a fixed open button; `SidebarProvider` tracks `mobileOpen`.
- Selecting a chat closes the mobile sidebar so the thread content is full-width.
- Chat/new chat headers include safe-area padding so titles clear the notch and sidebar toggle.

## Supporting layers

- **Server actions:** `src/lib/actions/*` handles form-driven mutations (auth, chat create/delete, API keys, password changes).
- **AI integration:** `src/lib/ai.ts`, `src/lib/models.ts`, and chat routes under `src/app/(app)/ws/[workspaceId]/chats/[id]/`.
- **Chat UI:** `src/components/assistant-ui/*` wraps assistant-ui primitives and renders the chat thread.
- **Auth/session:** `src/lib/auth.ts` for JWT cookies; session checks are performed in layouts and route handlers.
