import {
  streamText,
  generateText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { getSession } from "@/lib/auth";
import {
  getChatById,
  getApiKeyByUserAndPlatform,
  updateChatMessages,
  updateChatTitle,
} from "@/db/queries";
import { decrypt } from "@/lib/crypto";
import { createModel, buildProviderOptions, SYSTEM_PROMPT } from "@/lib/ai";
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
    onFinish: ({ messages }) => {
      updateChatMessages(chatId, session.sub, messages);

      if (chat.title == null) {
        generateTitle(
          chatId,
          session.sub,
          messages,
          platform,
          apiKey,
          chat.model
        ).catch(() => {
          /* title generation is best-effort */
        });
      }
    },
  });
}

async function generateTitle(
  chatId: string,
  userId: number,
  messages: UIMessage[],
  platform: Platform,
  apiKey: string,
  modelId: string
) {
  // Try Google Flash for cheap title generation if the user has a Google key
  let titleModel;
  let titleProviderOptions;

  if (platform === "google") {
    titleModel = createModel("google", apiKey, "gemini-2.0-flash");
    titleProviderOptions = buildProviderOptions("google", "minimal");
  } else {
    // Use the chat's own model
    titleModel = createModel(platform, apiKey, modelId);
    titleProviderOptions = buildProviderOptions(platform, "none");
  }

  const conversationSummary = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(0, 4)
    .map((m) => {
      const text = m.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ");
      return `${m.role}: ${text.slice(0, 200)}`;
    })
    .join("\n");

  const { text: title } = await generateText({
    model: titleModel,
    providerOptions: titleProviderOptions,
    prompt: `Generate a short title (2-6 words) for this conversation. Return ONLY the title, no quotes or punctuation.\n\n${conversationSummary}`,
  });

  const cleaned = title.trim().replace(/^["']|["']$/g, "");
  if (cleaned) {
    updateChatTitle(chatId, userId, cleaned);
  }
}
