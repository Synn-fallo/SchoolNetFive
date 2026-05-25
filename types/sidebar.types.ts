export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  href: string;
  badge?: number;
  roles?: string[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
  roles?: string[];
}

export interface SidebarState {
  isOpen: boolean;
  isMobile: boolean;
  isLoading: boolean;
}