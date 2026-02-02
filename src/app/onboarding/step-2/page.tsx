import { getSession } from "@/lib/auth";
import { getApiKeysByUser } from "@/db/queries";
import { ApiKeyForm } from "./api-key-form";
import { redirectToLoginOrOnboarding } from "@/lib/redirects";

export default async function OnboardingStep2() {
  const session = await getSession();
  if (!session) {
    redirectToLoginOrOnboarding();
  }

  const savedKeys = getApiKeysByUser(session.sub);
  const savedPlatforms = savedKeys.map((k) => k.platform);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Add API keys for the AI providers you want to use. At least one key is
        required.
      </p>
      <ApiKeyForm savedPlatforms={savedPlatforms} />
    </div>
  );
}
