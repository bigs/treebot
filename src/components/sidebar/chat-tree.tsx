"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Ellipsis,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { deleteChatAction, renameChatAction } from "@/lib/actions/chat-actions";
import { moveChatToWorkspaceAction } from "@/lib/actions/workspace-actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ChatNode } from "@/lib/chat-tree";
import { cn } from "@/lib/utils";

function ChatTreeItem({
  node,
  depth,
  workspaceId,
  workspaces,
}: {
  node: ChatNode;
  depth: number;
  workspaceId: string;
  workspaces: { id: string; name: string }[];
}) {
  const { expandedChats, toggleChat, closeMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedChats.has(node.id);
  const isActive = pathname === `/ws/${workspaceId}/chats/${node.id}`;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(node.title);
  const [moveOpen, setMoveOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );
  const moveInputRef = useRef<HTMLInputElement>(null);
  const activeChatIdMatch = pathname.match(/^\/ws\/[^/]+\/chats\/([^/]+)/);
  const activeChatId = activeChatIdMatch ? activeChatIdMatch[1] : null;
  const selectedWorkspace = selectedWorkspaceId
    ? workspaces.find((workspace) => workspace.id === selectedWorkspaceId)
    : null;

  function collectIds(n: ChatNode): string[] {
    return [n.id, ...n.children.flatMap(collectIds)];
  }

  async function handleDelete() {
    const idsToDelete = new Set(collectIds(node));
    const isViewingDeleted =
      activeChatId != null && idsToDelete.has(activeChatId);

    await deleteChatAction({ chatId: node.id, workspaceId });

    if (isViewingDeleted) {
      router.push(`/ws/${workspaceId}/chats/new`);
    }
  }

  useEffect(() => {
    if (!renameOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state when dialog opens
    setRenameValue(node.title);
  }, [node.title, renameOpen]);

  const handleMoveOpenChange = (nextOpen: boolean) => {
    setMoveOpen(nextOpen);
    if (!nextOpen) return;
    setComboboxOpen(true);
    setSelectedWorkspaceId(null);
    window.setTimeout(() => {
      moveInputRef.current?.focus();
    }, 0);
  };

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    if (trimmed === node.title) {
      setRenameOpen(false);
      return;
    }
    const result = await renameChatAction(node.id, trimmed, workspaceId);
    if (!("error" in result)) {
      router.refresh();
    }
    setRenameOpen(false);
  }

  async function handleMove(targetWorkspaceId?: string) {
    const destinationId = targetWorkspaceId ?? selectedWorkspaceId;
    if (!destinationId || destinationId === workspaceId) return;
    const result = await moveChatToWorkspaceAction({
      chatId: node.id,
      fromWorkspaceId: workspaceId,
      toWorkspaceId: destinationId,
    });
    if (!("error" in result)) {
      const idsToMove = new Set(collectIds(node));
      setMoveOpen(false);
      setComboboxOpen(false);
      setSelectedWorkspaceId(null);
      if (activeChatId && idsToMove.has(activeChatId)) {
        router.push(`/ws/${destinationId}/chats/${activeChatId}`);
        closeMobile();
      } else {
        router.refresh();
      }
    }
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
            href={`/ws/${workspaceId}/chats/${node.id}`}
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
                handleMoveOpenChange(true);
              }}
            >
              <ArrowRightLeft className="size-4" />
              Move
            </DropdownMenuItem>
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

      <Dialog open={moveOpen} onOpenChange={handleMoveOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move chat</DialogTitle>
            <DialogDescription>
              Choose a workspace for this chat and its branches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  <span className="truncate">
                    {selectedWorkspace
                      ? selectedWorkspace.name
                      : "Select workspace"}
                  </span>
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-full p-0">
                <Command>
                  <CommandInput
                    ref={moveInputRef}
                    placeholder="Search workspace..."
                  />
                  <CommandList>
                    <CommandEmpty>No workspaces found.</CommandEmpty>
                    <CommandGroup>
                      {workspaces.map((workspace) => (
                        <CommandItem
                          key={workspace.id}
                          value={workspace.name}
                          disabled={workspace.id === workspaceId}
                          onSelect={() => {
                            if (workspace.id === workspaceId) return;
                            setSelectedWorkspaceId(workspace.id);
                            setComboboxOpen(false);
                            void handleMove(workspace.id);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              selectedWorkspaceId === workspace.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="truncate">{workspace.name}</span>
                          {workspace.id === workspaceId ? (
                            <span className="text-muted-foreground ml-auto text-xs">
                              Current
                            </span>
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMoveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleMove()}
              disabled={
                !selectedWorkspaceId || selectedWorkspaceId === workspaceId
              }
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <ChatTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              workspaceId={workspaceId}
              workspaces={workspaces}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatTree({
  nodes,
  workspaceId,
  workspaces,
}: {
  nodes: ChatNode[];
  workspaceId: string | null;
  workspaces: { id: string; name: string }[];
}) {
  const { expandChats } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    if (!workspaceId) return;
    const match = pathname.match(/^\/ws\/[^/]+\/chats\/([^/]+)/);
    const activeId = match ? match[1] : null;
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
  }, [expandChats, nodes, pathname, workspaceId]);

  if (!workspaceId) return null;

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <ChatTreeItem
          key={node.id}
          node={node}
          depth={0}
          workspaceId={workspaceId}
          workspaces={workspaces}
        />
      ))}
    </div>
  );
}
