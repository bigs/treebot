# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Production build (includes TypeScript check)
pnpm lint             # ESLint
pnpm format           # Prettier auto-format
pnpm format:check     # Check formatting without writing
pnpm db:generate      # Generate Drizzle migration from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema directly to SQLite (dev shortcut)
pnpm db:studio        # Open Drizzle Studio UI
```

No test framework is configured.

## Architecture

Next.js 16 App Router with SQLite (better-sqlite3 + Drizzle ORM). All DB queries are synchronous. Auth uses JWT sessions (jose) stored in HttpOnly cookies. API keys are encrypted at rest with AES-256-GCM.

### Route groups

- `(auth)` — public pages: `/login`, `/register`
- `(app)` — protected pages behind session check: `/home`, `/chats/[id]`, `/settings`
- `onboarding/` — first-run admin setup, accessible only when zero users exist

### Data flow for protected pages

`(app)/layout.tsx` (server) verifies the session, fetches data, and passes it as props to `AppShell` (client). The client component tree is: `AppShell` → `SidebarProvider` (context) → `ShellContent` → `Sidebar` + `<main>`.

### Server actions

Located in `src/lib/actions/`. Forms use React 19 `useActionState`. Actions are `"use server"` functions that validate input, mutate the DB, and return state or redirect.

### Database

Schema in `src/db/schema.ts`. Queries in `src/db/queries.ts` as plain exported functions (synchronous, using `.all()` / `.get()` / `.run()`). Migrations live in `drizzle/`. After changing the schema, run `pnpm db:generate` then `pnpm db:push` or `pnpm db:migrate`.

### Middleware (`src/proxy.ts`)

Handles route protection and redirects. Public paths are allowlisted; everything else requires a valid session cookie.

## Conventions

- `@/` path alias maps to `src/` — use it for all imports
- UI primitives in `src/components/ui/` use CVA (class-variance-authority) and `cn()` from `src/lib/utils.ts`
- ESLint uses typescript-eslint strict type-checked config; `no-non-null-assertion` and `no-confusing-void-expression` are turned off
- Prettier sorts Tailwind classes (prettier-plugin-tailwindcss)
- Database column names are snake_case; TypeScript fields are camelCase (Drizzle maps automatically)

## Environment variables

Defined in `.env.local`:

- `SESSION_SECRET` — 64-char hex string for JWT signing
- `ENCRYPTION_KEY` — 64-char hex string for AES-256-GCM API key encryption
