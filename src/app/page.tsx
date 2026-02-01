import { redirect } from "next/navigation";
import { getApiKeysByUser, getUserCount } from "@/db/queries";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const userCount = getUserCount();
  if (userCount === 0) {
    redirect("/onboarding");
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.isAdmin && getApiKeysByUser(session.sub).length === 0) {
    redirect("/onboarding/step-2");
  }

  redirect("/home");
}
