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

- `/home` list of workspaces and recent chats.
- `/ws/[workspaceId]` workspace landing page (redirects to new chat if empty).
- `/ws/[workspaceId]/chats/new` create a new chat in a workspace.
- `/ws/[workspaceId]/chats/[id]` view and interact with a specific chat thread.
- `/settings` change password and (admin only) update provider API keys.

Legacy chat routes under `/chats/*` redirect to the workspace-scoped routes.

## API routes (authenticated)

- `POST /ws/[workspaceId]/chats/[id]/stream` stream assistant responses.
- `POST /ws/[workspaceId]/chats/[id]/attachments` upload a file attachment.
- `GET /ws/[workspaceId]/chats/[id]/attachments/[filename]` fetch an attachment.
- `POST /ws/[workspaceId]/chats/[id]/fork` create a forked chat from a message index.
- `POST /ws/[workspaceId]/chats/[id]/handoff/preview` generate a handoff summary preview.
- `POST /ws/[workspaceId]/chats/[id]/handoff` create a handoff child chat from the approved summary.
- `GET /ws/[workspaceId]/chats/[id]/title` fetch the latest title for a chat.

See [API routes](../api/routes.md) for request/response details.
