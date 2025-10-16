'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTryonStore } from '@/lib/tryon-store';
import { Target, User, Shirt } from 'lucide-react';

interface PresetPositionsProps {
  containerWidth: number;
  containerHeight: number;
}

export function PresetPositions({ containerWidth, containerHeight }: PresetPositionsProps) {
  const { selectedGarmentId, applyPreset } = useTryonStore();

  const presets = [
    { id: 'shoulders', label: 'Shoulders', icon: User, color: 'text-blue-500' },
    { id: 'chest', label: 'Chest', icon: Shirt, color: 'text-green-500' },
    { id: 'waist', label: 'Waist', icon: Target, color: 'text-amber-500' },
  ] as const;

  if (!selectedGarmentId) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">Quick Positions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.id, containerWidth, containerHeight)}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              <Icon className={`h-4 w-4 ${preset.color}`} />
              <span className="text-xs">{preset.label}</span>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
