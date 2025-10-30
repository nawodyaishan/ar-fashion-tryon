// components/tryon/GarmentOverlay.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useTryonStore } from '@/lib/tryon-store';
import type { DraggableData, ResizableDelta } from 'react-rnd';

interface GarmentOverlayProps {
  containerWidth: number;
  containerHeight: number;
  shoulderY?: number; // For alignment guides
}

export function GarmentOverlay({
  containerWidth,
  containerHeight,
  shoulderY,
}: GarmentOverlayProps) {
  const {
    selectedGarmentId,
    garments,
    transform,
    setTransform,
    centerGarment,
    fineTuneMode,
    showAlignmentGuides,
  } = useTryonStore();

  const [garmentDimensions, setGarmentDimensions] = useState({ width: 200, height: 300 });
  const imageRef = useRef<HTMLImageElement>(null);
  const lastClickTime = useRef(0);
  const SNAP_THRESHOLD = 15; // pixels for magnetic snapping

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

  // Keyboard shortcuts with fine-tune mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedGarment) return;

      const step = fineTuneMode ? 1 : (e.shiftKey ? 10 : 5);

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
  }, [selectedGarment, transform, setTransform, fineTuneMode]);

  if (!selectedGarment) return null;

  const handleDragStop = (_e: unknown, d: DraggableData) => {
    let finalX = d.x;
    let finalY = d.y;

    // Magnetic snapping to shoulder line
    if (shoulderY && Math.abs(d.y - shoulderY) < SNAP_THRESHOLD) {
      finalY = shoulderY;
    }

    // Magnetic snapping to center line
    const centerX = containerWidth / 2 - garmentDimensions.width / 2;
    if (Math.abs(d.x - centerX) < SNAP_THRESHOLD) {
      finalX = centerX;
    }

    setTransform({
      x: finalX,
      y: finalY
    });
  };

  // Handle double-click to re-center
  const handleClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    if (timeSinceLastClick < 300) {
      // Double click detected
      centerGarment(containerWidth, containerHeight, garmentDimensions.width);
    }

    lastClickTime.current = now;
  };

  const handleResizeStop = (
    _e: unknown,
    _direction: unknown,
    ref: HTMLElement,
    _delta: ResizableDelta,
    position: { x: number; y: number }
  ) => {
    const newWidth = parseInt(ref.style.width);
    const newHeight = parseInt(ref.style.height);
    const newScale = newWidth / 200; // Calculate scale based on base width

    // Calculate the old center point (shoulders center = center-top)
    const oldCenterX = transform.x + garmentDimensions.width / 2;
    const oldCenterTopY = transform.y;

    // Calculate new position to keep shoulders center fixed
    const newX = oldCenterX - newWidth / 2;
    const newY = oldCenterTopY;

    setTransform({
      x: newX,
      y: newY,
      scale: newScale
    });

    setGarmentDimensions({
      width: newWidth,
      height: newHeight
    });
  };

  return (
    <>
      {/* Alignment Guides Overlay */}
      {showAlignmentGuides && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {/* Center vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/20" />

          {/* Horizontal thirds */}
          <div className="absolute left-0 right-0 h-px bg-primary/10" style={{ top: '33.33%' }} />
          <div className="absolute left-0 right-0 h-px bg-primary/10" style={{ top: '66.66%' }} />

          {/* Shoulder line (when available) */}
          {shoulderY && (
            <div
              className="absolute left-0 right-0 h-px bg-green-500/30"
              style={{ top: shoulderY }}
            />
          )}
        </div>
      )}

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
        className="w-full h-full relative cursor-move"
        onClick={handleClick}
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

        {/* Fine-tune mode indicator */}
        {fineTuneMode && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded pointer-events-none">
            Fine Tune
          </div>
        )}
      </div>
    </Rnd>
    </>
  );
}
