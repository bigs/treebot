import { getModels } from "@/lib/models";
import { NewChatForm } from "./new-chat-form";
import { getSession } from "@/lib/auth";
import { getApiKeysByUser } from "@/db/queries";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NewChatPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const allModels = await getModels();
  const userApiKeys = getApiKeysByUser(session.sub);

  const activePlatforms = new Set(userApiKeys.map((k) => k.platform));
  const availableModels = allModels.filter((m) =>
    activePlatforms.has(m.provider)
  );

  if (availableModels.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">No API keys configured</h1>
          <p className="text-muted-foreground max-w-md">
            You need to add at least one API key in your settings to start a new
            chat.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <NewChatForm models={availableModels} />
    </div>
  );
}
