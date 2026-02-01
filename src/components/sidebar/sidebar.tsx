"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeft, SquarePen, Settings, X } from "lucide-react";
import type { ChatNode } from "@/lib/chat-tree";
import { useSidebar } from "./sidebar-context";
import { ChatTree } from "./chat-tree";
import { cn } from "@/lib/utils";
import { getWorkspaceChatTreeAction } from "@/lib/actions/sidebar-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Sidebar({
  username,
  chats,
  workspaces,
  activeWorkspaceId,
  showChats,
}: {
  username: string;
  chats: ChatNode[];
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string | null;
  showChats: boolean;
}) {
  const { collapsed, toggleSidebar, mobileOpen, openMobile, closeMobile } =
    useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const derivedWorkspaceId = pathname.match(/^\/ws\/([^/]+)/)?.[1] ?? null;
  const currentWorkspaceId = derivedWorkspaceId ?? activeWorkspaceId ?? null;
  const shouldShowChats = showChats || Boolean(derivedWorkspaceId);
  const [chatNodes, setChatNodes] = useState(chats);
  const visibleChatNodes = currentWorkspaceId ? chatNodes : [];
  const refreshWorkspaceChats = useCallback(
    (workspaceId: string | null = currentWorkspaceId) => {
      void (async () => {
        if (!workspaceId) {
          setChatNodes([]);
          return;
        }
        const result = await getWorkspaceChatTreeAction(workspaceId);
        setChatNodes(result.chats);
      })();
    },
    [currentWorkspaceId]
  );

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const cancelledRef = { current: false };
    void (async () => {
      const result = await getWorkspaceChatTreeAction(currentWorkspaceId);
      if (cancelledRef.current) return;
      setChatNodes(result.chats);
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [currentWorkspaceId, pathname]);

  return (
    <>
      <button
        type="button"
        onClick={openMobile}
        className={cn(
          "bg-background text-foreground border-border fixed left-[calc(env(safe-area-inset-left)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 inline-flex size-9 items-center justify-center rounded-md border shadow-sm md:hidden",
          mobileOpen && "pointer-events-none opacity-0"
        )}
        aria-label="Open sidebar"
      >
        <PanelLeft className="size-4" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-[width,transform] duration-200",
          "w-64",
          collapsed ? "md:w-12" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Top bar */}
        <div className="flex h-12 shrink-0 items-center gap-1 px-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hidden rounded-md p-1.5 md:inline-flex"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={closeMobile}
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md p-1.5 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
          <Link
            href={
              currentWorkspaceId
                ? `/ws/${currentWorkspaceId}/chats/new`
                : "/home"
            }
            className={cn(
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-auto rounded-md p-1.5",
              collapsed || !shouldShowChats ? "md:hidden" : "",
              !shouldShowChats ? "hidden" : ""
            )}
            aria-label="New chat"
            onClick={closeMobile}
          >
            <SquarePen className="size-5" />
          </Link>
        </div>

        <div
          className={cn(
            "space-y-2 px-2 pt-2",
            collapsed ? "md:hidden" : "",
            workspaces.length === 0 ? "hidden" : ""
          )}
        >
          <Link
            href="/home"
            className="bg-foreground text-background hover:bg-foreground/90 flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition"
            onClick={closeMobile}
          >
            Home
          </Link>
          <Select
            value={currentWorkspaceId ?? undefined}
            onValueChange={(value) => {
              router.push(`/ws/${value}`);
              closeMobile();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent align="start">
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat tree */}
        {shouldShowChats && (
          <div
            className={cn(
              "flex-1 overflow-y-auto px-2 py-1",
              collapsed ? "md:hidden" : ""
            )}
          >
            <ChatTree
              nodes={visibleChatNodes}
              workspaceId={currentWorkspaceId}
              workspaces={workspaces}
              onRefresh={refreshWorkspaceChats}
            />
          </div>
        )}

        {/* Bottom bar */}
        <div className="border-sidebar-border flex h-12 shrink-0 items-center gap-2 border-t px-2">
          <span
            className={cn(
              "text-sidebar-foreground truncate text-sm font-medium",
              collapsed ? "md:hidden" : ""
            )}
          >
            {username}
          </span>
          <Link
            href="/settings"
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-auto rounded-md p-1.5"
            aria-label="Settings"
            onClick={closeMobile}
          >
            <Settings className="size-5" />
          </Link>
        </div>
      </aside>
    </>
  );
}
