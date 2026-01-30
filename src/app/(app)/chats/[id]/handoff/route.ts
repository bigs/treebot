import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { createForkedChat, getChatById } from "@/db/queries";
import type { ModelParams } from "@/lib/models";

type HandoffCreateRequest = {
  index?: number;
  text?: string;
};

function isAssistantMessage(value: unknown): value is { role: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    (value as { role?: string }).role === "assistant"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = getChatById(chatId, session.sub);
  if (!chat) {
    return new Response("Not found", { status: 404 });
  }

  const body = (await request.json()) as unknown;
  if (typeof body !== "object" || body === null) {
    return new Response("Invalid body", { status: 400 });
  }
  const { index, text } = body as HandoffCreateRequest;
  if (typeof index !== "number" || !Number.isInteger(index)) {
    return new Response("Invalid index", { status: 400 });
  }

  if (!Array.isArray(chat.messages)) {
    return new Response("Invalid chat messages", { status: 400 });
  }

  const chatMessages = chat.messages as unknown[];
  const maxIndex = chatMessages.length - 1;
  if (index < 0 || index > maxIndex) {
    return new Response("Index out of range", { status: 400 });
  }

  const targetMessage = chatMessages[index];
  if (!isAssistantMessage(targetMessage)) {
    return new Response("Handoff only supported for assistant messages", {
      status: 400,
    });
  }

  if (typeof text !== "string") {
    return new Response("Invalid text", { status: 400 });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return new Response("Text cannot be empty", { status: 400 });
  }

  const messages = [
    {
      id: randomUUID(),
      role: "user" as const,
      parts: [{ type: "text" as const, text }],
    },
  ];

  const fork = createForkedChat(
    session.sub,
    chatId,
    chat.provider,
    chat.model,
    messages,
    chat.modelParams as ModelParams | null,
    chat.title
  );

  return Response.json({ chatId: fork.id });
}
