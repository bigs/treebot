"use client";

import type { ReactNode } from "react";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";

function ShellContent({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <>
      <Sidebar username={username} />
      <main
        className="min-h-screen transition-[margin-left] duration-200"
        style={{ marginLeft: collapsed ? "3rem" : "16rem" }}
      >
        {children}
      </main>
    </>
  );
}

export function AppShell({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <ShellContent username={username}>{children}</ShellContent>
    </SidebarProvider>
  );
}
