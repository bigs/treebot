# Handoffs

Handoffs create a child chat from a specific assistant message while steering the new thread in a fresh direction. Instead of copying the full conversation history into the child chat, the app compacts the history into a short summary plus the user's new prompt.

## UI flow

- A **Handoff** button (hand icon) appears on assistant messages alongside **Fork**.
- Clicking it opens a prompt dialog asking, “Where do you want to lead the new conversation?”
- Submitting the prompt runs a compaction step using the parent chat model with tool use disabled.
- The generated summary is shown in a preview dialog rendered as Markdown.
- Users can accept, cancel, or provide feedback to revise the summary.

## Compaction behavior

- The request includes message history up to and including the selected assistant message.
- A synthetic user instruction is appended that tells the model to summarize the conversation for the new direction.
- Output format is:
  - `Context` section in bullet points that frames this as an ongoing conversation.
  - Blank line.
  - The user's prompt verbatim as a normal paragraph.

## Chat creation behavior

- Accepting the summary creates a child chat whose first message is a user message containing the approved summary.
- The child chat inherits the parent title initially; title generation runs asynchronously after the first assistant response.
- The new chat autostarts the assistant response (same behavior as a new chat with a single user message).

## API routes

- `POST /chats/[id]/handoff/preview` generates the summary preview.
- `POST /chats/[id]/handoff` creates the new child chat from the approved summary.

See [API routes](../api/routes.md) for request/response shapes.
