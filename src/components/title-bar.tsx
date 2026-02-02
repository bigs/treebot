import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TitleBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b pb-2 pr-4 pl-[calc(env(safe-area-inset-left)+3.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] md:py-2 md:px-4",
        className
      )}
    >
      {children}
    </header>
  );
}
