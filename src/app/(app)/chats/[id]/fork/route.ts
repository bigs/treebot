import { getSession } from "@/lib/auth";
import { createForkedChat, getChatById } from "@/db/queries";
import type { ModelParams } from "@/lib/models";

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

  const body = (await request.json()) as { index?: number };
  if (typeof body.index !== "number" || !Number.isInteger(body.index)) {
    return new Response("Invalid index", { status: 400 });
  }

  if (!Array.isArray(chat.messages)) {
    return new Response("Invalid chat messages", { status: 400 });
  }

  const maxIndex = chat.messages.length - 1;
  if (body.index < 0 || body.index > maxIndex) {
    return new Response("Index out of range", { status: 400 });
  }

  const truncatedMessages = chat.messages.slice(0, body.index + 1);
  const fork = createForkedChat(
    session.sub,
    chatId,
    chat.provider,
    chat.model,
    truncatedMessages,
    chat.modelParams as ModelParams | null,
    chat.title
  );

  return Response.json({ chatId: fork.id });
}
