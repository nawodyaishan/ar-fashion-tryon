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

export interface Garment {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  sizeKb: number;
  category?: 'tops' | 'jackets' | 'misc';
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  lockAspect: boolean;
}

export type PoseConfidence = 'Low' | 'Okay' | 'Good';

export interface Status {
  fps?: number;
  processing?: boolean;
  message?: string;
}
