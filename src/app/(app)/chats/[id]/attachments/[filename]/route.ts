import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { getChatById } from "@/db/queries";
import { getAttachmentPath } from "@/lib/attachments/storage";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".mpga": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".flv": "video/x-flv",
  ".wmv": "video/x-ms-wmv",
  ".3gp": "video/3gpp",
  ".3gpp": "video/3gpp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id: chatId, filename } = await params;

  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = getChatById(chatId, session.sub);
  if (!chat) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = getAttachmentPath({
    userId: session.sub,
    chatId,
    filename,
  });

  let data: Uint8Array;
  try {
    data = await readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_BY_EXTENSION[ext] ?? "application/octet-stream";

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename=\"${filename}\"`,
    },
  });
}
