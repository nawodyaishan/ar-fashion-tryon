// components/tryon/GestureEditor.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useHandsDetection } from '@/lib/hooks/useHandsDetection';
import { useTryonStore } from '@/lib/tryon-store';
import { extractPinches } from '@/lib/gesture/pinch-detector';
import { GestureStateMachine } from '@/lib/gesture/gesture-state-machine';

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

  useEffect(() => {
    if (!enabled || !hands) return;

    // Extract pinches from hands
    const pinches = extractPinches(hands, containerWidth, containerHeight);

    // Get current userDelta from store (fresh read)
    const currentUserDelta = useTryonStore.getState().userDelta;

    // Update state machine
    const newDelta = gestureStateMachineRef.current.step(pinches, currentUserDelta);

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

    // If gesture ended and resume timer expired, rebase
    if (gestureStateMachineRef.current.shouldRebase() && mode === 'GestureEdit') {
      console.log('🔄 Rebasing transforms...');
      rebaseTransforms();
      setUiMode('AutoTrack');
      gestureStateMachineRef.current.reset();
    }

  }, [hands, containerWidth, containerHeight, mode, enabled, setUserDelta, setUiMode, rebaseTransforms]);

  // Visual feedback: Draw pinch points
  if (!enabled || !hands) return null;

  const pinches = extractPinches(hands, containerWidth, containerHeight);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {pinches.map((pinch, index) => (
        <div
          key={index}
          className="absolute w-8 h-8 rounded-full border-4 border-blue-500 bg-blue-500/30 animate-pulse"
          style={{
            left: pinch.center.x - 16,
            top: pinch.center.y - 16
          }}
        />
      ))}

      {pinches.length === 2 && (
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={pinches[0].center.x}
            y1={pinches[0].center.y}
            x2={pinches[1].center.x}
            y2={pinches[1].center.y}
            stroke="rgba(59, 130, 246, 0.8)"
            strokeWidth="3"
            strokeDasharray="5,5"
          />
          <circle
            cx={(pinches[0].center.x + pinches[1].center.x) / 2}
            cy={(pinches[0].center.y + pinches[1].center.y) / 2}
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
