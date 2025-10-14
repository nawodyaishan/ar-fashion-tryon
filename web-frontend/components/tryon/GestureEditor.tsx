// components/tryon/GestureEditor.tsx
'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useHandsDetection } from '@/lib/hooks/useHandsDetection';
import { useTryonStore } from '@/lib/tryon-store';
import { extractPinches } from '@/lib/gesture/pinch-detector';
import { GestureStateMachine } from '@/lib/gesture/gesture-state-machine';
import { calculateGestureZones, filterPinchesByZone } from '@/lib/gesture/gesture-zones';

interface GestureEditorProps {
  videoElement: HTMLVideoElement | null;
  containerWidth: number;
  containerHeight: number;
  enabled: boolean;
}

export function GestureEditor({ videoElement, containerWidth, containerHeight, enabled }: GestureEditorProps) {
  const { hands } = useHandsDetection(videoElement, enabled);
  const { setUserDelta, mode, setUiMode, rebaseTransforms } = useTryonStore();

  const gestureStateMachineRef = useRef(new GestureStateMachine());

  // Calculate gesture zones (left and right edges of screen)
  const gestureZones = useMemo(
    () => calculateGestureZones(containerWidth),
    [containerWidth]
  );

  // Set up rebase callback once
  useEffect(() => {
    gestureStateMachineRef.current.setRebaseCallback(() => {
      console.log('🔄 Rebasing from gesture callback...');
      rebaseTransforms();
      setUiMode('AutoTrack');
      gestureStateMachineRef.current.reset();
    });
  }, [rebaseTransforms, setUiMode]);

  useEffect(() => {
    if (!enabled || !hands) return;

    // Extract all pinches from hands
    const allPinches = extractPinches(hands, containerWidth, containerHeight);

    // CRITICAL: Filter pinches to only those in gesture zones (left/right edges)
    const zonedPinches = filterPinchesByZone(allPinches, gestureZones);

    console.log('👋 Pinches detected:', allPinches.length, '→ In zones:', zonedPinches.length);

    // Get current userDelta from store (fresh read)
    const currentUserDelta = useTryonStore.getState().userDelta;

    // Update state machine with zoned pinches
    const newDelta = gestureStateMachineRef.current.step(zonedPinches, currentUserDelta);

    // If gesture is active, switch to GestureEdit mode
    if (gestureStateMachineRef.current.isActive()) {
      if (mode !== 'GestureEdit') {
        setUiMode('GestureEdit');
      }

      // Update userDelta if state machine returned new values
      if (newDelta) {
        setUserDelta(newDelta);
      }
    }

  }, [hands, containerWidth, containerHeight, mode, enabled, setUserDelta, setUiMode, gestureZones]);

  // Visual feedback: Draw gesture zones and pinch points
  if (!enabled || !hands) return null;

  const allPinches = extractPinches(hands, containerWidth, containerHeight);
  const zonedPinches = filterPinchesByZone(allPinches, gestureZones);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Gesture zones overlay (RED boxes like in user's screenshot) */}
      <div
        className="absolute border-4 border-red-500/80 rounded-lg"
        style={{
          left: gestureZones.left.x,
          top: 0,
          width: gestureZones.left.width,
          height: containerHeight
        }}
      />
      <div
        className="absolute border-4 border-red-500/80 rounded-lg"
        style={{
          left: gestureZones.right.x,
          top: 0,
          width: gestureZones.right.width,
          height: containerHeight
        }}
      />

      {/* Pinch points (only those in zones) */}
      {zonedPinches.map((pinch, index) => (
        <div
          key={index}
          className="absolute w-8 h-8 rounded-full border-4 border-blue-500 bg-blue-500/30 animate-pulse"
          style={{
            left: pinch.center.x - 16,
            top: pinch.center.y - 16
          }}
        />
      ))}

      {/* Connection line for two pinches */}
      {zonedPinches.length === 2 && (
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={zonedPinches[0].center.x}
            y1={zonedPinches[0].center.y}
            x2={zonedPinches[1].center.x}
            y2={zonedPinches[1].center.y}
            stroke="rgba(59, 130, 246, 0.8)"
            strokeWidth="3"
            strokeDasharray="5,5"
          />
          <circle
            cx={(zonedPinches[0].center.x + zonedPinches[1].center.x) / 2}
            cy={(zonedPinches[0].center.y + zonedPinches[1].center.y) / 2}
            r="12"
            fill="rgba(59, 130, 246, 0.3)"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
          />
        </svg>
      )}
    </div>
  );
}
