import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getApiKeysByUser } from "@/db/queries";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
  }

  if (session.isAdmin && getApiKeysByUser(session.sub).length === 0) {
    redirect("/onboarding/step-2");
  }

  return children;
}
