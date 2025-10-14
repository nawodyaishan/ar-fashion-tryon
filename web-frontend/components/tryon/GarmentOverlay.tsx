// components/tryon/GarmentOverlay.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useTryonStore } from '@/lib/tryon-store';
import { MouseGestureDetector } from '@/lib/gesture/mouse-gesture-detector';
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
  const { selectedGarmentId, garments, setUserDelta, mode, setUiMode, tracked, rebaseTransforms } = useTryonStore();

  // Suppress unused variable warnings - these are reserved for future use
  void containerWidth;
  void containerHeight;

  const [garmentDimensions, setGarmentDimensions] = useState({ width: 200, height: 300 });
  const imageRef = useRef<HTMLImageElement>(null);
  const mouseDetectorRef = useRef(new MouseGestureDetector());
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Mouse gesture handling with resume timer
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Only handle if clicking on garment overlay
      if (!(e.target as HTMLElement).closest('.garment-overlay')) return;

      mouseDetectorRef.current.handleMouseDown(e);

      if (mode === 'AutoTrack') {
        setUiMode('GestureEdit');
      }

      // Clear any existing resume timer
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDetectorRef.current.isActive()) return;

      mouseDetectorRef.current.handleMouseMove(e);

      const gestureData = mouseDetectorRef.current.getGestureData();
      const { userDelta } = useTryonStore.getState();

      if (gestureData.type === 'scale') {
        const deltaY = gestureData.currentPos.y - gestureData.startPos.y;
        const scaleChange = 1 + (deltaY / 200); // 200px = 100% scale change

        setUserDelta({ scale: Math.max(0.3, Math.min(3.0, userDelta.scale * scaleChange)) });
      } else if (gestureData.type === 'rotate') {
        const deltaX = gestureData.currentPos.x - gestureData.startPos.x;
        const rotChange = deltaX * 0.5; // 0.5 degrees per pixel

        setUserDelta({ rotation: Math.max(-45, Math.min(45, userDelta.rotation + rotChange)) });
      }
      // Note: Regular drag is handled by react-rnd, not here
    };

    const handleMouseUp = () => {
      if (!mouseDetectorRef.current.isActive()) return;

      mouseDetectorRef.current.handleMouseUp();

      // Start 800ms resume timer
      resumeTimerRef.current = setTimeout(() => {
        console.log('🔄 Mouse gesture ended, rebasing...');
        rebaseTransforms();
        setUiMode('AutoTrack');
        resumeTimerRef.current = null;
      }, 800);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [mode, setUiMode, setUserDelta, rebaseTransforms]);

  // Enhanced keyboard shortcuts with resume timer
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedGarment) return;

      // Ignore if typing in input field
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      // Switch to GestureEdit mode if in AutoTrack
      if (mode === 'AutoTrack') {
        setUiMode('GestureEdit');
      }

      const step = e.shiftKey ? 10 : 1;
      const { userDelta } = useTryonStore.getState();

      let updated = false;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setUserDelta({ y: userDelta.y - step });
          updated = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          setUserDelta({ y: userDelta.y + step });
          updated = true;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setUserDelta({ x: userDelta.x - step });
          updated = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          setUserDelta({ x: userDelta.x + step });
          updated = true;
          break;
        case '+':
        case '=':
          e.preventDefault();
          setUserDelta({ scale: Math.min(3.0, userDelta.scale * 1.05) });
          updated = true;
          break;
        case '-':
          e.preventDefault();
          setUserDelta({ scale: Math.max(0.3, userDelta.scale * 0.95) });
          updated = true;
          break;
        case '[':
          e.preventDefault();
          setUserDelta({ rotation: Math.max(-45, userDelta.rotation - 5) });
          updated = true;
          break;
        case ']':
          e.preventDefault();
          setUserDelta({ rotation: Math.min(45, userDelta.rotation + 5) });
          updated = true;
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          // Reset and rebase immediately
          console.log('⌨️ Reset triggered, rebasing...');
          rebaseTransforms();
          setUiMode('AutoTrack');
          break;
      }

      // Start resume timer on any edit
      if (updated) {
        if (resumeTimerRef.current) {
          clearTimeout(resumeTimerRef.current);
        }

        resumeTimerRef.current = setTimeout(() => {
          console.log('⌨️ Keyboard edit ended, rebasing...');
          rebaseTransforms();
          setUiMode('AutoTrack');
          resumeTimerRef.current = null;
        }, 800);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [selectedGarment, mode, setUiMode, setUserDelta, rebaseTransforms]);

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

    // Start 800ms resume timer
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = setTimeout(() => {
      console.log('🔄 Drag ended, rebasing...');
      rebaseTransforms();
      setUiMode('AutoTrack');
      resumeTimerRef.current = null;
    }, 800);
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

    // Start 800ms resume timer
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = setTimeout(() => {
      console.log('🔄 Resize ended, rebasing...');
      rebaseTransforms();
      setUiMode('AutoTrack');
      resumeTimerRef.current = null;
    }, 800);
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
      className="garment-overlay z-10"
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
