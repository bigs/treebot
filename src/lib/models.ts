import type { Platform } from "@/db/schema";

export interface ModelParams {
  reasoning_effort?: string;
}

export interface ReasoningOption {
  value: string;
  label: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: Platform;
  providerName: string;
  reasoning: boolean;
  reasoningLevels: ReasoningOption[];
  defaultReasoningLevel: string;
}

const MODEL_REASONING: Record<
  string,
  { levels: ReasoningOption[]; default: string }
> = {
  "gpt-5.2": {
    levels: [
      { value: "none", label: "None" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "xhigh", label: "Extra high" },
    ],
    default: "medium",
  },
  "gemini-3-flash-preview": {
    levels: [
      { value: "minimal", label: "Minimal" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
    default: "high",
  },
  "gemini-3-pro-preview": {
    levels: [
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ],
    default: "high",
  },
};

const DEFAULT_REASONING: { levels: ReasoningOption[]; default: string } = {
  levels: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ],
  default: "medium",
};

function getReasoningConfig(modelId: string, isReasoning: boolean) {
  if (!isReasoning) {
    return { levels: [] as ReasoningOption[], default: "" };
  }
  return MODEL_REASONING[modelId] ?? DEFAULT_REASONING;
}

const SUPPORTED_MODELS: Record<Platform, string[]> = {
  google: ["gemini-3-flash-preview", "gemini-3-pro-preview"],
  openai: ["gpt-5.2"],
};

const PROVIDER_NAMES: Record<Platform, string> = {
  google: "Google",
  openai: "OpenAI",
};

interface ModelsDevModelEntry {
  id: string;
  name: string;
  reasoning?: boolean;
}

interface ModelsDevProvider {
  models?: Record<string, ModelsDevModelEntry>;
}

type ModelsDevResponse = Record<string, ModelsDevProvider>;

const HARDCODED_FALLBACK: ModelInfo[] = (() => {
  const entries: { id: string; name: string; provider: Platform }[] = [
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      provider: "google",
    },
    {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro Preview",
      provider: "google",
    },
    { id: "gpt-5.2", name: "GPT-5.2", provider: "openai" },
  ];
  return entries.map((e) => {
    const config = getReasoningConfig(e.id, true);
    return {
      ...e,
      providerName: PROVIDER_NAMES[e.provider],
      reasoning: true,
      reasoningLevels: config.levels,
      defaultReasoningLevel: config.default,
    };
  });
})();

let cachedModels: ModelInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function buildModelIndex(
  data: ModelsDevResponse
): Map<string, ModelsDevModelEntry> {
  const index = new Map<string, ModelsDevModelEntry>();
  for (const provider of Object.values(data)) {
    if (!provider.models) continue;
    for (const [modelId, entry] of Object.entries(provider.models)) {
      if (!index.has(modelId)) {
        index.set(modelId, entry);
      }
    }
  }
  return index;
}

export async function getModels(): Promise<ModelInfo[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels;
  }

  try {
    const res = await fetch("https://models.dev/api.json", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`models.dev returned ${String(res.status)}`);

    const data = (await res.json()) as ModelsDevResponse;
    const index = buildModelIndex(data);

    const models: ModelInfo[] = [];
    for (const [platform, modelIds] of Object.entries(SUPPORTED_MODELS)) {
      for (const modelId of modelIds) {
        const entry = index.get(modelId);
        const isReasoning = entry?.reasoning ?? false;
        const config = getReasoningConfig(modelId, isReasoning);
        models.push({
          id: modelId,
          name: entry?.name ?? modelId,
          provider: platform as Platform,
          providerName: PROVIDER_NAMES[platform as Platform],
          reasoning: isReasoning,
          reasoningLevels: config.levels,
          defaultReasoningLevel: config.default,
        });
      }
    }

    cachedModels = models;
    cacheTimestamp = now;
    return models;
  } catch {
    // Stale cache is better than nothing
    if (cachedModels) return cachedModels;
    return HARDCODED_FALLBACK;
  }
}
