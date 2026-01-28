"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Ellipsis, MessageSquare, Trash2 } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { deleteChatAction } from "@/lib/actions/chat-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ChatNode } from "@/lib/chat-tree";

function ChatTreeItem({ node, depth }: { node: ChatNode; depth: number }) {
  const { expandedChats, toggleChat } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedChats.has(node.id);
  const isActive = pathname === `/chats/${node.id}`;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  function collectIds(n: ChatNode): string[] {
    return [n.id, ...n.children.flatMap(collectIds)];
  }

  async function handleDelete() {
    const idsToDelete = new Set(collectIds(node));
    const isViewingDeleted =
      pathname.startsWith("/chats/") &&
      idsToDelete.has(pathname.split("/chats/")[1]);

    await deleteChatAction(node.id);

    if (isViewingDeleted) {
      router.push("/chats/new");
    }
  }

  return (
    <div className="group/item relative">
      <Link
        href={`/chats/${node.id}`}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            toggleChat(node.id);
          }
        }}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-left text-sm ${isActive ? "bg-black/6 font-medium dark:bg-white/8" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
        style={{ paddingLeft: `${String(depth * 12 + 8)}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={`size-4 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        ) : (
          <MessageSquare className="size-4 shrink-0" />
        )}
        <span className="truncate">{node.title}</span>
      </Link>

      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={`absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1 opacity-0 transition-opacity hover:bg-black/6 group-hover/item:opacity-100 dark:hover:bg-white/8 ${dropdownOpen ? "opacity-100" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Ellipsis className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setAlertOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its branches. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <ChatTreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatTree({ nodes }: { nodes: ChatNode[] }) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <ChatTreeItem key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
