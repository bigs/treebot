import { getSession } from "@/lib/auth";
import { getRecentChatsByWorkspace, getWorkspacesByUser } from "@/db/queries";
import { NewWorkspaceButton } from "@/components/workspaces/new-workspace-button";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
  }

  const workspaces = getWorkspacesByUser(session.sub).map((workspace) => ({
    ...workspace,
    chats: getRecentChatsByWorkspace(session.sub, workspace.id),
  }));

  return (
    <div className="min-h-screen px-6 pb-12 pt-10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Workspaces</h1>
        <NewWorkspaceButton />
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {workspaces.length === 0 ? (
          <div className="text-muted-foreground col-span-full text-center text-sm">
            No workspaces yet. Create your first workspace to get started.
          </div>
        ) : (
          workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={{ id: workspace.id, name: workspace.name }}
              chats={workspace.chats}
            />
          ))
        )}
      </div>
    </div>
  );
}
