// components/tryon/GarmentOverlay.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useTryonStore } from '@/lib/tryon-store';
import type { DraggableData, ResizableDelta } from 'react-rnd';
import type { Transform } from '@/lib/types';

interface GarmentOverlayProps {
  containerWidth: number;
  containerHeight: number;
  transform: Transform; // NEW: Accept transform as prop (will be `final`)
}

export function GarmentOverlay({
  containerWidth, // Reserved for future bounds calculation
  containerHeight, // Reserved for future bounds calculation
  transform, // NEW: Render the composition result
}: GarmentOverlayProps) {
  const { selectedGarmentId, garments, setUserDelta, mode, setUiMode, tracked } = useTryonStore();

  // Suppress unused variable warnings - these are reserved for future use
  void containerWidth;
  void containerHeight;

  const [garmentDimensions, setGarmentDimensions] = useState({ width: 200, height: 300 });
  const imageRef = useRef<HTMLImageElement>(null);

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  // Calculate initial garment size based on aspect ratio
  useEffect(() => {
    if (!selectedGarment) return;

    const img = new Image();
    img.src = selectedGarment.src;
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const baseWidth = 200; // Default width
      const calculatedHeight = baseWidth / aspectRatio;

      setGarmentDimensions({
        width: baseWidth * transform.scale,
        height: calculatedHeight * transform.scale
      });
    };
  }, [selectedGarment, transform.scale]);

  // Keyboard shortcuts - now updates userDelta instead of transform
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedGarment) return;

      // Switch to GestureEdit mode if in AutoTrack
      if (mode === 'AutoTrack') {
        setUiMode('GestureEdit');
      }

      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setUserDelta({ y: transform.y - tracked.y - step });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setUserDelta({ y: transform.y - tracked.y + step });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setUserDelta({ x: transform.x - tracked.x - step });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setUserDelta({ x: transform.x - tracked.x + step });
          break;
        case '+':
        case '=':
          e.preventDefault();
          setUserDelta({ scale: Math.min(3.0, transform.scale / tracked.scale + 0.05) });
          break;
        case '-':
          e.preventDefault();
          setUserDelta({ scale: Math.max(0.3, transform.scale / tracked.scale - 0.05) });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedGarment, transform, tracked, mode, setUserDelta, setUiMode]);

  if (!selectedGarment) return null;

  // NEW: On drag/resize start, switch to GestureEdit mode
  const handleDragStart = () => {
    if (mode === 'AutoTrack') {
      setUiMode('GestureEdit'); // Pause tracking
    }
  };

  const handleDragStop = (_e: unknown, d: DraggableData) => {
    // Calculate delta from tracked position
    const deltaX = d.x - tracked.x;
    const deltaY = d.y - tracked.y;

    setUserDelta({ x: deltaX, y: deltaY });
  };

  const handleResizeStop = (
    _e: unknown,
    _direction: unknown,
    ref: HTMLElement,
    _delta: ResizableDelta,
    position: { x: number; y: number }
  ) => {
    const newWidth = parseInt(ref.style.width);
    const newScale = newWidth / 200; // Calculate scale based on base width

    // Calculate deltas from tracked position
    const deltaScale = newScale / tracked.scale;
    const deltaX = position.x - tracked.x;
    const deltaY = position.y - tracked.y;

    setUserDelta({ x: deltaX, y: deltaY, scale: deltaScale });

    setGarmentDimensions({
      width: newWidth,
      height: parseInt(ref.style.height)
    });
  };

  return (
    <Rnd
      size={{
        width: garmentDimensions.width,
        height: garmentDimensions.height
      }}
      position={{
        x: transform.x,
        y: transform.y
      }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStart={handleDragStart}
      onResizeStop={handleResizeStop}
      lockAspectRatio={transform.lockAspect}
      bounds="parent"
      className="z-10"
      enableResizing={{
        top: false,
        right: true,
        bottom: true,
        left: false,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true
      }}
    >
      <div
        className="w-full h-full relative"
        style={{
          opacity: transform.opacity / 100, // Convert 0-100 to 0-1
          transform: `rotate(${transform.rotation}deg)`,
          transformOrigin: 'center'
        }}
      >
        {/* Garment Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={selectedGarment.src}
          alt={selectedGarment.name}
          className="w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* Resize Handles Visual Feedback */}
        <div className="absolute inset-0 border-2 border-primary/30 rounded pointer-events-none" />

        {/* Corner Handles */}
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full pointer-events-none" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full pointer-events-none" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full pointer-events-none" />
      </div>
    </Rnd>
  );
}
