import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMostRecentChatByWorkspace, getWorkspaceById } from "@/db/queries";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
  }

  const workspace = getWorkspaceById(workspaceId, session.sub);
  if (!workspace) {
    notFound();
  }

  const recentChat = getMostRecentChatByWorkspace(session.sub, workspaceId);
  if (recentChat) {
    redirect(`/ws/${workspaceId}/chats/${recentChat.id}`);
  }

  redirect(`/ws/${workspaceId}/chats/new`);
}
