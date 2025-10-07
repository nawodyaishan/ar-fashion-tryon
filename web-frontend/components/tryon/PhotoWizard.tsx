'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useTryonStore } from '@/lib/tryon-store';
import { loadImageFromFile } from '@/lib/canvas';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Download,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function PhotoWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);

  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);

  const {
    bodyPhoto,
    garmentPhoto,
    resultPhoto,
    setBodyPhoto,
    setGarmentPhoto,
    setResultPhoto,
    resetPhotoMode,
    status,
    setStatus,
    garments,
    selectGarment,
    openGallery,
  } = useTryonStore();

  // Handle body photo upload
  const handleBodyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const src = await loadImageFromFile(file);
      setBodyPhoto(src);
      toast.success('Body photo uploaded');
    } catch (err) {
      toast.error('Failed to upload photo');
      console.error(err);
    }
  };

  // Handle garment photo upload
  const handleGarmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const src = await loadImageFromFile(file);
      setGarmentPhoto(src);
      toast.success('Garment photo uploaded');
    } catch (err) {
      toast.error('Failed to upload photo');
      console.error(err);
    }
  };

  // Select from gallery
  const handleSelectFromGallery = (garmentSrc: string) => {
    setGarmentPhoto(garmentSrc);
    toast.success('Garment selected');
  };

  // Generate try-on (simulated)
  const handleGenerate = async () => {
    if (!bodyPhoto || !garmentPhoto) return;

    setStatus({ processing: true, message: 'Generating try-on result...' });

    // Simulate API call (10-30s)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // For demo, use body photo as result (in real implementation, this would be the API response)
    setResultPhoto(bodyPhoto);
    setStatus({ processing: false, message: 'Try-on complete!' });
    toast.success('Try-on generated successfully!');
  };

  // Download result
  const handleDownload = () => {
    if (!resultPhoto) return;

    const link = document.createElement('a');
    link.href = resultPhoto;
    link.download = `photo-tryon-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded to your device');
  };

  // Regenerate
  const handleRegenerate = () => {
    setResultPhoto(null);
    setCurrentStep(3);
  };

  // New try-on
  const handleNewTryOn = () => {
    resetPhotoMode();
    setCurrentStep(1);
    setRemoveBackground(false);
  };

  const canProceedToStep2 = bodyPhoto !== null;
  const canProceedToStep3 = bodyPhoto !== null && garmentPhoto !== null;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Stepper */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                  currentStep >= step
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {(step === 1 && bodyPhoto) ||
                (step === 2 && garmentPhoto) ||
                (step === 3 && resultPhoto) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{step}</span>
                )}
              </div>
              {step < 3 && (
                <div
                  className={`w-16 sm:w-24 h-0.5 mx-2 ${
                    currentStep > step ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Step 1: Body Photo */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Upload Body Photo</h2>
              <p className="text-sm text-muted-foreground">
                Upload a clear photo of yourself facing the camera
              </p>
            </div>

            {!bodyPhoto ? (
              <Card
                className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => bodyFileInputRef.current?.click()}
              >
                <div className="p-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG up to 10MB • Best with plain background
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden border">
                  <Image src={bodyPhoto} alt="Body photo" fill className="object-contain" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setBodyPhoto(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between max-w-md mx-auto">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="remove-bg"
                      checked={removeBackground}
                      onCheckedChange={setRemoveBackground}
                    />
                    <Label htmlFor="remove-bg" className="text-sm cursor-pointer">
                      Remove background (coming soon)
                    </Label>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bodyFileInputRef.current?.click()}
                  >
                    Replace
                  </Button>
                </div>
              </div>
            )}

            <input
              ref={bodyFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBodyUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Garment Photo */}
        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Choose Garment</h2>
              <p className="text-sm text-muted-foreground">
                Select from gallery or upload your own garment photo
              </p>
            </div>

            <Tabs defaultValue="gallery" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="gallery" className="mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {garments.slice(0, 8).map((garment) => (
                    <button
                      key={garment.id}
                      onClick={() => handleSelectFromGallery(garment.src)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105 ${
                        garmentPhoto === garment.src
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Image
                        src={garment.src}
                        alt={garment.name}
                        fill
                        className="object-contain p-2"
                      />
                      {garmentPhoto === garment.src && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={openGallery}>
                    View All Garments
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-6">
                {!garmentPhoto ? (
                  <Card
                    className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-all max-w-md mx-auto"
                    onClick={() => garmentFileInputRef.current?.click()}
                  >
                    <div className="p-12 text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">Upload Garment Photo</p>
                        <p className="text-xs text-muted-foreground">
                          PNG with transparency preferred • Front view works best
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="relative aspect-square rounded-lg overflow-hidden border">
                      <Image src={garmentPhoto} alt="Garment photo" fill className="object-contain p-4" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setGarmentPhoto(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => garmentFileInputRef.current?.click()}
                      className="w-full"
                    >
                      Replace Garment
                    </Button>
                  </div>
                )}

                <input
                  ref={garmentFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGarmentUpload}
                  className="hidden"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 3: Generate */}
        {currentStep === 3 && !resultPhoto && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Generate Try-On</h2>
              <p className="text-sm text-muted-foreground">
                Review your selections and generate the result
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Body Photo Summary */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Body Photo</span>
                  {bodyPhoto && <Badge variant="outline"><Check className="h-3 w-3" /></Badge>}
                </div>
                {bodyPhoto && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border">
                    <Image src={bodyPhoto} alt="Body" fill className="object-cover" />
                  </div>
                )}
              </Card>

              {/* Garment Photo Summary */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Garment</span>
                  {garmentPhoto && <Badge variant="outline"><Check className="h-3 w-3" /></Badge>}
                </div>
                {garmentPhoto && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted/20">
                    <Image src={garmentPhoto} alt="Garment" fill className="object-contain p-4" />
                  </div>
                )}
              </Card>
            </div>

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canProceedToStep3 || status.processing}
              className="w-full"
            >
              {status.processing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating... (10-30s)
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Try-On
                </>
              )}
            </Button>

            {status.processing && (
              <div className="text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                {status.message}
              </div>
            )}
          </div>
        )}

        {/* Result View */}
        {resultPhoto && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Your Try-On Result</h2>
              <p className="text-sm text-muted-foreground">
                Use the slider to compare before and after
              </p>
            </div>

            {/* Before/After Slider */}
            <div className="relative aspect-[3/4] max-w-2xl mx-auto rounded-lg overflow-hidden border">
              {bodyPhoto && (
                <Image src={bodyPhoto} alt="Before" fill className="object-cover" />
              )}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
              >
                <Image src={resultPhoto} alt="After" fill className="object-cover" />
              </div>

              {/* Slider control */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64">
                <Slider
                  value={[splitPosition]}
                  onValueChange={([value]) => setSplitPosition(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4">
                <Badge>Before</Badge>
              </div>
              <div className="absolute top-4 right-4">
                <Badge variant="secondary">After</Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={handleRegenerate}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" onClick={handleNewTryOn}>
                New Try-On
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!resultPhoto && (
        <div className="p-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep} of 3
          </div>

          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && !canProceedToStep2) ||
                (currentStep === 2 && !canProceedToStep3)
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="w-24" /> // Spacer
          )}
        </div>
      )}
    </div>
  );
}
