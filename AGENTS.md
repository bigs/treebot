# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages and route groups (e.g., `(auth)`, `(app)`, `onboarding`).
- `src/components/`: shared React components; UI primitives live in `src/components/ui/`.
- `src/lib/`: utilities and server actions (see `src/lib/actions/`).
- `src/db/`: Drizzle schema (`schema.ts`) and query helpers (`queries.ts`).
- `drizzle/`: generated migrations.
- `public/`: static assets; `uploads/`: stored attachments.
- `docs/`: product and operational documentation.

## Build, Test, and Development Commands
- `pnpm dev`: run the Next.js dev server.
- `pnpm build`: production build (includes TypeScript checks).
- `pnpm start`: run the production server.
- `pnpm lint`: ESLint checks.
- `pnpm format` / `pnpm format:check`: Prettier write/check with Tailwind class sorting.
- `pnpm db:generate`: generate a Drizzle migration from schema changes.
- `pnpm db:push`: push schema directly to SQLite (dev shortcut).
- `pnpm db:migrate`: apply pending migrations.
- `pnpm db:studio`: open Drizzle Studio UI.

## Coding Style & Naming Conventions
- TypeScript + React; follow Next.js App Router patterns.
- Formatting is enforced by Prettier (2-space indent, semicolons, double quotes). Run `pnpm format` before committing.
- ESLint uses Next.js + strict type-checked TypeScript rules.
- Use the `@/` alias for imports from `src/`.
- Database columns are `snake_case`; TypeScript fields are `camelCase` (Drizzle maps automatically).

## Testing Guidelines
- No automated test framework is configured yet.
- If you add tests, use `*.test.ts(x)` under `src/` or a `tests/` folder and add a `pnpm test` script in `package.json`.

## Commit & Pull Request Guidelines
- Commit history favors short, imperative messages; some commits use conventional prefixes like `feat:` or `docs:` and include PR numbers `(#123)`.
- Prefer concise, imperative messages; use a type prefix when it clarifies intent.
- PRs should describe the change, list validation commands (e.g., `pnpm lint`), link relevant issues, and include screenshots/GIFs for UI changes.
- Call out database migrations or schema changes explicitly.

## Configuration & Security Notes
- Copy `.env.local.example` to `.env.local` and set `SESSION_SECRET` and `ENCRYPTION_KEY` (64-char hex). Never commit secrets.
- After schema changes, run `pnpm db:generate` then `pnpm db:push` (dev) or `pnpm db:migrate` (prod).
- Route protection lives in `src/proxy.ts`; keep authentication checks consistent when adding routes.
