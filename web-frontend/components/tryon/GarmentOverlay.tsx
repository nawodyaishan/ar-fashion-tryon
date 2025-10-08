// components/tryon/GarmentOverlay.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useTryonStore } from '@/lib/tryon-store';
import type { DraggableData, ResizableDelta } from 'react-rnd';

interface GarmentOverlayProps {
  containerWidth: number;
  containerHeight: number;
}

export function GarmentOverlay({ containerWidth: _containerWidth, containerHeight: _containerHeight }: GarmentOverlayProps) {
  const { selectedGarmentId, garments, transform, setTransform } = useTryonStore();

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedGarment) return;

      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setTransform({ y: transform.y - step });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setTransform({ y: transform.y + step });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setTransform({ x: transform.x - step });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setTransform({ x: transform.x + step });
          break;
        case '+':
        case '=':
          e.preventDefault();
          setTransform({ scale: Math.min(3.0, transform.scale + 0.05) });
          break;
        case '-':
          e.preventDefault();
          setTransform({ scale: Math.max(0.3, transform.scale - 0.05) });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedGarment, transform, setTransform]);

  if (!selectedGarment) return null;

  const handleDragStop = (_e: unknown, d: DraggableData) => {
    setTransform({
      x: d.x,
      y: d.y
    });
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

    setTransform({
      x: position.x,
      y: position.y,
      scale: newScale
    });

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
      onDragStop={handleDragStop}
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
