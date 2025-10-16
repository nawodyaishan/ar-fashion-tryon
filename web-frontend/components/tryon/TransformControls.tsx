// components/tryon/TransformControls.tsx
'use client';

import { useTryonStore } from '@/lib/tryon-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, Undo2, Redo2, Grid3x3, Crosshair } from 'lucide-react';

export function TransformControls() {
  const {
    selectedGarmentId,
    garments,
    transform,
    setTransform,
    toggleLockAspect,
    resetToBaseline,
    undo,
    redo,
    canUndo,
    canRedo,
    fineTuneMode,
    toggleFineTuneMode,
    showAlignmentGuides,
    toggleAlignmentGuides,
  } = useTryonStore();

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
    <Card variant="elevated" className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-bold">Transform Controls</CardTitle>
        <div className="flex gap-1.5">
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => undo()}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
            className="transition-all hover:scale-105"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => redo()}
            disabled={!canRedo()}
            title="Redo (Ctrl+Y)"
            className="transition-all hover:scale-105"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={resetToBaseline}
            title="Reset"
            className="transition-all hover:scale-105"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scale Control */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="scale" className="text-sm font-semibold">Size</Label>
            <span className="text-sm font-mono font-bold text-primary">{(transform.scale * 100).toFixed(0)}%</span>
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
        <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="rotation" className="text-sm font-semibold">Rotation</Label>
            <span className="text-sm font-mono font-bold text-accent">{transform.rotation}°</span>
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
        <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="opacity" className="text-sm font-semibold">Opacity</Label>
            <span className="text-sm font-mono font-bold text-success">{transform.opacity}%</span>
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

        <Separator />

        {/* Fine-Tune Mode */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center gap-2">
            <Crosshair className="h-3 w-3 text-muted-foreground" />
            <Label htmlFor="fine-tune" className="text-xs cursor-pointer">
              Fine-Tune Mode
            </Label>
          </div>
          <Switch
            id="fine-tune"
            checked={fineTuneMode}
            onCheckedChange={toggleFineTuneMode}
          />
        </div>

        {/* Alignment Guides */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-3 w-3 text-muted-foreground" />
            <Label htmlFor="alignment-guides" className="text-xs cursor-pointer">
              Show Guides
            </Label>
          </div>
          <Switch
            id="alignment-guides"
            checked={showAlignmentGuides}
            onCheckedChange={toggleAlignmentGuides}
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
