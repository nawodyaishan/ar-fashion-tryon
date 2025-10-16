'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTryonStore } from '@/lib/tryon-store';
// Unused canvas utilities - may be needed for future features
// import { loadImageFromFile, getImageDimensions, getFileSizeKB } from '@/lib/canvas';
import { extractGarmentSmart } from '@/lib/services/garmentApi';
import { processGarment, validateGarmentFile } from '@/lib/services/garmentProcessingApi';
import { TransformControls } from './TransformControls';
import { MediaPipeTestPanel } from './MediaPipeTestPanel';
import { Plus, Trash2, Sparkles, Activity } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function ARPanel() {
  const {
    selectedGarmentId,
    garments,
    selectGarment,
    addGarment,
    removeGarment,
    mediaPipeEnabled,
    toggleMediaPipe,
    landmarksVisible,
    toggleLandmarks,
    continuousTracking,
    toggleContinuousTracking,
    snapToShoulders,
    setSnapToShoulders,
    poseConfidence,
    clearAll,
  } = useTryonStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  const getConfidenceLabel = () => {
    if (poseConfidence === 'Good') return '🟢 Good';
    if (poseConfidence === 'Okay') return '🟡 Okay';
    return '🔴 Low';
  };

  // Handle file upload with garment extraction + AR processing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before processing
    const validation = validateGarmentFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    const garmentId = `custom-${Date.now()}`;
    const garmentName = file.name.replace(/\.[^/.]+$/, '');

    try {
      setUploading(true);

      // Step 1: Extract garment (background removal + classification)
      toast.loading('Extracting garment...', { id: 'processing' });
      const { result, extractedFile, method, cloudinaryUrl } = await extractGarmentSmart(file);

      if (!result.success || !extractedFile) {
        toast.error(result.message || 'Failed to extract garment', { id: 'processing' });
        return;
      }

      // Step 2: Process for AR (anchor detection + neck cut + metadata)
      toast.loading('Processing for AR...', { id: 'processing' });

      // Determine category from classification
      const category = result.classification?.label === 'tshirt' ? 'tshirt' : 'shirt';

      const processedResult = await processGarment(extractedFile, {
        category,
        upload: true, // Upload processed version to Cloudinary
        useDefaults: true // Use default anchors
      });

      // Check for upload error
      if (processedResult.upload_error) {
        console.warn('Upload error (using base64 fallback):', processedResult.upload_error);
      }

      // Step 3: Use AR-processed PNG from backend (Cloudinary URL or base64)
      const processedPng = processedResult.urls.processed_png ||
                          processedResult.urls.processed_png_base64;

      if (!processedPng) {
        throw new Error('No processed PNG returned from AR processing');
      }

      // Step 4: Create garment with AR metadata including GSM ID
      const newGarment = {
        id: garmentId,
        name: garmentName,
        src: processedPng,
        width: processedResult.meta.w,
        height: processedResult.meta.h,
        sizeKb: 0, // Will be calculated later if needed
        category: 'tops' as 'tops' | 'jackets' | 'misc',
        extracted: true,
        extractedUrl: result.extraction?.cutout_url,
        cloudinaryUrl: processedResult.urls.processed_png || cloudinaryUrl,
        classification: result.classification ? {
          label: result.classification.label as 'tshirt' | 'trousers' | 'unknown',
          confidence: result.classification.confidence
        } : undefined,
        processingTime: result.processing_time_ms,
        // CRITICAL: Store GSM ID for WebSocket fit solver
        gsmId: processedResult.gsm_id
      };

      // Step 5: Add garment to store
      addGarment(newGarment);
      selectGarment(garmentId);

      // Success notification
      const imageSource = processedResult.urls.processed_png ? 'Cloudinary' : 'Local';
      const methodEmoji = method === 'cloudinary' ? '🌩️' : '📤';
      toast.success(
        `${methodEmoji} AR-ready garment processed! (${imageSource}) GSM ID: ${processedResult.gsm_id}`,
        { id: 'processing' },
      );

      console.log('✅ Garment added with GSM:', {
        garmentId,
        gsmId: processedResult.gsm_id,
        dimensions: `${processedResult.meta.w}x${processedResult.meta.h}`,
        anchorSource: processedResult.meta.anchor_source,
        confidence: processedResult.meta.anchor_confidence,
        imageSource
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process garment';
      toast.error(errorMessage, { id: 'processing' });
      console.error('Garment processing error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full h-full p-4 space-y-6 overflow-y-auto">
      {/* MediaPipe Controls - NEW SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Pose Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable MediaPipe */}
          <div className="flex items-center justify-between">
            <Label htmlFor="mediapipe-toggle" className="text-sm cursor-pointer">
              Enable Auto-Detection
            </Label>
            <Switch
              id="mediapipe-toggle"
              checked={mediaPipeEnabled}
              onCheckedChange={toggleMediaPipe}
            />
          </div>

          {mediaPipeEnabled && (
            <>
              <Separator />

              {/* Show Landmarks */}
              <div className="flex items-center justify-between">
                <Label htmlFor="landmarks-toggle" className="text-sm cursor-pointer">
                  Show Pose Landmarks
                </Label>
                <Switch
                  id="landmarks-toggle"
                  checked={landmarksVisible}
                  onCheckedChange={toggleLandmarks}
                />
              </div>

              {/* Continuous Tracking */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tracking-toggle" className="text-sm cursor-pointer">
                    Continuous Tracking
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Garment follows your movements
                  </p>
                </div>
                <Switch
                  id="tracking-toggle"
                  checked={continuousTracking}
                  onCheckedChange={toggleContinuousTracking}
                  disabled={!selectedGarmentId}
                />
              </div>

              {/* Confidence Display */}
              <div className="text-xs text-muted-foreground pt-2">
                Detection Quality: {getConfidenceLabel()}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Testing Panel - only show when MediaPipe enabled */}
      {mediaPipeEnabled && (
        <>
          <MediaPipeTestPanel />
          <Separator />
        </>
      )}

      {/* Garment Picker */}
      <section className="space-y-3">
        <h3 className="font-semibold">Garments</h3>

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
                sizes="(max-width: 640px) 25vw, (max-width: 1024px) 15vw, 10vw"
                className="object-contain p-1 bg-muted/20"
                unoptimized={garment.id.startsWith('custom-')}
                onError={(e) => {
                  // Fallback for missing images
                  console.error(`Failed to load: ${garment.src}`);
                  (e.target as HTMLImageElement).style.display = 'none';
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
            {uploading ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add AR Garment
              </>
            )}
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
          accept="image/jpeg,image/jpg,image/png,image/webp"
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
