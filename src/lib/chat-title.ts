import { generateText, type UIMessage } from "ai";
import { revalidatePath } from "next/cache";
import { getApiKeyByUserAndPlatform, updateChatTitle } from "@/db/queries";
import { decrypt } from "@/lib/crypto";
import { buildProviderOptions, buildTools, createModel } from "@/lib/ai";
import type { Platform } from "@/db/schema";

type TitleInput = {
  chatId: string;
  userId: number;
  platform: Platform;
  modelId: string;
  messages?: UIMessage[];
  prompt?: string;
  mode?: "summary" | "history";
};

function buildSummaryFromMessages(messages: UIMessage[]): string {
  return messages
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
}

function buildHistoryFromMessages(messages: UIMessage[]): string {
  const relevant = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  const trimmed = relevant.slice(-12);
  return trimmed
    .map((m) => {
      const text = m.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
        .slice(0, 300);
      if (!text) return "";
      const label = m.role === "user" ? "User" : "Assistant";
      return `${label}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function buildSummaryFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "";
  return `user: ${trimmed.slice(0, 200)}`;
}

export async function generateChatTitle({
  chatId,
  userId,
  platform,
  modelId,
  messages,
  prompt,
  mode = "summary",
}: TitleInput) {
  const keyRow = getApiKeyByUserAndPlatform(userId, platform);
  if (!keyRow) return;
  const apiKey = decrypt(keyRow.encryptedKey);
  const tools = buildTools(platform, apiKey);

  let titleModel;
  let titleProviderOptions;

  if (platform === "google") {
    titleModel = createModel("google", apiKey, "gemini-3-flash-preview");
    titleProviderOptions = buildProviderOptions("google", "minimal");
  } else {
    titleModel = createModel(platform, apiKey, modelId);
    titleProviderOptions = buildProviderOptions(platform, "none");
  }

  const conversationSummary = messages
    ? mode === "history"
      ? buildHistoryFromMessages(messages)
      : buildSummaryFromMessages(messages)
    : buildSummaryFromPrompt(prompt ?? "");

  if (!conversationSummary) return;

  const promptHeader =
    mode === "history"
      ? "Generate a short title (2-6 words) for the following chat. Emphasize the user's most recent message. Return ONLY the title, no quotes or punctuation."
      : "Generate a short title (2-6 words) for this conversation. Return ONLY the title, no quotes or punctuation.";

  const { text: title } = await generateText({
    model: titleModel,
    providerOptions: titleProviderOptions,
    tools,
    prompt: `${promptHeader}\n\n${conversationSummary}`,
  });

  const cleaned = title.trim().replace(/^["']|["']$/g, "");
  if (!cleaned) return;

  updateChatTitle(chatId, userId, cleaned);
  revalidatePath("/", "layout");
  revalidatePath(`/chats/${chatId}`);
}
