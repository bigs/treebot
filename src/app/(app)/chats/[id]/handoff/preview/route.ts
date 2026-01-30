import { generateText, convertToModelMessages, type UIMessage } from "ai";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { getApiKeyByUserAndPlatform, getChatById } from "@/db/queries";
import { decrypt } from "@/lib/crypto";
import { buildProviderOptions, createModel, getSystemPrompt } from "@/lib/ai";
import { inlineAttachmentMessages } from "@/lib/attachments/inline";
import type { Platform } from "@/db/schema";
import type { ModelParams } from "@/lib/models";

type HandoffPreviewRequest = {
  index?: number;
  messages?: UIMessage[];
};

type HandoffPreviewResponse = {
  message: UIMessage;
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
  const { index, messages } = body as HandoffPreviewRequest;
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

  if (!Array.isArray(messages)) {
    return new Response("Invalid messages", { status: 400 });
  }

  const platform = chat.provider as Platform;
  const keyRow = getApiKeyByUserAndPlatform(session.sub, platform);
  if (!keyRow) {
    return new Response("No API key configured for " + platform, {
      status: 400,
    });
  }

  const apiKey = decrypt(keyRow.encryptedKey);
  const model = createModel(platform, apiKey, chat.model);

  const storedParams = chat.modelParams as ModelParams | null;
  const providerOptions = buildProviderOptions(
    platform,
    storedParams?.reasoning_effort
  );

  let modelMessagesInput = messages;
  try {
    modelMessagesInput = await inlineAttachmentMessages(messages, {
      userId: session.sub,
      chatId,
      baseUrl: request.url,
    });
  } catch {
    return new Response("Failed to load attachments", { status: 400 });
  }

  const modelMessages = await convertToModelMessages(modelMessagesInput);

  const result = await generateText({
    model,
    system: getSystemPrompt(),
    messages: modelMessages,
    providerOptions,
    toolChoice: "none",
    abortSignal: request.signal,
  });

  const parts: UIMessage["parts"] = [];
  for (const part of result.content) {
    if (part.type === "text") {
      parts.push({
        type: "text",
        text: part.text,
        ...(part.providerMetadata
          ? { providerMetadata: part.providerMetadata }
          : {}),
      });
    } else if (part.type === "reasoning") {
      parts.push({
        type: "reasoning",
        text: part.text,
        ...(part.providerMetadata
          ? { providerMetadata: part.providerMetadata }
          : {}),
      });
    }
  }

  if (parts.length === 0 && result.text) {
    parts.push({ type: "text", text: result.text });
  }

  const message: UIMessage = {
    id: randomUUID(),
    role: "assistant",
    parts,
  };

  return Response.json({ message } satisfies HandoffPreviewResponse);
}
