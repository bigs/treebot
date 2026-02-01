import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getApiKeysByUser, getChatsByUser } from "@/db/queries";
import { buildChatTree } from "@/lib/chat-tree";
import { AppShell } from "@/components/sidebar/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.isAdmin && getApiKeysByUser(session.sub).length === 0) {
    redirect("/onboarding/step-2");
  }

  const rows = getChatsByUser(session.sub);
  const chats = buildChatTree(rows);

  return (
    <AppShell username={session.username} chats={chats}>
      {children}
    </AppShell>
  );
}
