// components/tryon/ARStage.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { VideoPreview } from './VideoPreview';
import { GarmentOverlay } from './GarmentOverlay';
import { Card } from '@/components/ui/card';
import { useTryonStore } from '@/lib/tryon-store';

export default function ARStage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedGarmentId, garments } = useTryonStore();

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  // Get container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleStreamReady = (mediaStream: MediaStream) => {
    console.log('📹 Stream ready for overlay');
    setStream(mediaStream);
  };

  return (
    <Card className="relative w-full h-full min-h-[600px] overflow-hidden bg-black/20 backdrop-blur-sm">
      <div ref={containerRef} className="relative w-full h-full">
        {/* Video Background */}
        <VideoPreview
          onStreamReady={handleStreamReady}
          className="w-full h-full"
        />

        {/* Garment Overlay (positioned absolutely over video) */}
        {stream && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full h-full pointer-events-auto">
              <GarmentOverlay
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
              />
            </div>
          </div>
        )}

        {/* Status Display */}
        <div className="absolute bottom-4 left-4 space-y-1">
          <div className="text-xs text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
            {stream ? '✅ Camera Active' : '⏳ Waiting for camera...'}
          </div>
          {selectedGarment && (
            <div className="text-xs text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
              📦 {selectedGarment.name}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
