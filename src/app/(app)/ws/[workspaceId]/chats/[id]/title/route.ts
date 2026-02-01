import { getSession } from "@/lib/auth";
import { getChatTitleByIdInWorkspace } from "@/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; workspaceId: string }> }
) {
  const { id: chatId, workspaceId } = await params;

  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = getChatTitleByIdInWorkspace(chatId, workspaceId, session.sub);
  if (!chat) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ title: chat.title, updatedAt: chat.updatedAt });
}
