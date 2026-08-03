import { create } from 'zustand';

interface LayoutState {
  sidebarCollapsed: boolean;
  isMobile: boolean;
  activeSection: string;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setActiveSection: (section: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  isMobile: false,
  activeSection: 'hero',
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setActiveSection: (section) => set({ activeSection: section }),
}));
