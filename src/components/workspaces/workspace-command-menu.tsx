"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ChatNode } from "@/lib/chat-tree";
import { getWorkspaceChatTreeAction } from "@/lib/actions/sidebar-actions";

type Workspace = {
  id: string;
  name: string;
};

export function WorkspaceCommandMenu({
  workspaces,
  chats,
}: {
  workspaces: Workspace[];
  chats: ChatNode[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatState, setChatState] = useState<{
    workspaceId: string;
    nodes: ChatNode[];
  } | null>(null);
  const enabled = pathname === "/home" || pathname.startsWith("/ws/");
  const workspaceMatch = pathname.match(/^\/ws\/([^/]+)/);
  const currentWorkspaceId = workspaceMatch ? workspaceMatch[1] : null;
  const canCreateChat = currentWorkspaceId != null;
  const activeChatMatch = pathname.match(/^\/ws\/[^/]+\/chats\/([^/]+)/);
  const activeChatId = activeChatMatch ? activeChatMatch[1] : null;
  const sortedWorkspaces = useMemo(
    () =>
      [...workspaces].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [workspaces]
  );
  const resolvedChatNodes =
    currentWorkspaceId && chatState?.workspaceId === currentWorkspaceId
      ? chatState.nodes
      : chats;
  const flattenedChats = useMemo(() => {
    const result: Array<{ id: string; title: string; depth: number }> = [];
    const visit = (node: ChatNode, depth: number) => {
      result.push({ id: node.id, title: node.title, depth });
      for (const child of node.children) {
        visit(child, depth + 1);
      }
    };
    for (const node of resolvedChatNodes) {
      visit(node, 0);
    }
    return result;
  }, [resolvedChatNodes]);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (event.shiftKey) return;
      if (!event.metaKey && !event.ctrlKey) return;

      event.preventDefault();
      setChatOpen(false);
      setOpen((prev) => !prev);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  useEffect(() => {
    if (!canCreateChat) return;

    const workspaceId = currentWorkspaceId;
    if (!workspaceId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "o") return;
      if (!event.shiftKey) return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.repeat) return;

      event.preventDefault();
      router.push(`/ws/${workspaceId}/chats/new`);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canCreateChat, currentWorkspaceId, router]);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.shiftKey) return;
      if (!event.metaKey && !event.ctrlKey) return;

      event.preventDefault();
      setOpen(false);
      setChatOpen((prev) => !prev);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (!chatOpen || !currentWorkspaceId) return;
    const workspaceId = currentWorkspaceId;
    const cancelledRef = { current: false };

    void (async () => {
      const result = await getWorkspaceChatTreeAction(workspaceId);
      if (cancelledRef.current) return;
      setChatState({ workspaceId, nodes: result.chats });
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [chatOpen, currentWorkspaceId]);

  if (!enabled) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="sr-only">Choose a workspace</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Choose a workspace..." autoFocus />
            <CommandList>
              <CommandEmpty>No workspaces found.</CommandEmpty>
              <CommandGroup heading="Workspaces">
                {sortedWorkspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    value={workspace.name}
                    onSelect={() => {
                      setOpen(false);
                      router.push(`/ws/${workspace.id}`);
                    }}
                  >
                    {workspace.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="sr-only">Choose a chat</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Choose a chat..." autoFocus />
            <CommandList>
              <CommandEmpty>No chats found.</CommandEmpty>
              <CommandGroup heading="Chats">
                {flattenedChats.map((chat) => (
                  <CommandItem
                    key={chat.id}
                    value={chat.title}
                    onSelect={() => {
                      if (!currentWorkspaceId) return;
                      setChatOpen(false);
                      router.push(`/ws/${currentWorkspaceId}/chats/${chat.id}`);
                    }}
                    style={{ paddingLeft: `${String(chat.depth * 12 + 8)}px` }}
                  >
                    <span className="truncate">{chat.title}</span>
                    {activeChatId === chat.id ? (
                      <span className="text-muted-foreground ml-auto text-xs">
                        Current
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
