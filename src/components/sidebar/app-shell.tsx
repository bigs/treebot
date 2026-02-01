"use client";

import type { ReactNode } from "react";
import type { ChatNode } from "@/lib/chat-tree";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { WorkspaceCommandMenu } from "@/components/workspaces/workspace-command-menu";

function ShellContent({
  username,
  chats,
  workspaces,
  activeWorkspaceId,
  showChats,
  children,
}: {
  username: string;
  chats: ChatNode[];
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string | null;
  showChats: boolean;
  children: ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <>
      <Sidebar
        username={username}
        chats={chats}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        showChats={showChats}
      />
      <WorkspaceCommandMenu workspaces={workspaces} chats={chats} />
      <main
        className={cn(
          "min-h-screen transition-[margin-left] duration-200",
          collapsed ? "md:ml-12" : "md:ml-64"
        )}
      >
        {children}
      </main>
    </>
  );
}

export function AppShell({
  username,
  chats,
  workspaces,
  activeWorkspaceId,
  showChats,
  children,
}: {
  username: string;
  chats: ChatNode[];
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string | null;
  showChats: boolean;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <ShellContent
        username={username}
        chats={chats}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        showChats={showChats}
      >
        {children}
      </ShellContent>
    </SidebarProvider>
  );
}
