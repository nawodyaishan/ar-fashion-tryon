// components/tryon/StatusPill.tsx
'use client';

import { Activity, Hand, Pause } from 'lucide-react';
import type { UiMode } from '@/lib/types';

interface StatusPillProps {
  mode: UiMode;
  confidence: number;
  fps: number;
}

export function StatusPill({ mode, confidence, fps }: StatusPillProps) {
  const getModeDisplay = () => {
    switch (mode) {
      case 'AutoTrack':
        return {
          icon: <Activity className="h-3 w-3" />,
          label: 'Auto',
          color: 'bg-green-500',
          detail: `pose ✓ ${fps} FPS`
        };
      case 'GestureEdit':
        return {
          icon: <Hand className="h-3 w-3" />,
          label: 'Editing',
          color: 'bg-blue-500',
          detail: 'hands/mouse'
        };
      case 'Paused':
        return {
          icon: <Pause className="h-3 w-3" />,
          label: 'Paused',
          color: 'bg-yellow-500',
          detail: 'low confidence'
        };
    }
  };

  const display = getModeDisplay();

  return (
    <div className={`${display.color} text-white flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-opacity-90`}>
      {display.icon}
      <div className="flex flex-col">
        <span className="text-xs font-medium">{display.label}</span>
        <span className="text-[10px] opacity-80">{display.detail}</span>
      </div>
    </div>
  );
}
