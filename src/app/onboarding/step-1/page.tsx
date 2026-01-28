import { redirect } from "next/navigation";
import { getUserCount } from "@/db/queries";
import { CreateAdminForm } from "./create-admin-form";

export default function OnboardingStep1() {
  const count = getUserCount();
  if (count > 0) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Create the admin account to get started.
      </p>
      <CreateAdminForm />
    </div>
  );
}
