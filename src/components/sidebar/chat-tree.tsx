"use client";

import { ChevronRight, MessageSquare } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import type { ChatNode } from "@/lib/stub-chats";

function ChatTreeItem({ node, depth }: { node: ChatNode; depth: number }) {
  const { expandedChats, toggleChat } = useSidebar();
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedChats.has(node.id);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) toggleChat(node.id);
        }}
        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
        style={{ paddingLeft: `${(depth * 12 + 8).toString()}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={`size-4 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        ) : (
          <MessageSquare className="size-4 shrink-0" />
        )}
        <span className="truncate">{node.title}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children?.map((child) => (
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
