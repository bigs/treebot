"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createChat,
  deleteChatWithChildren,
  updateChatTitle,
} from "@/db/queries";
import { generateChatTitle } from "@/lib/chat-title";
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

  deleteChatWithChildren(chatId, session.sub);
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
