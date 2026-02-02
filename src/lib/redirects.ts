import { redirect } from "next/navigation";
import { getUserCount } from "@/db/queries";

export function redirectToLoginOrOnboarding(): never {
  if (getUserCount() === 0) {
    redirect("/onboarding");
  }

  redirect("/login");
}
