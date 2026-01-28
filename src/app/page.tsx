import { redirect } from "next/navigation";
import { getUserCount } from "@/db/queries";
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

  redirect("/home");
}
