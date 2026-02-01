"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const ONBOARDING_STEP_2 = "/onboarding/step-2";

export function AdminApiKeyGuard({ active }: { active: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!active || !pathname) return;
    if (
      pathname === ONBOARDING_STEP_2 ||
      pathname.startsWith(`${ONBOARDING_STEP_2}/`)
    ) {
      return;
    }

    router.replace(ONBOARDING_STEP_2);
  }, [active, pathname, router]);

  return null;
}
