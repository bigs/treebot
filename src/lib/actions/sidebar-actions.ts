"use server";

import { getSession } from "@/lib/auth";
import { getChatsByWorkspace, getWorkspaceById } from "@/db/queries";
import { buildChatTree, type ChatNode } from "@/lib/chat-tree";

export async function getWorkspaceChatTreeAction(
  workspaceId: string
): Promise<{ chats: ChatNode[] }> {
  const session = await getSession();
  if (!session) {
    return { chats: [] };
  }

  if (!workspaceId) {
    return { chats: [] };
  }

  const workspace = getWorkspaceById(workspaceId, session.sub);
  if (!workspace) {
    return { chats: [] };
  }

  const rows = getChatsByWorkspace(session.sub, workspaceId);
  const chats = buildChatTree(rows);

  return { chats };
}
