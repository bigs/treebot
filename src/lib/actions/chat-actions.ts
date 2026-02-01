"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createChat,
  deleteChatWithChildren,
  getChatByIdInWorkspace,
  getWorkspaceById,
  updateChatTitle,
  updateChatMessages,
} from "@/db/queries";
import { generateChatTitle } from "@/lib/chat-title";
import { deleteAttachmentDir } from "@/lib/attachments/storage";
import type { Platform } from "@/db/schema";
import type { ModelParams } from "@/lib/models";

const VALID_PLATFORMS: Platform[] = ["google", "openai"];

export async function createChatAction(input: {
  workspaceId: string;
  provider: string;
  model: string;
  message: string;
  reasoningLevel?: string;
}): Promise<{ chatId: string } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  const provider = input.provider;
  if (!VALID_PLATFORMS.includes(provider as Platform)) {
    return { error: "Invalid provider." };
  }

  const message = input.message.trim();
  if (!message) {
    return { error: "Message cannot be empty." };
  }

  if (!input.model) {
    return { error: "Model is required." };
  }

  const workspaceId = input.workspaceId;
  if (!workspaceId) {
    return { error: "Workspace is required." };
  }

  const workspace = getWorkspaceById(workspaceId, session.sub);
  if (!workspace) {
    return { error: "Workspace not found." };
  }

  const messages = [
    {
      id: crypto.randomUUID(),
      role: "user" as const,
      parts: [{ type: "text" as const, text: message }],
    },
  ];
  const modelParams: ModelParams | undefined = input.reasoningLevel
    ? { reasoning_effort: input.reasoningLevel }
    : undefined;
  const chat = createChat(
    session.sub,
    workspaceId,
    provider as Platform,
    input.model,
    messages,
    modelParams
  );

  generateChatTitle({
    chatId: chat.id,
    workspaceId,
    userId: session.sub,
    platform: provider as Platform,
    modelId: input.model,
    prompt: message,
  }).catch(() => {
    /* title generation is best-effort */
  });

  revalidatePath("/", "layout");

  return { chatId: chat.id };
}

export async function createDraftChatAction(input: {
  workspaceId: string;
  provider: string;
  model: string;
  reasoningLevel?: string;
}): Promise<{ chatId: string } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  const provider = input.provider;
  if (!VALID_PLATFORMS.includes(provider as Platform)) {
    return { error: "Invalid provider." };
  }

  if (!input.model) {
    return { error: "Model is required." };
  }

  const workspaceId = input.workspaceId;
  if (!workspaceId) {
    return { error: "Workspace is required." };
  }

  const workspace = getWorkspaceById(workspaceId, session.sub);
  if (!workspace) {
    return { error: "Workspace not found." };
  }

  const modelParams: ModelParams | undefined = input.reasoningLevel
    ? { reasoning_effort: input.reasoningLevel }
    : undefined;

  const chat = createChat(
    session.sub,
    workspaceId,
    provider as Platform,
    input.model,
    [],
    modelParams
  );

  revalidatePath("/", "layout");

  return { chatId: chat.id };
}

export async function finalizeChatWithAttachmentsAction(input: {
  chatId: string;
  workspaceId: string;
  message: string;
  attachments: Array<{
    url: string;
    mediaType: string;
    filename?: string;
  }>;
}): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  const chatId = input.chatId;
  if (!chatId) {
    return { error: "Chat ID is required." };
  }

  const workspaceId = input.workspaceId;
  if (!workspaceId) {
    return { error: "Workspace is required." };
  }

  const chat = getChatByIdInWorkspace(chatId, workspaceId, session.sub);
  if (!chat) {
    return { error: "Chat not found." };
  }

  if (!Array.isArray(chat.messages) || chat.messages.length > 0) {
    return { error: "Chat already initialized." };
  }

  const trimmed = input.message.trim();
  if (!trimmed && input.attachments.length === 0) {
    return { error: "Message cannot be empty." };
  }

  const attachmentPrefix = `/ws/${workspaceId}/chats/${chatId}/attachments/`;
  const safeAttachments = input.attachments.filter((attachment) =>
    attachment.url.startsWith(attachmentPrefix)
  );

  if (safeAttachments.length !== input.attachments.length) {
    return { error: "Invalid attachment reference." };
  }

  const parts = [
    ...safeAttachments.map((attachment) => ({
      type: "file" as const,
      mediaType: attachment.mediaType,
      filename: attachment.filename,
      url: attachment.url,
    })),
    ...(trimmed ? [{ type: "text" as const, text: trimmed }] : []),
  ];

  const messages = [
    {
      id: crypto.randomUUID(),
      role: "user" as const,
      parts,
    },
  ];

  updateChatMessages(chatId, session.sub, messages);

  if (trimmed) {
    generateChatTitle({
      chatId,
      workspaceId,
      userId: session.sub,
      platform: chat.provider as Platform,
      modelId: chat.model,
      prompt: trimmed,
    }).catch(() => {
      /* title generation is best-effort */
    });
  }

  revalidatePath("/", "layout");

  return { success: true };
}

export async function deleteChatAction(input: {
  chatId: string;
  workspaceId: string;
}): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  if (!input.chatId) {
    return { error: "Chat ID is required." };
  }

  if (!input.workspaceId) {
    return { error: "Workspace is required." };
  }

  const deletedChatIds = deleteChatWithChildren(
    input.chatId,
    session.sub,
    input.workspaceId
  );
  await Promise.all(
    deletedChatIds.map((id) =>
      deleteAttachmentDir({ userId: session.sub, chatId: id })
    )
  );
  revalidatePath("/", "layout");

  return { success: true };
}

export async function renameChatAction(
  chatId: string,
  title: string,
  workspaceId: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  if (!chatId) {
    return { error: "Chat ID is required." };
  }

  const cleaned = title.trim();
  if (!cleaned) {
    return { error: "Chat title cannot be empty." };
  }

  updateChatTitle(chatId, session.sub, cleaned);
  revalidatePath("/", "layout");
  revalidatePath(`/ws/${workspaceId}/chats/${chatId}`);

  return { success: true };
}
