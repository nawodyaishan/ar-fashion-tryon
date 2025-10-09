// components/tryon/ConfidenceIndicator.tsx
'use client';

import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-1
  fps: number;
  className?: string;
}

export function ConfidenceIndicator({ confidence, fps, className }: ConfidenceIndicatorProps) {
  const getConfidenceLevel = () => {
    if (confidence >= 0.7) return { label: 'Good', color: 'text-green-500' };
    if (confidence >= 0.5) return { label: 'Okay', color: 'text-yellow-500' };
    return { label: 'Low', color: 'text-red-500' };
  };

  const level = getConfidenceLevel();
  const percentage = Math.round(confidence * 100);

  return (
    <div className={cn('flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-2 rounded', className)}>
      <Activity className={cn('h-4 w-4', level.color)} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70">Pose:</span>
          <span className={cn('text-xs font-medium', level.color)}>
            {level.label} ({percentage}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70">Detection:</span>
          <span className="text-xs font-medium text-white">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
}
