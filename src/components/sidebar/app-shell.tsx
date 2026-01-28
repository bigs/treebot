"use client";

import type { ReactNode } from "react";
import type { ChatNode } from "@/lib/chat-tree";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";

function ShellContent({
  username,
  chats,
  children,
}: {
  username: string;
  chats: ChatNode[];
  children: ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <>
      <Sidebar username={username} chats={chats} />
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
  chats,
  children,
}: {
  username: string;
  chats: ChatNode[];
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <ShellContent username={username} chats={chats}>
        {children}
      </ShellContent>
    </SidebarProvider>
  );
}
