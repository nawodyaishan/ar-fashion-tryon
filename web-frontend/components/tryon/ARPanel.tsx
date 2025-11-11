'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTryonStore } from '@/lib/tryon-store';
import { loadImageFromFile, getImageDimensions, getFileSizeKB } from '@/lib/canvas';
import { extractGarmentSmart } from '@/lib/services/garmentApi';
import {
  uploadGarmentWithKeypoints,
  transformAPIResponseToGarment,
} from '@/lib/api/keypoint-client';
import { TransformControls } from './TransformControls';
import { MediaPipeTestPanel } from './MediaPipeTestPanel';
import { PresetPositions } from './PresetPositions';
import { Plus, Trash2, Sparkles, Activity, HelpCircle, Save } from 'lucide-react';
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
    lockScale,
    toggleLockScale,
    snapToShoulders,
    setSnapToShoulders,
    poseConfidence,
    clearAll,
    openAROnboarding,
    loadGarmentPosition,
    saveGarmentPosition,
  } = useTryonStore();

  const [containerDimensions, setContainerDimensions] = useState({ width: 640, height: 480 });

  // Load saved position when garment is selected
  useEffect(() => {
    if (selectedGarmentId) {
      loadGarmentPosition(selectedGarmentId);
    }
  }, [selectedGarmentId, loadGarmentPosition]);

  // Get container dimensions from parent
  useEffect(() => {
    const updateDimensions = () => {
      // Approximate AR stage dimensions
      setContainerDimensions({ width: 640, height: 480 });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  const getConfidenceLabel = () => {
    if (poseConfidence === 'Good') return '🟢 Good';
    if (poseConfidence === 'Okay') return '🟡 Okay';
    return '🔴 Low';
  };

  // Handle file upload with garment extraction AND keypoint detection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.some((type) => file.type === type)) {
      toast.error('Please upload PNG, JPEG, or WEBP image');
      return;
    }

    // Validate file size (max 16MB for keypoint API)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('File size must be less than 16MB');
      return;
    }

    try {
      setUploading(true);

      // Always try keypoint-based upload first
      toast.loading('Uploading garment with keypoint detection...', { id: 'upload' });

      const apiResponse = await uploadGarmentWithKeypoints(file);

      if (apiResponse) {
        // Success: Transform API response to Garment object
        const garment = transformAPIResponseToGarment(file, apiResponse);

        addGarment(garment);
        selectGarment(garment.id);

        const confidence = Math.round(apiResponse.detection_confidence * 100);
        const confidenceEmoji = confidence >= 70 ? '🎯' : confidence >= 50 ? '✓' : '⚠️';
        toast.success(
          `${confidenceEmoji} Garment added with ${confidence}% keypoint confidence`,
          {
            id: 'upload',
            description:
              confidence < 60
                ? 'Low confidence - alignment may be less accurate'
                : 'High quality alignment enabled',
          },
        );

        console.log('✅ Garment added with keypoints:', garment);
        return;
      }

      // Keypoint detection failed or unavailable - fall back to basic extraction
      console.warn('⚠️ Keypoint detection unavailable - falling back to basic extraction');
      toast.loading('Extracting garment...', { id: 'upload' });

      // Fallback: Use basic extraction without keypoints
      const { result, extractedFile, method, cloudinaryUrl } = await extractGarmentSmart(file);

      if (!result.success || !extractedFile) {
        toast.error(result.message || 'Failed to extract garment', { id: 'upload' });
        return;
      }

      const extractedSrc = await loadImageFromFile(extractedFile);
      const dimensions = await getImageDimensions(extractedSrc);

      const newGarment = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        src: extractedSrc,
        width: dimensions.width,
        height: dimensions.height,
        sizeKb: getFileSizeKB(extractedFile),
        category: 'misc' as const,
        extracted: true,
        extractedUrl: result.extraction?.cutout_url,
        cloudinaryUrl: cloudinaryUrl,
        classification: result.classification
          ? {
              label: result.classification.label as 'tshirt' | 'trousers' | 'unknown',
              confidence: result.classification.confidence,
            }
          : undefined,
        processingTime: result.processing_time_ms || undefined,
        // No keypoints for fallback upload
      };

      addGarment(newGarment);
      selectGarment(newGarment.id);

      const methodEmoji = method === 'cloudinary' ? '🌩️' : '📤';
      toast.success(
        `${methodEmoji} Garment extracted: ${result.classification?.label.toUpperCase() || 'GARMENT'}`,
        { id: 'upload' },
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload garment';
      toast.error(errorMessage, { id: 'upload' });
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
      {/* Quick Tour Button */}
      <Button
        variant="outline"
        onClick={openAROnboarding}
        className="w-full gap-2"
      >
        <HelpCircle className="h-4 w-4" />
        Take a Quick Tour
      </Button>

      <Separator />

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

              {/* Lock Size */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lock-size-toggle" className="text-sm cursor-pointer">
                    Lock Size
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Prevent size changes during tracking
                  </p>
                </div>
                <Switch
                  id="lock-size-toggle"
                  checked={lockScale}
                  onCheckedChange={toggleLockScale}
                  disabled={!continuousTracking}
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
                unoptimized // Skip Next.js image optimization for all garments
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
                Extracting...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Garment
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

      {/* Preset Positions */}
      <PresetPositions
        containerWidth={containerDimensions.width}
        containerHeight={containerDimensions.height}
      />

      <Separator />

      {/* Transform Controls */}
      <TransformControls />

      {/* Save Position Button */}
      {selectedGarmentId && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            saveGarmentPosition(selectedGarmentId);
            toast.success('Position saved for this garment');
          }}
          className="w-full gap-2"
        >
          <Save className="h-4 w-4" />
          Save Position
        </Button>
      )}

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
