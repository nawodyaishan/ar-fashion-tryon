'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTryonStore } from '@/lib/tryon-store';
import { loadImageFromFile, getImageDimensions, getFileSizeKB } from '@/lib/canvas';
import { TransformControls } from './TransformControls';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function ARPanel() {
  const {
    selectedGarmentId,
    garments,
    selectGarment,
    addGarment,
    removeGarment,
    snapToShoulders,
    setSnapToShoulders,
    poseConfidence,
    clearAll,
    openGallery,
  } = useTryonStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/png')) {
      toast.error('Please upload a PNG file with transparency');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Load image
      const src = await loadImageFromFile(file);
      const dimensions = await getImageDimensions(src);

      // Create new garment
      const newGarment = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        src,
        width: dimensions.width,
        height: dimensions.height,
        sizeKb: getFileSizeKB(file),
        category: 'misc' as const,
      };

      addGarment(newGarment);
      selectGarment(newGarment.id);
      toast.success('Garment uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload garment');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full h-full p-4 space-y-6 overflow-y-auto">
      {/* Garment Picker */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Garments</h3>
          <Button size="sm" variant="ghost" onClick={openGallery}>
            View All
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {garments.slice(0, 6).map((garment) => (
            <button
              key={garment.id}
              onClick={() => selectGarment(garment.id)}
              className={`relative aspect-square rounded-md border-2 overflow-hidden transition-all hover:scale-105 ${
                selectedGarmentId === garment.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Image
                src={garment.src}
                alt={garment.name}
                fill
                className="object-contain p-1"
                onError={() => {
                  // Fallback for missing images
                  console.error(`Failed to load: ${garment.src}`);
                }}
              />
              {selectedGarmentId === garment.id && (
                <div className="absolute inset-0 bg-primary/10" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Add PNG'}
          </Button>

          {selectedGarment && selectedGarment.id.startsWith('custom-') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                removeGarment(selectedGarment.id);
                toast.success('Garment removed');
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          onChange={handleFileUpload}
          className="hidden"
        />
      </section>

      <Separator />

      {/* Transform Controls */}
      <TransformControls />

      <Separator />

      {/* Guides */}
      <section className="space-y-3">
        <h3 className="font-semibold">Guides</h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="snap-shoulders" className="text-sm cursor-pointer">
            Snap to Shoulders
          </Label>
          <Switch
            id="snap-shoulders"
            checked={snapToShoulders}
            onCheckedChange={setSnapToShoulders}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Pose Confidence</span>
          <Badge
            variant={
              poseConfidence === 'Good'
                ? 'default'
                : poseConfidence === 'Okay'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {poseConfidence}
          </Badge>
        </div>
      </section>

      <Separator />

      {/* Actions */}
      <section className="space-y-2">
        <Button
          variant="outline"
          onClick={clearAll}
          disabled={!selectedGarment}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </section>
    </div>
  );
}
