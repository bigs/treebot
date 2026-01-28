import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ContinueButton } from "./continue-button";

export default async function OnboardingStep2() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Configure your API keys for AI providers. You can set these in your{" "}
        <code className="bg-muted rounded px-1 py-0.5 text-xs">.env.local</code>{" "}
        file.
      </p>
      <div className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
        API key configuration coming soon.
      </div>
      <ContinueButton />
    </div>
  );
}
