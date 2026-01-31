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
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
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
        mobileOpen,
        openMobile,
        closeMobile,
        expandedChats,
        toggleChat,
        expandChats,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
