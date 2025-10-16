'use client';

import { useEffect, useState } from 'react';
import { useTryonStore } from '@/lib/tryon-store';
import ARStage from '@/components/tryon/ARStage';
import ARPanel from '@/components/tryon/ARPanel';
import PhotoWizard from '@/components/tryon/PhotoWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { Smartphone, Sparkles } from 'lucide-react';
import { isMobile } from '@/lib/utils/device';
import { hasSeenAROnboarding, hasSeenPhotoOnboarding } from '@/lib/utils/onboarding';

export default function TryOnPage() {
  const { activeMode, setMode, openAROnboarding, openPhotoOnboarding } = useTryonStore();
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // Check if mobile on client side
    setIsMobileDevice(isMobile());

    // If mobile and on AR mode, switch to photo mode
    if (isMobile() && activeMode === 'ar') {
      setMode('photo');
    }

    // Listen for resize events
    const handleResize = () => {
      const mobile = isMobile();
      setIsMobileDevice(mobile);

      // Auto-switch to photo mode if switching to mobile
      if (mobile && activeMode === 'ar') {
        setMode('photo');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMode, setMode]);

  // Auto-open onboarding on first visit
  useEffect(() => {
    // Small delay to ensure components are mounted
    const timer = setTimeout(() => {
      if (activeMode === 'ar' && !isMobileDevice && !hasSeenAROnboarding()) {
        openAROnboarding();
      } else if (activeMode === 'photo' && !hasSeenPhotoOnboarding()) {
        openPhotoOnboarding();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeMode, isMobileDevice, openAROnboarding, openPhotoOnboarding]);

  return (
    <PageTransition>
      <div className="h-[calc(100vh-4rem-3rem)] w-full overflow-hidden pb-12">
      {/* AR Mode - Desktop Only */}
      {activeMode === 'ar' && !isMobileDevice && (
        <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
          {/* Camera Stage - Left/Main */}
          <div className="flex-1 min-h-[400px]">
            <ARStage />
          </div>

          {/* Control Panel - Right/Sidebar */}
          <div className="w-full lg:w-80 xl:w-96 rounded-lg border bg-card">
            <ARPanel />
          </div>
        </div>
      )}

      {/* AR Mode - Mobile "Coming Soon" Message */}
      {activeMode === 'ar' && isMobileDevice && (
        <div className="h-full flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 sm:p-8 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Live AR Coming Soon</h2>
              <p className="text-muted-foreground">
                Live AR preview is currently available on desktop only. We&apos;re working on bringing it to mobile devices soon!
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Mobile App Coming Soon</span>
              </div>

              <Button
                onClick={() => setMode('photo')}
                className="w-full"
                size="lg"
              >
                Try Photo Try-On (HD)
              </Button>

              <p className="text-xs text-muted-foreground">
                Use Photo Try-On mode to see yourself in any garment with HD quality results
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Photo Mode */}
      {activeMode === 'photo' && (
        <div className="h-full">
          <PhotoWizard />
        </div>
      )}
    </div>
    </PageTransition>
  );
}
