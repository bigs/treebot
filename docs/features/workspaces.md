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

## Command menu

On `/home` and workspace chat routes, press Command-K (macOS) or Ctrl-K (other
platforms) to open a command menu. It lists workspaces in alphabetical order;
selecting one navigates to that workspace.

On workspace routes, Command-Shift-O (macOS) or Ctrl-Shift-O (other platforms)
creates a new chat in the current workspace.

On workspace routes, Command-Shift-K (macOS) or Ctrl-Shift-K (other platforms)
opens a chat switcher for the current workspace.
