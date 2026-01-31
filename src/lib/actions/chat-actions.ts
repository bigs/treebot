"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createChat,
  deleteChatWithChildren,
  getChatById,
  updateChatTitle,
  updateChatMessages,
} from "@/db/queries";
import { generateChatTitle } from "@/lib/chat-title";
import { deleteAttachmentDir } from "@/lib/attachments/storage";
import type { Platform } from "@/db/schema";
import type { ModelParams } from "@/lib/models";

const VALID_PLATFORMS: Platform[] = ["google", "openai"];

export async function createChatAction(input: {
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
    provider as Platform,
    input.model,
    messages,
    modelParams
  );

  generateChatTitle({
    chatId: chat.id,
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

  const modelParams: ModelParams | undefined = input.reasoningLevel
    ? { reasoning_effort: input.reasoningLevel }
    : undefined;

  const chat = createChat(
    session.sub,
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

  const chat = getChatById(chatId, session.sub);
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

  const safeAttachments = input.attachments.filter((attachment) =>
    attachment.url.startsWith(`/chats/${chatId}/attachments/`)
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

export async function deleteChatAction(
  chatId: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  if (!chatId) {
    return { error: "Chat ID is required." };
  }

  const deletedChatIds = deleteChatWithChildren(chatId, session.sub);
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
  title: string
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

  return { success: true };
}
