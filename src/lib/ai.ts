import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel, JSONValue } from "ai";
import type { Platform } from "@/db/schema";

export function getSystemPrompt(now: Date = new Date()): string {
  return `You are a helpful assistant. The current date and time is: ${now.toISOString()}`;
}

function createProvider(platform: Platform, apiKey: string) {
  if (platform === "google") {
    return createGoogleGenerativeAI({ apiKey });
  }
  return createOpenAI({ apiKey });
}

export function createModel(
  platform: Platform,
  apiKey: string,
  modelId: string
): LanguageModel {
  const provider = createProvider(platform, apiKey);
  return provider(modelId);
}

export function buildTools(
  platform: Platform,
  apiKey: string,
  modelId?: string,
  reasoningEffort?: string
): Record<string, unknown> {
  if (platform === "google") {
    const provider = createGoogleGenerativeAI({ apiKey });
    return {
      google_search: provider.tools.googleSearch({}),
    };
  }
  const provider = createOpenAI({ apiKey });
  if (modelId === "gpt-5.2" && reasoningEffort === "minimal") {
    return {};
  }
  return {
    web_search: provider.tools.webSearch({}),
  };
}

export function buildProviderOptions(
  platform: Platform,
  reasoningEffort?: string
): Record<string, Record<string, JSONValue>> | undefined {
  if (!reasoningEffort) return undefined;

  if (platform === "google") {
    return {
      google: {
        thinkingConfig: {
          thinkingLevel: reasoningEffort,
          includeThoughts: true,
        },
      },
    };
  }

  return {
    openai: {
      reasoningEffort,
      reasoningSummary: "auto",
    },
  };
}
