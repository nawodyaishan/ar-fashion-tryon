'use client';

import { useTryonStore } from '@/lib/tryon-store';
import ARStage from '@/components/tryon/ARStage';
import ARPanel from '@/components/tryon/ARPanel';
import PhotoWizard from '@/components/tryon/PhotoWizard';

export default function TryOnPage() {
  const { activeMode } = useTryonStore();

  return (
    <div className="h-[calc(100vh-4rem-3rem)] w-full overflow-hidden pb-12">
      {/* AR Mode */}
      {activeMode === 'ar' && (
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

      {/* Photo Mode */}
      {activeMode === 'photo' && (
        <div className="h-full">
          <PhotoWizard />
        </div>
      )}
    </div>
  );
}
