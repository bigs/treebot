import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspaceIdForChat } from "@/db/queries";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";

export default async function LegacyChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
  }

  const record = getWorkspaceIdForChat(id, session.sub);
  if (!record) {
    notFound();
  }

  redirect(`/ws/${record.workspaceId}/chats/${id}`);
}
