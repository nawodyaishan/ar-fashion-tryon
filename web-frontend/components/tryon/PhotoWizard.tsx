'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useVtonStore } from '@/lib/store/useVtonStore';
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
  Shirt,
  User,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadBase64ImageSmart } from '@/lib/services/gradioApi';
import QualityTipsCard from './QualityTipsCard';
import ClassificationChip from './ClassificationChip';
import ClothTypeSelector from './ClothTypeSelector';
import PreflightChecklist from './PreflightChecklist';

export default function PhotoWizard() {
  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);
  const upperFileInputRef = useRef<HTMLInputElement>(null);
  const lowerFileInputRef = useRef<HTMLInputElement>(null);
  const bodyVideoRef = useRef<HTMLVideoElement>(null);
  const bodyCanvasRef = useRef<HTMLCanvasElement>(null);
  const garmentVideoRef = useRef<HTMLVideoElement>(null);
  const garmentCanvasRef = useRef<HTMLCanvasElement>(null);

  // VTON Store
  const {
    tryOnPath,
    step,
    setPath,
    setStep,
    body,
    garment,
    upperGarment,
    lowerGarment,
    outfit,
    options,
    setBody,
    setGarmentFile,
    setUpperGarment,
    setLowerGarment,
    constructOutfitPreview,
    setOptions,
    status,
    error,
    resultUrl,
    tryOn,
    reset,
    getAvailableClothTypes,
    getDisabledClothTypes,
    getPreselectState,
    getPreflightChecks,
    canProceedToGenerate,
  } = useVtonStore();

  const [progress, setProgress] = useState(0);
  const [showBodyCamera, setShowBodyCamera] = useState(false);
  const [showGarmentCamera, setShowGarmentCamera] = useState(false);
  const [bodyCameraStream, setBodyCameraStream] = useState<MediaStream | null>(null);
  const [garmentCameraStream, setGarmentCameraStream] = useState<MediaStream | null>(null);

  // Progress tracking
  useEffect(() => {
    if (status === 'classifying') {
      setProgress(20);
    } else if (status === 'constructing') {
      setProgress(40);
    } else if (status === 'uploading') {
      setProgress(50);
    } else if (status === 'processing') {
      setProgress(60);
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 2 : prev));
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === 'done') {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [status]);

  // Body Camera functions
  const startBodyCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
      });
      setBodyCameraStream(stream);
      if (bodyVideoRef.current) {
        bodyVideoRef.current.srcObject = stream;
      }
      setShowBodyCamera(true);
      toast.success('Camera started');
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Failed to access camera');
    }
  };

  const captureBodyPhoto = async () => {
    if (!bodyVideoRef.current || !bodyCanvasRef.current) return;

    const video = bodyVideoRef.current;
    const canvas = bodyCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `body-${Date.now()}.jpg`, { type: 'image/jpeg' });

      setBody(file);
      toast.success('Body photo captured');
      stopBodyCamera();
    }, 'image/jpeg', 0.95);
  };

  const stopBodyCamera = () => {
    if (bodyCameraStream) {
      bodyCameraStream.getTracks().forEach((track) => track.stop());
      setBodyCameraStream(null);
    }
    setShowBodyCamera(false);
  };

  // Garment Camera functions
  const startGarmentCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
      });
      setGarmentCameraStream(stream);
      if (garmentVideoRef.current) {
        garmentVideoRef.current.srcObject = stream;
      }
      setShowGarmentCamera(true);
      toast.success('Camera started');
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Failed to access camera');
    }
  };

  const captureGarmentPhoto = async () => {
    if (!garmentVideoRef.current || !garmentCanvasRef.current) return;

    const video = garmentVideoRef.current;
    const canvas = garmentCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `garment-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const toastId = 'garment-capture';
      toast.loading('Processing captured image...', { id: toastId });

      const skipClassification = tryOnPath === 'REFERENCE';
      const { ok, message } = await setGarmentFile(file, skipClassification);

      if (ok) {
        toast.success('Garment captured', { id: toastId });
        stopGarmentCamera();
      } else {
        toast.error(message || 'Capture failed', { id: toastId });
      }
    }, 'image/jpeg', 0.95);
  };

  const stopGarmentCamera = () => {
    if (garmentCameraStream) {
      garmentCameraStream.getTracks().forEach((track) => track.stop());
      setGarmentCameraStream(null);
    }
    setShowGarmentCamera(false);
  };

  // Cleanup camera streams on unmount
  useEffect(() => {
    return () => {
      if (bodyCameraStream) {
        bodyCameraStream.getTracks().forEach((track) => track.stop());
      }
      if (garmentCameraStream) {
        garmentCameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [bodyCameraStream, garmentCameraStream]);

  // Upload handlers
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

  const handleGarmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

    const toastId = 'garment-upload';
    toast.loading('Uploading garment...', { id: toastId });

    const skipClassification = tryOnPath === 'REFERENCE';
    const { ok, message } = await setGarmentFile(file, skipClassification);

    if (ok) toast.success('Garment uploaded', { id: toastId });
    else toast.error(message || 'Garment upload failed', { id: toastId });
  };

  const handleUpperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

    const toastId = 'upper-upload';
    toast.loading('Uploading upper garment...', { id: toastId });

    const { ok, message } = await setUpperGarment(file);

    if (ok) toast.success('Upper garment uploaded', { id: toastId });
    else toast.error(message || 'Upload failed', { id: toastId });
  };

  const handleLowerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

    const toastId = 'lower-upload';
    toast.loading('Uploading lower garment...', { id: toastId });

    const { ok, message } = await setLowerGarment(file);

    if (ok) toast.success('Lower garment uploaded', { id: toastId });
    else toast.error(message || 'Upload failed', { id: toastId });
  };

  const handleConstructOutfit = async () => {
    toast.loading('Constructing outfit...', { id: 'construct' });
    await constructOutfitPreview();
    if (error) {
      toast.error(error, { id: 'construct' });
    } else {
      toast.success('Outfit constructed successfully', { id: 'construct' });
    }
  };

  const handleGenerate = async () => {
    setProgress(0);
    await tryOn();
    if (error) {
      toast.error(error);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    downloadBase64ImageSmart(resultUrl, 'photo-tryon');
  };

  const handleNewTryOn = () => {
    stopBodyCamera();
    stopGarmentCamera();
    setProgress(0);
    reset();
    toast.info('Starting new try-on');
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Progress Indicator - Mobile First */}
      {step !== 'PATH_SELECT' && step !== 'RESULT' && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="font-medium">
              {tryOnPath === 'FULL' ? 'Full Outfit Mode' : tryOnPath === 'REFERENCE' ? 'Reference Mode' : 'Normal Mode'}
            </span>
            <Badge variant="outline" className="text-xs">
              Step {step === 'BODY' ? '1' : step === 'GARMENT' || step === 'UPPER' ? '2' : step === 'LOWER' ? '3' : step === 'PREVIEW' ? '4' : '5'}
            </Badge>
          </div>
          {(status === 'classifying' || status === 'constructing' || status === 'processing') && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">
                {status === 'classifying' && 'Analyzing garment...'}
                {status === 'constructing' && 'Building outfit...'}
                {status === 'processing' && 'Generating try-on...'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* PATH SELECTION */}
        {step === 'PATH_SELECT' && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">Choose Try-On Mode</h2>
              <p className="text-sm text-muted-foreground">
                Select how you want to try on garments
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {/* NORMAL Path */}
              <Card
                className="p-4 sm:p-6 cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                onClick={() => setPath('NORMAL')}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Shirt className="h-6 w-6 sm:h-7 sm:w-7 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg mb-1">Single Garment</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Try on one item (shirt, pants, or full dress)
                    </p>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </Card>

              {/* FULL Path */}
              <Card
                className="p-4 sm:p-6 cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                onClick={() => setPath('FULL')}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Layers className="h-6 w-6 sm:h-7 sm:w-7 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg mb-1">Complete Outfit</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Combine top and bottom to create full outfit
                    </p>
                    <Badge variant="outline" className="text-xs">Advanced</Badge>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </Card>

              {/* REFERENCE Path */}
              <Card
                className="p-4 sm:p-6 cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                onClick={() => setPath('REFERENCE')}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 sm:h-7 sm:w-7 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg mb-1">Full Reference</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Use a full-body photo as style reference
                    </p>
                    <Badge variant="outline" className="text-xs">Experimental</Badge>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* STEP 1: BODY PHOTO */}
        {step === 'BODY' && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Upload Body Photo</h2>
              <p className="text-sm text-muted-foreground">
                Upload a clear, front-facing upper-body photo. Good lighting. Plain background.
              </p>
            </div>

            {/* Quality Tips */}
            {!body.file && (
              <QualityTipsCard
                title="Body Photo — Quick Tips"
                tips={[
                  'Face camera straight on; shoulders fully visible',
                  'Bright, even light in front of you',
                  'Plain background; avoid busy rooms',
                  'Arms relaxed; avoid crossing',
                  'Image width ≥ 1024 px for best quality',
                ]}
              />
            )}

            {!body.file && !showBodyCamera ? (
              <div className="space-y-3">
                <Card
                  className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                  onClick={() => bodyFileInputRef.current?.click()}
                >
                  <div className="p-8 sm:p-12 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Tap to upload</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={startBodyCamera}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capture with Camera
                </Button>
              </div>
            ) : showBodyCamera ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-black">
                  <video
                    ref={bodyVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <canvas ref={bodyCanvasRef} className="hidden" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={stopBodyCamera}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={captureBodyPhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </div>
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

                  {/* Quality badge */}
                  {body.quality && (
                    <Badge
                      variant={body.quality === 'GOOD' ? 'default' : body.quality === 'OK' ? 'outline' : 'destructive'}
                      className="absolute top-2 left-2 text-xs"
                    >
                      Input quality: {body.quality}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => bodyFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New
                  </Button>
                  <Button
                    variant="outline"
                    onClick={startBodyCamera}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
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

        {/* STEP 2: GARMENT UPLOAD (NORMAL & REFERENCE) */}
        {(step === 'GARMENT' && (tryOnPath === 'NORMAL' || tryOnPath === 'REFERENCE')) && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">
                {tryOnPath === 'REFERENCE' ? 'Upload Reference Photo' : 'Upload Garment'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tryOnPath === 'REFERENCE'
                  ? 'Full-body photo of person wearing the style you want'
                  : 'Upload garment photo or capture with camera'}
              </p>
            </div>

            {/* Quality Tips */}
            {!garment.file && (
              <QualityTipsCard
                title={tryOnPath === 'REFERENCE' ? 'Reference Mode — Quick Tips' : 'Garment Photo — Quick Tips'}
                tips={
                  tryOnPath === 'REFERENCE'
                    ? [
                        'Full body, front view; minimal occlusions',
                        'Outfit clearly visible; avoid heavy filters',
                        'Similar lighting to your body photo helps',
                      ]
                    : [
                        'Front view, laid flat or on hanger',
                        'Plain or transparent background (PNG preferred)',
                        'Centered, no severe wrinkles',
                        'Recommended width ≥ 1024 px',
                      ]
                }
              />
            )}

            {!garment.file && !showGarmentCamera ? (
              <div className="space-y-3">
                <Card
                  className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                  onClick={() => garmentFileInputRef.current?.click()}
                >
                  <div className="p-8 sm:p-10 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Tap to upload</p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPEG up to 10MB
                      </p>
                    </div>
                  </div>
                </Card>

                {tryOnPath !== 'REFERENCE' && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={startGarmentCamera}
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Capture with Camera
                    </Button>
                  </>
                )}
              </div>
            ) : showGarmentCamera ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-black">
                  <video
                    ref={garmentVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={garmentCanvasRef} className="hidden" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={stopGarmentCamera}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={captureGarmentPhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border bg-muted/20">
                  <Image
                    src={garment.previewUrl!}
                    alt="Garment"
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

                {garment.classification && tryOnPath === 'NORMAL' && (
                  <Card className="p-3 bg-muted/50">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Detected Type</span>
                        <Badge variant="secondary">
                          {garment.classification.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Confidence</span>
                        <span className="font-medium">
                          {(garment.classification.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </Card>
                )}

                {status === 'classifying' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => garmentFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New
                  </Button>
                  {tryOnPath !== 'REFERENCE' && (
                    <Button
                      variant="outline"
                      onClick={startGarmentCamera}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture
                    </Button>
                  )}
                </div>
              </div>
            )}

            <input
              ref={garmentFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleGarmentUpload}
              className="hidden"
            />
          </div>
        )}

        {/* STEP 2: UPPER GARMENT (FULL MODE) */}
        {step === 'UPPER' && tryOnPath === 'FULL' && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Upload Upper Garment</h2>
              <p className="text-sm text-muted-foreground">
                Shirt, t-shirt, top, or jacket
              </p>
            </div>

            {!upperGarment.file ? (
              <Card
                className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                onClick={() => upperFileInputRef.current?.click()}
              >
                <div className="p-8 sm:p-10 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Shirt className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Upload Upper Garment</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG up to 10MB
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border bg-muted/20">
                  <Image
                    src={upperGarment.previewUrl!}
                    alt="Upper garment"
                    fill
                    className="object-contain p-4"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setUpperGarment(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {upperGarment.classification && (
                  <Card className="p-3 bg-blue-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Detected</span>
                      <Badge variant="secondary">
                        {upperGarment.classification.label}
                      </Badge>
                    </div>
                  </Card>
                )}

                <Button
                  variant="outline"
                  onClick={() => upperFileInputRef.current?.click()}
                  className="w-full"
                >
                  Replace Upper Garment
                </Button>
              </div>
            )}

            <input
              ref={upperFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpperUpload}
              className="hidden"
            />
          </div>
        )}

        {/* STEP 3: LOWER GARMENT (FULL MODE) */}
        {step === 'LOWER' && tryOnPath === 'FULL' && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Upload Lower Garment</h2>
              <p className="text-sm text-muted-foreground">
                Pants, jeans, skirt, or shorts
              </p>
            </div>

            {!lowerGarment.file ? (
              <Card
                className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                onClick={() => lowerFileInputRef.current?.click()}
              >
                <div className="p-8 sm:p-10 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Layers className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Upload Lower Garment</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG up to 10MB
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border bg-muted/20">
                  <Image
                    src={lowerGarment.previewUrl!}
                    alt="Lower garment"
                    fill
                    className="object-contain p-4"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setLowerGarment(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {lowerGarment.classification && (
                  <Card className="p-3 bg-purple-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Detected</span>
                      <Badge variant="secondary">
                        {lowerGarment.classification.label}
                      </Badge>
                    </div>
                  </Card>
                )}

                <Button
                  variant="outline"
                  onClick={() => lowerFileInputRef.current?.click()}
                  className="w-full"
                >
                  Replace Lower Garment
                </Button>
              </div>
            )}

            <input
              ref={lowerFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLowerUpload}
              className="hidden"
            />
          </div>
        )}

        {/* STEP 4: OUTFIT PREVIEW (FULL MODE) */}
        {step === 'PREVIEW' && tryOnPath === 'FULL' && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Outfit Preview</h2>
              <p className="text-sm text-muted-foreground">
                Your complete outfit is ready
              </p>
            </div>

            {outfit.url && (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden border bg-muted/20">
                  <Image
                    src={outfit.url}
                    alt="Constructed outfit"
                    fill
                    className="object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Upper</p>
                    <p className="text-sm font-medium">{outfit.upperLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {(outfit.upperConfidence! * 100).toFixed(0)}% match
                    </p>
                  </Card>
                  <Card className="p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Lower</p>
                    <p className="text-sm font-medium">{outfit.lowerLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {(outfit.lowerConfidence! * 100).toFixed(0)}% match
                    </p>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GENERATE STEP */}
        {step === 'GENERATE' && !resultUrl && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Options & Generate</h2>
              <p className="text-sm text-muted-foreground">
                Check selections and adjust settings before generating
              </p>
            </div>

            {/* Classification Summary Chips */}
            {garment.classification && tryOnPath === 'NORMAL' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">Detected:</span>
                <ClassificationChip
                  label={garment.classification.label}
                  confidence={garment.classification.confidence}
                  size="md"
                />
              </div>
            )}

            {/* Cloth Type Selector with Preselection Logic */}
            <ClothTypeSelector
              value={options.clothType || 'upper'}
              onChange={(value) => setOptions({ clothType: value })}
              availableTypes={getAvailableClothTypes()}
              disabledTypes={getDisabledClothTypes()}
              preselectState={getPreselectState()}
              detectedLabel={garment.classification?.label}
              confidence={garment.classification?.confidence}
            />

            <div className="grid grid-cols-2 gap-3">
              {/* Body Preview */}
              <Card className="p-3 space-y-2">
                <p className="text-xs font-medium">Body Photo</p>
                {body.previewUrl && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border">
                    <Image src={body.previewUrl} alt="Body" fill className="object-cover" />
                  </div>
                )}
              </Card>

              {/* Garment/Outfit Preview */}
              <Card className="p-3 space-y-2">
                <p className="text-xs font-medium">
                  {tryOnPath === 'FULL' ? 'Outfit' : tryOnPath === 'REFERENCE' ? 'Reference' : 'Garment'}
                </p>
                {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted/20">
                    <Image
                      src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                      alt="Garment"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                )}
              </Card>
            </div>

            {/* Advanced Options - Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="options">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center justify-between w-full pr-2">
                    <span>Advanced Settings</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs" title="Number of diffusion steps (higher = better quality, slower)">
                          Inference Steps
                        </Label>
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
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs" title="How closely to follow the prompt (1.0-10.0)">
                          Guidance Scale
                        </Label>
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
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Preflight Validation */}
            {(() => {
              const preflight = getPreflightChecks();
              const allPassed = preflight.resolutionOK && preflight.brightnessOK && preflight.requiredImagesOK && preflight.clothTypeSelected;

              if (tryOnPath === 'FULL' && !preflight.outfitReady) {
                return null; // Don't show preflight for outfit construction
              }

              const failedChecks = [
                !preflight.resolutionOK && { label: 'Resolution check', passed: false, message: 'Image resolution is too low' },
                !preflight.clothTypeSelected && { label: 'Cloth type', passed: false, message: 'Choose a cloth type to continue' },
                !preflight.requiredImagesOK && { label: 'Images', passed: false, message: 'Upload required images' },
              ].filter(Boolean) as { label: string; passed: boolean; message: string }[];

              return (
                <PreflightChecklist
                  checks={failedChecks}
                  allPassed={allPassed}
                />
              );
            })()}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canProceedToGenerate() || status === 'processing'}
              className="w-full"
            >
              {status === 'processing' ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Try-On
                </>
              )}
            </Button>

            {status === 'processing' && (
              <Card className="p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Generating try-on...</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  This may take 30-60 seconds. Please wait...
                </p>
              </Card>
            )}
          </div>
        )}

        {/* RESULT VIEW */}
        {step === 'RESULT' && resultUrl && (
          <div className="p-4 space-y-4 max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Check className="h-6 w-6 text-green-500" />
                <h2 className="text-2xl font-bold">Try-On Complete!</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Your virtual try-on is ready
              </p>
            </div>

            {/* Result Image */}
            <Card className="overflow-hidden">
              <div className="relative aspect-[3/4] bg-muted/20">
                <Image
                  src={resultUrl}
                  alt="Try-on result"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </Card>

            {/* Input Preview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Your Photo</span>
                </div>
                {body.previewUrl && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border">
                    <Image src={body.previewUrl} alt="Body" fill className="object-cover" />
                  </div>
                )}
              </Card>

              <Card className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium">
                    {tryOnPath === 'FULL' ? 'Outfit' : 'Garment'}
                  </span>
                </div>
                {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                  <div className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted/20">
                    <Image
                      src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                      alt="Garment"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                )}
              </Card>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                onClick={handleDownload}
                className="w-full"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Result
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleNewTryOn}
                className="w-full"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Another Outfit
              </Button>
            </div>

            {/* Success Message */}
            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Processing Complete</p>
                  <p className="text-xs text-muted-foreground">
                    Synthetic preview; colors and fit may vary. Your try-on image is ready to download or share.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation Footer - Mobile First */}
      {step !== 'PATH_SELECT' && step !== 'RESULT' && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'BODY') {
                  setStep('PATH_SELECT');
                } else if (step === 'GARMENT' || step === 'UPPER') {
                  setStep('BODY');
                } else if (step === 'LOWER') {
                  setStep('UPPER');
                } else if (step === 'PREVIEW') {
                  setStep('LOWER');
                } else if (step === 'GENERATE') {
                  if (tryOnPath === 'FULL') setStep('PREVIEW');
                  else setStep('GARMENT');
                }
              }}
              className="flex-1 sm:flex-initial"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              onClick={() => {
                if (step === 'BODY' && body.file) {
                  if (tryOnPath === 'FULL') setStep('UPPER');
                  else setStep('GARMENT');
                } else if (step === 'GARMENT' && garment.file) {
                  setStep('GENERATE');
                } else if (step === 'UPPER' && upperGarment.file) {
                  setStep('LOWER');
                } else if (step === 'LOWER' && lowerGarment.file) {
                  handleConstructOutfit();
                } else if (step === 'PREVIEW' && outfit.url) {
                  setStep('GENERATE');
                }
              }}
              disabled={
                (step === 'BODY' && !body.file) ||
                (step === 'GARMENT' && !garment.file) ||
                (step === 'UPPER' && !upperGarment.file) ||
                (step === 'LOWER' && !lowerGarment.file) ||
                (step === 'PREVIEW' && !outfit.url) ||
                step === 'GENERATE'
              }
              className="flex-1 sm:flex-initial"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
