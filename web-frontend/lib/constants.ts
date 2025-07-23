import { Camera, Image as ImageIcon, Info, Zap, Users, Palette, Shield, Home } from 'lucide-react';
import type { Feature, Highlight, NavigationItem } from './types';

export const features: Feature[] = [
  {
    icon: Camera,
    title: 'AR Try-On',
    description: 'Experience virtual fashion fitting with cutting-edge AR technology',
    href: '/try-on',
    variant: 'default',
    badge: 'Featured',
    stats: '98% accuracy',
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    icon: ImageIcon,
    title: 'Fashion Gallery',
    description: 'Browse our curated collection of trending outfits and styles',
    href: '/gallery',
    variant: 'secondary',
    badge: 'Coming Soon',
    stats: '500+ items',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: Info,
    title: 'About Project',
    description: 'Learn about the technology and vision behind AR Fashion Try-On',
    href: '/about',
    variant: 'outline',
    stats: 'Open Source',
    gradient: 'from-green-500 to-emerald-600',
  },
];

export const highlights: Highlight[] = [
  { icon: Zap, label: 'Lightning Fast', description: 'Real-time processing' },
  { icon: Users, label: '10K+ Users', description: 'Growing community' },
  { icon: Palette, label: 'Smart Styling', description: 'AI-powered recommendations' },
  { icon: Shield, label: 'Privacy First', description: 'Your data stays secure' },
];

export const navigationItems: NavigationItem[] = [
  {
    title: 'Home',
    href: '/',
    description: 'Welcome to AR Fashion Try-On',
    icon: Home,
  },
  {
    title: 'Try-On Studio',
    href: '/try-on',
    description: 'Virtual fitting with AR technology',
    icon: Camera,
    badge: 'New',
  },
  {
    title: 'Gallery',
    href: '/gallery',
    description: 'Browse fashion collections',
    icon: ImageIcon,
  },
  {
    title: 'About',
    href: '/about',
    description: 'Learn more about the project',
    icon: Info,
  },
];

export const performanceOptions = [
  { value: 'high', label: 'High Quality', description: 'Best visual quality, higher CPU usage' },
  { value: 'balanced', label: 'Balanced', description: 'Good quality with optimal performance' },
  { value: 'performance', label: 'Performance', description: 'Prioritize speed over quality' },
];

export const languageOptions = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
];
