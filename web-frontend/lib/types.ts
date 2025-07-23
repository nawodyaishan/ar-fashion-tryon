export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  variant: 'default' | 'secondary' | 'outline';
  badge?: string;
  stats: string;
  gradient: string;
}

export interface Highlight {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

export interface NavigationItem {
  title: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}
