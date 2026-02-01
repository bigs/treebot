import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRecentChatsByWorkspace, getWorkspacesByUser } from "@/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewWorkspaceButton } from "@/components/workspaces/new-workspace-button";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
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
            <Card key={workspace.id} className="relative overflow-hidden">
              <Link
                href={`/ws/${workspace.id}`}
                className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open ${workspace.name}`}
              />
              <div className="pointer-events-none relative z-10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{workspace.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workspace.chats.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No conversations yet.
                    </p>
                  ) : (
                    workspace.chats.map((chat) => (
                      <div
                        key={chat.id}
                        className="pointer-events-auto rounded-md border bg-muted/60 transition hover:bg-muted"
                      >
                        <Link
                          href={`/ws/${workspace.id}/chats/${chat.id}`}
                          className="block px-3 py-2 text-sm font-medium"
                        >
                          {chat.title ?? "Untitled"}
                        </Link>
                      </div>
                    ))
                  )}
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
