# Workspaces

Workspaces group chats so related threads stay together. Every user has at least
one workspace (Ephemera), created on first login or migration.

## Home

- `/home` lists your workspaces as cards.
- Each card shows recent conversations sorted by most recently updated.
- The workspace title links to the workspace route.
- The card menu includes Delete, which removes the workspace and all of its
  chats after confirmation.

## Workspace routes

- `/ws/[workspaceId]` is the workspace landing page. If a workspace has no
  chats yet, it redirects to `/ws/[workspaceId]/chats/new`.
- `/ws/[workspaceId]/chats/new` creates a new chat inside the workspace.
- `/ws/[workspaceId]/chats/[id]` shows a specific chat thread.

## Sidebar behavior

- The sidebar shows a Home button and a workspace selector.
- The chat list reflects the active workspace.
- Moving a chat moves all of its branches to the destination workspace. If the
  active chat moves, the UI navigates to the new workspace URL; otherwise the
  sidebar refreshes.
