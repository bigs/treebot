import { getSession } from "@/lib/auth";
import { getRecentChatsByWorkspace, getWorkspacesByUser } from "@/db/queries";
import { NewWorkspaceButton } from "@/components/workspaces/new-workspace-button";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";
import { TitleBar } from "@/components/title-bar";
import { Plus } from "lucide-react";

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
    <div className="min-h-screen">
      <TitleBar>
        <div className="flex w-full items-center gap-2">
          <h1 className="text-base font-semibold tracking-tight">Workspaces</h1>
          <NewWorkspaceButton
            variant="ghost"
            size="icon-sm"
            ariaLabel="New workspace"
          >
            <Plus className="size-4" />
          </NewWorkspaceButton>
        </div>
      </TitleBar>

      <div className="px-6 pb-12 pt-8">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
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
    </div>
  );
}
