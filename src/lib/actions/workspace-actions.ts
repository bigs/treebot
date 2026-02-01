"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createWorkspace,
  getWorkspaceById,
  moveChatWithChildren,
} from "@/db/queries";

export async function createWorkspaceAction(input: {
  name: string;
}): Promise<{ workspaceId: string } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  const cleaned = input.name.trim();
  if (!cleaned) {
    return { error: "Workspace name cannot be empty." };
  }

  const workspace = createWorkspace(session.sub, cleaned);

  revalidatePath("/", "layout");
  revalidatePath("/home");

  return { workspaceId: workspace.id };
}

export async function moveChatToWorkspaceAction(input: {
  chatId: string;
  fromWorkspaceId: string;
  toWorkspaceId: string;
}): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  const { chatId, fromWorkspaceId, toWorkspaceId } = input;
  if (!chatId) {
    return { error: "Chat ID is required." };
  }
  if (!fromWorkspaceId || !toWorkspaceId) {
    return { error: "Workspace is required." };
  }
  if (fromWorkspaceId === toWorkspaceId) {
    return { error: "Chat is already in that workspace." };
  }

  const destination = getWorkspaceById(toWorkspaceId, session.sub);
  if (!destination) {
    return { error: "Workspace not found." };
  }

  const moved = moveChatWithChildren(
    chatId,
    session.sub,
    fromWorkspaceId,
    toWorkspaceId
  );

  if (moved.length === 0) {
    return { error: "Chat not found." };
  }

  revalidatePath("/", "layout");
  revalidatePath(`/ws/${fromWorkspaceId}`);
  revalidatePath(`/ws/${toWorkspaceId}`);

  return { success: true };
}
