import { redirect } from "next/navigation";
import { getUserCount } from "@/db/queries";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const userCount = getUserCount();
  if (userCount === 0) {
    redirect("/onboarding");
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Welcome, {session.username}</h1>
        <p className="text-muted-foreground">Treebot is ready.</p>
        <form action={logout}>
          <Button variant="outline">Sign Out</Button>
        </form>
      </div>
    </div>
  );
}
