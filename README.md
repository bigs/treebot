# Treebot

A tree-based chat interface for forkable AI conversations. Chats can branch from any point, forming a navigable hierarchy in the sidebar.

## Tech stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **Auth:** JWT sessions (jose), Argon2 password hashing
- **Styling:** Tailwind CSS 4
- **AI providers:** Google and OpenAI via Vercel AI SDK

## Getting started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with a SESSION_SECRET and ENCRYPTION_KEY (64-char hex strings each)

# Push the database schema
pnpm db:push

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). On first visit you'll be guided through onboarding to create an admin account and add API keys.
