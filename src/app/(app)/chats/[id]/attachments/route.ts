import { getSession } from "@/lib/auth";
import { getChatById } from "@/db/queries";
import { storeAttachment } from "@/lib/attachments/storage";
import type { Platform } from "@/db/schema";
import type { UploadResponse } from "@/lib/attachments/types";

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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new Response("Invalid file upload", { status: 400 });
  }

  const mediaType = file.type || "application/octet-stream";
  const buffer = new Uint8Array(await file.arrayBuffer());
  const stored = await storeAttachment({
    platform: chat.provider as Platform,
    userId: session.sub,
    chatId,
    filename: file.name,
    mediaType,
    bytes: buffer,
  });

  if (!stored.ok) {
    return new Response(stored.error, { status: 400 });
  }

  return Response.json({
    filename: stored.attachment.filename,
    originalName: file.name,
    mediaType: stored.attachment.mediaType,
    size: stored.attachment.size,
    url: stored.attachment.urlPath,
  } satisfies UploadResponse);
}
