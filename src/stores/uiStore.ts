import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  notificationCount: number;
  currentPageTitle: string;
  isOnline: boolean;
  toast: { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setNotificationCount: (count: number) => void;
  setCurrentPageTitle: (title: string) => void;
  setIsOnline: (online: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  notificationCount: 0,
  currentPageTitle: '',
  isOnline: navigator.onLine,
  toast: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set({ mobileMenuOpen: !get().mobileMenuOpen }),
  setNotificationCount: (count) => set({ notificationCount: count }),
  setCurrentPageTitle: (title) => set({ currentPageTitle: title }),
  setIsOnline: (online) => set({ isOnline: online }),
  showToast: (message, type) => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 4000);
  },
  clearToast: () => set({ toast: null }),
}));

// Listen for online/offline events
window.addEventListener('online', () => useUIStore.getState().setIsOnline(true));
window.addEventListener('offline', () => useUIStore.getState().setIsOnline(false));
