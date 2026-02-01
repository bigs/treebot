import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspacesByUser } from "@/db/queries";
import { AppShell } from "@/components/sidebar/app-shell";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const workspaces = getWorkspacesByUser(session.sub);

  return (
    <AppShell
      username={session.username}
      chats={[]}
      workspaces={workspaces}
      activeWorkspaceId={null}
      showChats={false}
    >
      {children}
    </AppShell>
  );
}
