import { getSession } from "@/lib/auth";
import { getChatsByWorkspace, getWorkspacesByUser } from "@/db/queries";
import { buildChatTree } from "@/lib/chat-tree";
import { AppShell } from "@/components/sidebar/app-shell";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
  }

  const workspaces = getWorkspacesByUser(session.sub);
  const rows = getChatsByWorkspace(session.sub, workspaceId);
  const chats = buildChatTree(rows);

  return (
    <AppShell
      username={session.username}
      chats={chats}
      workspaces={workspaces}
      activeWorkspaceId={workspaceId}
      showChats
    >
      {children}
    </AppShell>
  );
}
