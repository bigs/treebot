"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface SidebarContextValue {
  collapsed: boolean;
  toggleSidebar: () => void;
  expandedChats: Set<string>;
  toggleChat: (id: string) => void;
  expandChats: (ids: string[]) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleChat = useCallback((id: string) => {
    setExpandedChats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandChats = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setExpandedChats((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggleSidebar,
        expandedChats,
        toggleChat,
        expandChats,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
