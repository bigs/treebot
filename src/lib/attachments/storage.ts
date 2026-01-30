import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getAttachmentCategory, validateAttachment } from "./policy";
import type { Platform } from "@/db/schema";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

const sanitizeSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_");

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]/g, "_");

const generateFilename = (originalName: string) => {
  const safeName = sanitizeFilename(originalName || "file");
  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2, 10);
  return `${String(timestamp)}-${random}-${safeName}`;
};

export type StoredAttachment = {
  filename: string;
  storagePath: string;
  urlPath: string;
  mediaType: string;
  size: number;
  category: ReturnType<typeof getAttachmentCategory> | null;
};

export async function storeAttachment(params: {
  platform: Platform;
  userId: number;
  chatId: string;
  filename: string;
  mediaType: string;
  bytes: Uint8Array;
}) {
  const { platform, userId, chatId, filename, mediaType, bytes } = params;
  const validation = validateAttachment(platform, mediaType, bytes.byteLength);
  if (!validation.ok) {
    return { ok: false as const, error: validation.reason };
  }

  const safeUserId = sanitizeSegment(String(userId));
  const safeChatId = sanitizeSegment(chatId);
  const safeFileName = generateFilename(filename);
  const relativePath = path.join(safeUserId, safeChatId, safeFileName);
  const storagePath = path.join(UPLOADS_ROOT, relativePath);
  const dirPath = path.dirname(storagePath);
  await mkdir(dirPath, { recursive: true });
  await writeFile(storagePath, bytes);

  return {
    ok: true as const,
    attachment: {
      filename: safeFileName,
      storagePath,
      urlPath: `/chats/${chatId}/attachments/${safeFileName}`,
      mediaType,
      size: bytes.byteLength,
      category: validation.category,
    } satisfies StoredAttachment,
  };
}

export function getAttachmentPath(params: {
  userId: number;
  chatId: string;
  filename: string;
}) {
  const safeUserId = sanitizeSegment(String(params.userId));
  const safeChatId = sanitizeSegment(params.chatId);
  const safeFilename = sanitizeFilename(params.filename);
  const relativePath = path.join(safeUserId, safeChatId, safeFilename);
  return path.join(UPLOADS_ROOT, relativePath);
}
