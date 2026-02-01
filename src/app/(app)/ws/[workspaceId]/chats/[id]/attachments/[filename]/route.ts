import { readFile } from "fs/promises";
import { getSession } from "@/lib/auth";
import { getChatByIdInWorkspace } from "@/db/queries";
import { getAttachmentPath } from "@/lib/attachments/storage";
import { getMimeTypeForFilename } from "@/lib/attachments/mime-types";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; workspaceId: string; filename: string }> }
) {
  const { id: chatId, workspaceId, filename } = await params;

  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = getChatByIdInWorkspace(chatId, workspaceId, session.sub);
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

  const contentType = getMimeTypeForFilename(filename);
  const body = new Blob([Buffer.from(data)]);

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename=\"${filename}\"`,
    },
  });
}
