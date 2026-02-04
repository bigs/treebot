import { getSession } from "@/lib/auth";
import { getApiKeysByUser } from "@/db/queries";
import { ChangePasswordForm } from "./change-password-form";
import { ApiKeyForm } from "@/app/onboarding/step-2/api-key-form";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";
import { logout } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
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

      <section className="space-y-4 border-t pt-8">
        <h2 className="text-lg font-medium">Account</h2>
        <form action={logout}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </section>
    </div>
  );
}
