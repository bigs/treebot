import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getSession } from "@/lib/auth";
import {
  getChatById,
  getApiKeyByUserAndPlatform,
  updateChatMessages,
} from "@/db/queries";
import { decrypt } from "@/lib/crypto";
import { createModel, buildProviderOptions, SYSTEM_PROMPT } from "@/lib/ai";
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

  const storedParams = chat.modelParams as ModelParams | null;
  const providerOptions = buildProviderOptions(
    platform,
    storedParams?.reasoning_effort
  );

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    providerOptions,
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: uiMessages,
    sendReasoning: true,
    onFinish: ({ messages }) => {
      updateChatMessages(chatId, session.sub, messages);

      if (chat.title == null) {
        generateChatTitle({
          chatId,
          userId: session.sub,
          platform,
          modelId: chat.model,
          messages,
        }).catch(() => {
          /* title generation is best-effort */
        });
      }
    },
  });
}
