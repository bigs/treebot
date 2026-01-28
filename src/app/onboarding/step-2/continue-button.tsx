"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ContinueButton() {
  const router = useRouter();

  return (
    <Button className="w-full" onClick={() => router.push("/")}>
      Continue
    </Button>
  );
}
