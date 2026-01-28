import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel, JSONValue } from "ai";
import type { Platform } from "@/db/schema";

export const SYSTEM_PROMPT = "You are a helpful assistant.";

export function createModel(
  platform: Platform,
  apiKey: string,
  modelId: string
): LanguageModel {
  if (platform === "google") {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelId);
  }
  const openai = createOpenAI({ apiKey });
  return openai(modelId);
}

export function buildProviderOptions(
  platform: Platform,
  reasoningEffort?: string
): Record<string, Record<string, JSONValue>> | undefined {
  if (!reasoningEffort) return undefined;

  if (platform === "google") {
    return {
      google: {
        thinkingConfig: { thinkingLevel: reasoningEffort },
      },
    };
  }

  return {
    openai: {
      reasoningEffort,
    },
  };
}
