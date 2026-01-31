import { readFile } from "fs/promises";
import path from "path";
import type { UIMessage } from "ai";
import { getAttachmentPath } from "./storage";

type AttachmentInlineContext = {
  userId: number;
  chatId: string;
  baseUrl: string;
};

const buildDataUrl = (mediaType: string, bytes: Uint8Array) =>
  `data:${mediaType};base64,${Buffer.from(bytes).toString("base64")}`;

async function inlineAttachmentPart(
  part: UIMessage["parts"][number],
  context: AttachmentInlineContext
) {
  if (part.type !== "file") return part;
  if (!part.url || part.url.startsWith("data:")) return part;

  const resolved = new URL(part.url, context.baseUrl);
  const prefix = `/chats/${context.chatId}/attachments/`;
  if (!resolved.pathname.startsWith(prefix)) return part;

  const filename = path.basename(resolved.pathname);
  const filePath = getAttachmentPath({
    userId: context.userId,
    chatId: context.chatId,
    filename,
  });
  const bytes = await readFile(filePath);
  const mediaType = part.mediaType || "application/octet-stream";
  return { ...part, url: buildDataUrl(mediaType, bytes) };
}

export async function inlineAttachmentMessages(
  messages: UIMessage[],
  context: AttachmentInlineContext
) {
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== "user") return message;
      const parts = await Promise.all(
        message.parts.map(async (part) => {
          const next = await inlineAttachmentPart(part, context);
          return next;
        })
      );
      return { ...message, parts };
    })
  );
}
