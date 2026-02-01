import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getApiKeysByUser, getChatsByWorkspace, getWorkspacesByUser } from "@/db/queries";
import { buildChatTree } from "@/lib/chat-tree";
import { AppShell } from "@/components/sidebar/app-shell";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId?: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.isAdmin && getApiKeysByUser(session.sub).length === 0) {
    redirect("/onboarding/step-2");
  }

  const workspaces = getWorkspacesByUser(session.sub);
  const activeWorkspaceId = workspaceId ?? null;
  const rows = activeWorkspaceId
    ? getChatsByWorkspace(session.sub, activeWorkspaceId)
    : [];
  const chats = buildChatTree(rows);

  return (
    <AppShell
      username={session.username}
      chats={chats}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      showChats={Boolean(activeWorkspaceId)}
    >
      {children}
    </AppShell>
  );
}
