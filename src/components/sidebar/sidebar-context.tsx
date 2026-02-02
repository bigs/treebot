"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobile: () => void;
  openMobile: () => void;
  expandedChats: Set<string>;
  toggleChat: (id: string) => void;
  expandChats: (ids: string[]) => void;
}

export const SIDEBAR_MOBILE_TOGGLE_ID = "sidebar-mobile-toggle";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileOpen(false);
      }
    };
    if (media.matches) {
      setMobileOpen(false);
    }
    if ("addEventListener" in media) {
      media.addEventListener("change", handleChange);
      return () => {
        media.removeEventListener("change", handleChange);
      };
    }
    media.addListener(handleChange);
    return () => {
      media.removeListener(handleChange);
    };
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
        mobileOpen,
        toggleSidebar,
        closeMobile,
        openMobile,
        expandedChats,
        toggleChat,
        expandChats,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
