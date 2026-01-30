# Site map

This is the current route map for the application, grouped by access level.

## Public routes

- `/` redirect-only entry route. Redirects to `/onboarding` if no users exist, otherwise to `/login` or `/home` based on session.
- `/login` sign-in page.
- `/register` sign-up page (requires an invite code).
- `/onboarding` redirect to step 1.
- `/onboarding/step-1` create the initial admin account (only when no users exist).
- `/onboarding/step-2` enter provider API keys after admin creation.

## Authenticated routes

- `/home` list or landing page for chats.
- `/chats/new` create a new chat (model selection + initial message).
- `/chats/[id]` view and interact with a specific chat thread.
- `/settings` change password and (admin only) update provider API keys.

## API routes (authenticated)

- `POST /chats/[id]/stream` stream assistant responses.
- `POST /chats/[id]/fork` create a forked chat from a message index.
- `GET /chats/[id]/title` fetch the latest title for a chat.

See [API routes](../api/routes.md) for request/response details.
