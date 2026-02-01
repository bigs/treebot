# Workspaces

New feature time! Let's implement "workspaces", which will essentially be
folders to help me organize my chats. I might have a workspace for
"ephemera"--random questions I ask LLMs--and a workspace for ML research, etc.

I'd like to keep this relatively simple.

## Interface requirements

I'd like the /home page to feature cards from shadcn
https://ui.shadcn.com/docs/components/radix/card for each workspace. They
should be tiled, centered in the content viewport, with two to a column,
breaking to new rows where necessary.

The cards for each workspace should have a title header with the name of the
workspace, as well as a sub-card (contrasting color) for each of the (up-to)
five most recent conversations in that workspace, with their titles. Clicking
on the cards should take you directly to that conversation. Clicking on the
title or elsewhere in the workspace card should take you to the workspace.

At the top of /home, there should be a header that reads "Workspaces", maybe h1
sized. Aligned with that header vertically, but on the right side of the
container, should be a "New Workspace" button. Clicking it should yield a
prompt dialog asking the user to name their new workspace (should be
cancelable). Clicking "Create" should make a new workspace and navigate the
user to it.

The namespace for workspaces will be /ws. A workspace's home page is
/ws/{workspace-id}. Navigating there should take the user to the most recent
chat within that workspace via redirect.

At the top of the left bar (with the chats) should be a dropdown select for the
user's workspaces, in the order of their creation. Selecting a workspace should
navigate to it. The left bar should always only show the chats for the current
workspace. When the user is at /home, the left bar should only show the
dropdown selector for workspaces, no chats.

## Functionality requirements

- Workspaces should have
  - uuid id
  - string name
  - timestamps
- Chats should now have
  - Required workspace_id referencing a workspace
- Route nesting
  - We should now nest chats in workspaces, so routes should look like:
    /ws/{workspace-id}/chats/{chat-id}
- The dropdown on the left-bar for chats should have a "Move" option, for
  moving it to a new workspace.
  - Clicking this should open a dialog with a Combobox
    https://ui.shadcn.com/docs/components/radix/combobox
  - The combobox should allow you to type in partial strings to filter the set
    of options
  - This combobox should be focused when the dialog appears
  - Hitting "enter"/"return" in the combobox to select something should
    complete the action of moving the chat
  - You should also be able to click a "Move" button on the dialog.

## Migration requirements

- We'll need a migration to
  - Add workspaces
  - Add workspace_id reference to chats (nullable)
  - Create an "Ephemera" workspace for every user
  - Associate all their existing chats into the workspace
  - Once all chats have a workspace, make workspace_id required

