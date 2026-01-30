import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import {
  getChatById,
  getApiKeyByUserAndPlatform,
  updateChatMessages,
} from "@/db/queries";
import { decrypt } from "@/lib/crypto";
import {
  buildProviderOptions,
  buildTools,
  createModel,
  getSystemPrompt,
} from "@/lib/ai";
import { generateChatTitle } from "@/lib/chat-title";
import type { Platform } from "@/db/schema";
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

  const body = (await request.json()) as { messages: UIMessage[] };
  const uiMessages = body.messages;

  const platform = chat.provider as Platform;
  const keyRow = getApiKeyByUserAndPlatform(session.sub, platform);
  if (!keyRow) {
    return new Response("No API key configured for " + platform, {
      status: 400,
    });
  }
  const apiKey = decrypt(keyRow.encryptedKey);

  const model = createModel(platform, apiKey, chat.model);
  const tools = buildTools(platform, apiKey);

  const storedParams = chat.modelParams as ModelParams | null;
  const providerOptions = buildProviderOptions(
    platform,
    storedParams?.reasoning_effort
  );

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model,
    system: getSystemPrompt(),
    messages: modelMessages,
    providerOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: tools as any,
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: uiMessages,
    sendReasoning: true,
    onFinish: ({ messages }) => {
      const normalizedMessages = messages.map((message) =>
        message.id.trim() ? message : { ...message, id: randomUUID() }
      );

      updateChatMessages(chatId, session.sub, normalizedMessages);

      const shouldRegenerateTitle =
        chat.parentId != null && chat.updatedAt === chat.createdAt;

      if (chat.title == null || shouldRegenerateTitle) {
        generateChatTitle({
          chatId,
          userId: session.sub,
          platform,
          modelId: chat.model,
          messages: normalizedMessages,
          mode: shouldRegenerateTitle ? "history" : "summary",
        }).catch(() => {
          /* title generation is best-effort */
        });
      }
    },
  });
}
