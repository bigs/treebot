import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getApiKeysByUser } from "@/db/queries";
import { ChangePasswordForm } from "./change-password-form";
import { ApiKeyForm } from "@/app/onboarding/step-2/api-key-form";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const savedPlatforms = getApiKeysByUser(session.sub).map(
    (row) => row.platform
  );

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-12">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Change password</h2>
        <ChangePasswordForm />
      </section>

      {session.isAdmin && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">API keys</h2>
          <ApiKeyForm savedPlatforms={savedPlatforms} showContinue={false} />
        </section>
      )}
    </div>
  );
}
