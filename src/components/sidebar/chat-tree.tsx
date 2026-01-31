"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Ellipsis,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { deleteChatAction, renameChatAction } from "@/lib/actions/chat-actions";
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
import { Input } from "@/components/ui/input";
import type { ChatNode } from "@/lib/chat-tree";

function ChatTreeItem({ node, depth }: { node: ChatNode; depth: number }) {
  const { expandedChats, toggleChat, closeMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedChats.has(node.id);
  const isActive = pathname === `/chats/${node.id}`;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(node.title);

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

  useEffect(() => {
    if (!renameOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state when dialog opens
    setRenameValue(node.title);
  }, [node.title, renameOpen]);

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    if (trimmed === node.title) {
      setRenameOpen(false);
      return;
    }
    const result = await renameChatAction(node.id, trimmed);
    if (!("error" in result)) {
      router.refresh();
    }
    setRenameOpen(false);
  }

  return (
    <div>
      <div className="group relative">
        <div
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-left text-sm ${isActive ? "bg-black/6 font-medium dark:bg-white/8" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
          style={{ paddingLeft: `${String(depth * 12 + 8)}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
              className="text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleChat(node.id);
              }}
            >
              <ChevronRight
                className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : null}
          <Link
            href={`/chats/${node.id}`}
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={closeMobile}
          >
            {!hasChildren ? (
              <MessageSquare className="size-4 shrink-0" />
            ) : null}
            <span className="truncate">{node.title}</span>
          </Link>
        </div>

        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={`absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/6 dark:hover:bg-white/8 ${dropdownOpen ? "opacity-100" : ""}`}
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
              onClick={() => {
                setDropdownOpen(false);
                setRenameOpen(true);
              }}
            >
              <Pencil className="size-4" />
              Rename
            </DropdownMenuItem>
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
      </div>

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

      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename chat</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a new name for this chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRename();
                }
              }}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRename()}>
              Save
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
  const { expandChats } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/chats/")) return;
    const activeId = pathname.split("/chats/")[1];
    if (!activeId) return;

    function findPath(current: ChatNode, targetId: string): string[] | null {
      if (current.id === targetId) return [current.id];
      for (const child of current.children) {
        const childPath = findPath(child, targetId);
        if (childPath) return [current.id, ...childPath];
      }
      return null;
    }

    let path: string[] | null = null;
    for (const node of nodes) {
      path = findPath(node, activeId);
      if (path) break;
    }
    if (!path || path.length === 0) return;
    const idsToExpand = new Set(path.slice(0, -1));
    if (path.length > 0) {
      idsToExpand.add(path[path.length - 1]);
    }
    expandChats([...idsToExpand]);
  }, [expandChats, nodes, pathname]);

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <ChatTreeItem key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
