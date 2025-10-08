'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useVtonStore } from '@/lib/store/useVtonStore';
import { useTryonStore } from '@/lib/tryon-store';
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
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PhotoWizard() {
  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);

  // VTON Store (backend integration)
  const {
    step,
    setStep,
    body,
    garment,
    options,
    setBody,
    setGarmentFile,
    setGarmentId,
    setOptions,
    status,
    error,
    resultUrl,
    tryOn,
    regenerate,
    reset,
  } = useVtonStore();

  // Legacy tryon store for garment gallery
  const { garments, openGallery } = useTryonStore();

  const [splitPosition, setSplitPosition] = useState(50);

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

    setBody(file);
    toast.success('Body photo uploaded');
  };

  // Handle garment photo upload (with extraction)
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

    // Show extraction toast
    toast.loading('Extracting garment...', { id: 'garment-extraction' });

    // setGarmentFile now handles extraction automatically
    await setGarmentFile(file);

    // Check if extraction was successful
    if (status === 'error') {
      toast.error(error || 'Garment extraction failed', { id: 'garment-extraction' });
    } else if (status === 'valid') {
      toast.success('Garment extracted successfully!', { id: 'garment-extraction' });
    }
  };

  // Select from gallery
  const handleSelectFromGallery = (garmentSrc: string, garmentId: string) => {
    setGarmentId(garmentId, garmentSrc);
    toast.success('Garment selected');
  };

  // Generate try-on
  const handleGenerate = async () => {
    await tryOn();
    if (error) {
      toast.error(error);
    }
  };

  // Download result
  const handleDownload = () => {
    if (!resultUrl) return;

    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `photo-tryon-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded to your device');
  };

  // Regenerate
  const handleRegenerate = async () => {
    await regenerate();
    if (error) {
      toast.error(error);
    }
  };

  // New try-on
  const handleNewTryOn = () => {
    reset();
    toast.info('Starting new try-on');
  };

  // Navigate steps
  const handleBack = () => {
    const steps: Array<typeof step> = ['BODY', 'GARMENT', 'GENERATE'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const steps: Array<typeof step> = ['BODY', 'GARMENT', 'GENERATE'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const canProceedFromBody = body.file !== undefined;
  const canProceedFromGarment = garment.file !== undefined || garment.id !== undefined;
  // For Gradio: Garment must be extracted (only works with uploaded files, not gallery)
  const canGenerate = canProceedFromBody && garment.file && garment.extracted;

  const stepNumber = {
    BODY: 1,
    GARMENT: 2,
    GENERATE: 3,
    RESULT: 4,
  }[step];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Stepper */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                  stepNumber >= num
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {(num === 1 && body.file) ||
                (num === 2 && (garment.file || garment.id)) ||
                (num === 3 && resultUrl) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{num}</span>
                )}
              </div>
              {num < 3 && (
                <div
                  className={`w-16 sm:w-24 h-0.5 mx-2 ${
                    stepNumber > num ? 'bg-primary' : 'bg-muted-foreground/30'
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
        {step === 'BODY' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Upload Body Photo</h2>
              <p className="text-sm text-muted-foreground">
                Use a clear, front-facing upper-body photo
              </p>
            </div>

            {!body.file ? (
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
                      JPG, PNG up to 10MB • Plain background recommended
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden border">
                  <Image src={body.previewUrl!} alt="Body photo" fill className="object-contain" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setBody(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between max-w-md mx-auto">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="remove-bg"
                      checked={options.removeBg || false}
                      onCheckedChange={(checked) => setOptions({ removeBg: checked })}
                    />
                    <Label htmlFor="remove-bg" className="text-sm cursor-pointer">
                      Remove background
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
        {step === 'GARMENT' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Choose Garment</h2>
              <p className="text-sm text-muted-foreground">
                Transparent PNGs align best; avoid heavy folds
              </p>
            </div>

            <Tabs defaultValue="gallery" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="gallery">Select from Gallery</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="gallery" className="mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {garments.slice(0, 12).map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleSelectFromGallery(g.src, g.id)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105 ${
                        garment.id === g.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Image src={g.src} alt={g.name} fill className="object-contain p-2" />
                      {garment.id === g.id && (
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
                {!garment.file ? (
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
                    {/* Extraction Status */}
                    {status === 'uploading' && (
                      <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertDescription>Extracting garment background...</AlertDescription>
                      </Alert>
                    )}

                    {garment.extracted && garment.extractionResult && (
                      <Alert className="bg-green-500/10 border-green-500/20">
                        <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          Extracted: {garment.extractionResult.classification?.label.toUpperCase()} (
                          {((garment.extractionResult.classification?.confidence || 0) * 100).toFixed(0)}% confidence)
                        </AlertDescription>
                      </Alert>
                    )}

                    {status === 'error' && error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="relative aspect-square rounded-lg overflow-hidden border">
                      <Image
                        src={garment.previewUrl!}
                        alt="Garment photo"
                        fill
                        className="object-contain p-4"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setGarmentFile(undefined)}
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
        {step === 'GENERATE' && !resultUrl && (
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
                  {body.file && (
                    <Badge variant="outline">
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                {body.previewUrl && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border">
                    <Image src={body.previewUrl} alt="Body" fill className="object-cover" />
                  </div>
                )}
              </Card>

              {/* Garment Photo Summary */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Garment</span>
                  {(garment.file || garment.id) && (
                    <Badge variant="outline">
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                {garment.previewUrl && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted/20">
                    <Image
                      src={garment.previewUrl}
                      alt="Garment"
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                )}
              </Card>
            </div>

            {/* Advanced Settings */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm">Advanced Settings (Optional)</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* Inference Steps */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Inference Steps</Label>
                      <span className="text-xs text-muted-foreground">
                        {options.numInferenceSteps ?? 50}
                      </span>
                    </div>
                    <Slider
                      value={[options.numInferenceSteps ?? 50]}
                      onValueChange={([value]) => setOptions({ numInferenceSteps: value })}
                      min={20}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values = better quality, slower processing (default: 50)
                    </p>
                  </div>

                  {/* Guidance Scale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Guidance Scale</Label>
                      <span className="text-xs text-muted-foreground">
                        {(options.guidanceScale ?? 2.5).toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[options.guidanceScale ?? 2.5]}
                      onValueChange={([value]) => setOptions({ guidanceScale: value })}
                      min={1.0}
                      max={10.0}
                      step={0.5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values = more faithful to garment (default: 2.5)
                    </p>
                  </div>

                  {/* Seed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Seed</Label>
                      <span className="text-xs text-muted-foreground">
                        {options.seed ?? 42}
                      </span>
                    </div>
                    <Slider
                      value={[options.seed ?? 42]}
                      onValueChange={([value]) => setOptions({ seed: value })}
                      min={-1}
                      max={999}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      -1 for random, fixed seed for reproducibility (default: 42)
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canGenerate || status === 'uploading' || status === 'processing'}
              className="w-full"
            >
              {status === 'uploading' ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : status === 'processing' ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing with Gradio...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Try-On
                </>
              )}
            </Button>

            {!canGenerate && garment.file && !garment.extracted && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Garment extraction required. Please upload a valid T-shirt or Trousers image.
                </AlertDescription>
              </Alert>
            )}

            {(status === 'uploading' || status === 'processing') && (
              <div
                className="text-center text-sm text-muted-foreground space-y-1"
                role="status"
                aria-live="polite"
              >
                {status === 'uploading' ? (
                  <p>Extracting garment background...</p>
                ) : (
                  <>
                    <p className="font-medium">Processing on HuggingFace Space</p>
                    <p className="text-xs">This may take 30-60 seconds. Please wait...</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Result View */}
        {step === 'RESULT' && resultUrl && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Your Try-On Result</h2>
              <p className="text-sm text-muted-foreground">
                Use the slider to compare before and after
              </p>
            </div>

            {/* Before/After Slider */}
            <div className="relative aspect-[3/4] max-w-2xl mx-auto rounded-lg overflow-hidden border">
              {body.previewUrl && (
                <Image src={body.previewUrl} alt="Before" fill className="object-cover" />
              )}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
              >
                <Image src={resultUrl} alt="After" fill className="object-cover" />
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
              <Button variant="outline" onClick={handleRegenerate} disabled={status === 'processing'}>
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
      {step !== 'RESULT' && (
        <div className="p-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'BODY'}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {stepNumber} of 3
          </div>

          {step !== 'GENERATE' ? (
            <Button
              onClick={handleNext}
              disabled={
                (step === 'BODY' && !canProceedFromBody) ||
                (step === 'GARMENT' && !canProceedFromGarment)
              }
            >
              Continue
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
