"use client";

import Link from "next/link";
import { PanelLeft, SquarePen, Settings } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { ChatTree } from "./chat-tree";
import { getStubChats } from "@/lib/stub-chats";

const stubChats = getStubChats();

export function Sidebar({ username }: { username: string }) {
  const { collapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={`bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-[width] duration-200 ${collapsed ? "w-12" : "w-64"}`}
    >
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center gap-1 px-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md p-1.5"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-5" />
        </button>
        {!collapsed && (
          <button
            type="button"
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-auto rounded-md p-1.5"
            aria-label="New chat"
          >
            <SquarePen className="size-5" />
          </button>
        )}
      </div>

      {/* Chat tree */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <ChatTree nodes={stubChats} />
        </div>
      )}

      {/* Bottom bar */}
      <div className="border-sidebar-border flex h-12 shrink-0 items-center gap-2 border-t px-2">
        {!collapsed && (
          <span className="text-sidebar-foreground truncate text-sm font-medium">
            {username}
          </span>
        )}
        <Link
          href="/settings"
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-auto rounded-md p-1.5"
          aria-label="Settings"
        >
          <Settings className="size-5" />
        </Link>
      </div>
    </aside>
  );
}
