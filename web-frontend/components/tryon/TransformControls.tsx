// components/tryon/TransformControls.tsx
'use client';

import { useTryonStore } from '@/lib/tryon-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export function TransformControls() {
  const { selectedGarmentId, garments, transform, setTransform, toggleLockAspect, resetToBaseline } = useTryonStore();

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  if (!selectedGarment) {
    return (
      <Card className="w-full opacity-50">
        <CardHeader>
          <CardTitle className="text-sm">Transform Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Select a garment to adjust controls</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Transform Controls</CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={resetToBaseline}
          className="h-8 w-8 p-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scale Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="scale" className="text-xs">Size</Label>
            <span className="text-xs text-muted-foreground">{(transform.scale * 100).toFixed(0)}%</span>
          </div>
          <Slider
            id="scale"
            min={0.3}
            max={3.0}
            step={0.05}
            value={[transform.scale]}
            onValueChange={([value]) => setTransform({ scale: value })}
            className="w-full"
          />
        </div>

        {/* Rotation Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="rotation" className="text-xs">Rotation</Label>
            <span className="text-xs text-muted-foreground">{transform.rotation}°</span>
          </div>
          <Slider
            id="rotation"
            min={-45}
            max={45}
            step={1}
            value={[transform.rotation]}
            onValueChange={([value]) => setTransform({ rotation: value })}
            className="w-full"
          />
        </div>

        {/* Opacity Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="opacity" className="text-xs">Opacity</Label>
            <span className="text-xs text-muted-foreground">{transform.opacity}%</span>
          </div>
          <Slider
            id="opacity"
            min={10}
            max={100}
            step={5}
            value={[transform.opacity]}
            onValueChange={([value]) => setTransform({ opacity: value })}
            className="w-full"
          />
        </div>

        {/* Aspect Ratio Lock */}
        <div className="flex items-center justify-between space-x-2 pt-2">
          <Label htmlFor="lock-aspect" className="text-xs cursor-pointer">
            Lock Aspect Ratio
          </Label>
          <Switch
            id="lock-aspect"
            checked={transform.lockAspect}
            onCheckedChange={toggleLockAspect}
          />
        </div>

        {/* Position Display */}
        <div className="pt-2 space-y-1 border-t">
          <p className="text-xs text-muted-foreground">
            Position: ({Math.round(transform.x)}, {Math.round(transform.y)})
          </p>
          <p className="text-xs text-muted-foreground">
            Garment: {selectedGarment.name}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
