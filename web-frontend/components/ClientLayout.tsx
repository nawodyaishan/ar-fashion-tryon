'use client';
import { ThemeProvider } from '@/components/theme-provider';
import NavBar from '@/components/NavBar';
import StatusFooter from '@/components/StatusFooter';
import HelpModal from '@/components/tryon/HelpModal';
import AboutModal from '@/components/tryon/AboutModal';
import AROnboardingModal from '@/components/tryon/AROnboardingModal';
import PhotoOnboardingModal from '@/components/tryon/PhotoOnboardingModal';
import { NavigationLoader } from '@/components/NavigationLoader';
import { Toaster } from '@/components/ui/sonner';
import { useMount } from '@/lib/hooks/useMount';
import { AnimatePresence } from 'framer-motion';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const mounted = useMount();

  if (!mounted) return null;
  return (
    <div className="min-h-screen relative">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NavigationLoader />
        <NavBar />
        <AnimatePresence mode="wait" initial={false}>
          {children}
        </AnimatePresence>
        <StatusFooter />
        <Toaster />

        {/* Global Modals */}
        <HelpModal />
        <AboutModal />
        <AROnboardingModal />
        <PhotoOnboardingModal />
      </ThemeProvider>
    </div>
  );
}
