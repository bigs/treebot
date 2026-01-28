"use server";

import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { upsertApiKey } from "@/db/queries";
import type { Platform } from "@/db/schema";

export type ApiKeyActionState =
  | { success: true }
  | { error: string }
  | undefined;

const PLATFORMS: Platform[] = ["google", "openai"];

export async function saveApiKeys(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }
  if (!session.isAdmin) {
    return { error: "Only admins can save API keys." };
  }

  const entries: { platform: Platform; key: string }[] = [];

  for (const platform of PLATFORMS) {
    const raw = formData.get(platform);
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    entries.push({ platform, key: trimmed });
  }

  if (entries.length === 0) {
    return { error: "Enter at least one API key." };
  }

  for (const { platform, key } of entries) {
    const encryptedKey = encrypt(key);
    upsertApiKey(session.sub, platform, encryptedKey);
  }

  return { success: true };
}
