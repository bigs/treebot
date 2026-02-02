import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspacesByUser } from "@/db/queries";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";

export default async function LegacyNewChatPage() {
  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
  }

  const workspaces = getWorkspacesByUser(session.sub);
  if (workspaces.length === 0) {
    redirect("/home");
  }

  redirect(`/ws/${workspaces[0].id}/chats/new`);
}
