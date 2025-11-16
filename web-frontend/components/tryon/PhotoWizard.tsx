'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { LoadingDots } from '@/components/ui/loading-spinner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useVtonStore } from '@/lib/store/useVtonStore';
import { useTryonStore } from '@/lib/tryon-store';
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  Shirt,
  Sparkles,
  Upload,
  User,
  X,
  SwitchCamera,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadBase64ImageSmart } from '@/lib/services/gradioApi';
import QualityTipsCard from './QualityTipsCard';
import ClassificationChip from './ClassificationChip';
import ClothTypeSelector from './ClothTypeSelector';
import ScrollIndicator from '@/components/ui/scroll-indicator';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessingOverlay } from './ProcessingOverlay';
import Webcam from 'react-webcam';

export default function PhotoWizard() {
  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);
  const upperFileInputRef = useRef<HTMLInputElement>(null);
  const lowerFileInputRef = useRef<HTMLInputElement>(null);
  const bodyWebcamRef = useRef<Webcam>(null);
  const garmentWebcamRef = useRef<Webcam>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Tryon Store (for onboarding)
  const { openPhotoOnboarding } = useTryonStore();

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
  const [bodyFacingMode, setBodyFacingMode] = useState<'user' | 'environment'>('environment');
  const [garmentFacingMode, setGarmentFacingMode] = useState<'user' | 'environment'>('environment');

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

  // Camera toggle functions
  const toggleBodyCamera = useCallback(() => {
    setBodyFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    toast.info(bodyFacingMode === 'user' ? 'Switched to back camera' : 'Switched to front camera');
  }, [bodyFacingMode]);

  const toggleGarmentCamera = useCallback(() => {
    setGarmentFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    toast.info(garmentFacingMode === 'user' ? 'Switched to back camera' : 'Switched to front camera');
  }, [garmentFacingMode]);

  // Body Camera functions
  const captureBodyPhoto = useCallback(async () => {
    const imageSrc = bodyWebcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error('Failed to capture photo. Please try again.');
      return;
    }

    // Convert base64 to File
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], `body-${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Stop camera before processing
    setShowBodyCamera(false);

    // Set body photo
    await setBody(file);
    toast.success('Body photo captured successfully');
  }, [setBody]);

  const handleBodyCameraError = useCallback((error: string | DOMException) => {
    console.error('Body camera error:', error);
    setShowBodyCamera(false);

    let errorMessage = 'Failed to access camera';
    if (typeof error === 'object' && error.name) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      }
    }

    toast.error(errorMessage, { duration: 5000 });
  }, []);

  // Garment Camera functions
  const captureGarmentPhoto = useCallback(async () => {
    const imageSrc = garmentWebcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error('Failed to capture photo. Please try again.');
      return;
    }

    // Convert base64 to File
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], `garment-${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Stop camera before processing
    setShowGarmentCamera(false);

    const toastId = 'garment-capture';
    toast.loading('Processing captured image...', { id: toastId });

    const skipClassification = tryOnPath === 'REFERENCE';
    const { ok, message } = await setGarmentFile(file, skipClassification);

    if (ok) {
      toast.success('Garment captured successfully', { id: toastId });
    } else {
      toast.error(message || 'Capture failed', { id: toastId });
    }
  }, [setGarmentFile, tryOnPath]);

  const handleGarmentCameraError = useCallback((error: string | DOMException) => {
    console.error('Garment camera error:', error);
    setShowGarmentCamera(false);

    let errorMessage = 'Failed to access camera';
    if (typeof error === 'object' && error.name) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      }
    }

    toast.error(errorMessage, { duration: 5000 });
  }, []);

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
    setShowBodyCamera(false);
    setShowGarmentCamera(false);
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
              {tryOnPath === 'FULL'
                ? 'Full Outfit Mode'
                : tryOnPath === 'REFERENCE'
                  ? 'Reference Mode'
                  : 'Normal Mode'}
            </span>
            <Badge variant="outline" className="text-xs">
              Step{' '}
              {step === 'BODY'
                ? '1'
                : step === 'GARMENT' || step === 'UPPER'
                  ? '2'
                  : step === 'LOWER'
                    ? '3'
                    : step === 'PREVIEW'
                      ? '4'
                      : '5'}
            </Badge>
          </div>
          <AnimatePresence mode="wait">
            {(status === 'classifying' || status === 'constructing' || status === 'processing') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-1"
              >
                <Progress value={progress} className="h-1.5" />
                <motion.p
                  key={status}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5"
                >
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {status === 'classifying' && '🔍'}
                    {status === 'constructing' && '🎨'}
                    {status === 'processing' && '✨'}
                  </motion.span>
                  {status === 'classifying' && 'Analyzing garment...'}
                  {status === 'constructing' && 'Building outfit...'}
                  {status === 'processing' && 'Generating try-on...'}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Content Area */}
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto">
        {/* PATH SELECTION */}
        {step === 'PATH_SELECT' && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">Choose Try-On Mode</h2>
              <p className="text-sm text-muted-foreground">
                Select how you want to try on garments
              </p>
            </div>

            {/* Quick Tour Button */}
            <Button
              variant="outline"
              onClick={openPhotoOnboarding}
              className="w-full gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Take a Quick Tour
            </Button>

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
                    <Badge variant="secondary" className="text-xs">
                      Recommended
                    </Badge>
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
                    <Badge variant="outline" className="text-xs">
                      Advanced
                    </Badge>
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
                    <Badge variant="outline" className="text-xs">
                      Experimental
                    </Badge>
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
                title="Body Photo - Quick Tips"
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
                      <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
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

                <Button variant="outline" size="lg" className="w-full" onClick={() => setShowBodyCamera(true)}>
                  <Camera className="h-5 w-5 mr-2" />
                  Capture with Camera
                </Button>
              </div>
            ) : showBodyCamera ? (
              <div className="space-y-3 sm:space-y-4 pb-4">
                {/* Camera Preview with Guide Overlay */}
                <div className="relative w-full aspect-[3/4] sm:max-w-lg mx-auto rounded-xl overflow-hidden border-2 border-primary/50 bg-black shadow-2xl">
                  <Webcam
                    ref={bodyWebcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: bodyFacingMode,
                      width: { ideal: 1280 },
                      height: { ideal: 720 },
                    }}
                    onUserMediaError={handleBodyCameraError}
                    className="w-full h-full object-cover"
                    mirrored={bodyFacingMode === 'user'}
                  />

                  {/* Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Center Guide Frame */}
                    <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
                      <div className="w-full h-full border-2 border-dashed border-white/40 rounded-xl" />
                    </div>

                    {/* Instructions */}
                    <div className="absolute top-3 sm:top-4 left-0 right-0 text-center px-3">
                      <div className="inline-block bg-black/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg">
                        <p className="text-white text-xs sm:text-sm font-medium">Position yourself in the frame</p>
                      </div>
                    </div>

                    {/* Camera Status Badge */}
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-red-500/90 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-[10px] sm:text-xs font-bold tracking-wide">LIVE</span>
                      </div>
                    </div>

                    {/* Camera Switch Button */}
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 hover:bg-white shadow-xl pointer-events-auto transition-all hover:scale-110"
                        onClick={toggleBodyCamera}
                      >
                        <SwitchCamera className="h-5 w-5 sm:h-6 sm:w-6 text-gray-800" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2 sm:gap-3 px-2 sm:px-0 sm:max-w-lg mx-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowBodyCamera(false)}
                    className="flex-1 h-12 sm:h-14 text-base font-semibold border-2 hover:bg-destructive/10"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                    <span className="hidden xs:inline">Cancel</span>
                    <span className="xs:hidden">✕</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={captureBodyPhoto}
                    className="flex-[2] h-12 sm:h-14 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Camera className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                    Capture Photo
                  </Button>
                </div>

                {/* Tips - Collapsible on mobile */}
                <Card className="mx-2 sm:mx-0 sm:max-w-lg sm:mx-auto p-3 sm:p-4 bg-blue-500/10 border-blue-500/20 backdrop-blur-sm">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300">Quick Tips</p>
                      <ul className="text-xs sm:text-sm text-blue-600/90 dark:text-blue-300/90 space-y-1">
                        <li className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>Stand 3-4 feet from camera</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>Ensure good lighting</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>Keep shoulders visible</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>
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
                      variant={
                        body.quality === 'GOOD'
                          ? 'default'
                          : body.quality === 'OK'
                            ? 'outline'
                            : 'destructive'
                      }
                      className="absolute top-2 left-2 text-xs"
                    >
                      Input quality: {body.quality}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => bodyFileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New
                  </Button>
                  <Button variant="outline" onClick={() => setShowBodyCamera(true)}>
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
        {step === 'GARMENT' && (tryOnPath === 'NORMAL' || tryOnPath === 'REFERENCE') && (
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
                title={
                  tryOnPath === 'REFERENCE'
                    ? 'Reference Mode - Quick Tips'
                    : 'Garment Photo - Quick Tips'
                }
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
                      <p className="text-xs text-muted-foreground">PNG, JPEG up to 10MB</p>
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
                      onClick={() => setShowGarmentCamera(true)}
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Capture with Camera
                    </Button>
                  </>
                )}
              </div>
            ) : showGarmentCamera ? (
              <div className="space-y-3 sm:space-y-4 pb-4">
                {/* Camera Preview with Guide Overlay */}
                <div className="relative w-full aspect-square sm:max-w-lg mx-auto rounded-xl overflow-hidden border-2 border-primary/50 bg-black shadow-2xl">
                  <Webcam
                    ref={garmentWebcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: garmentFacingMode,
                      width: { ideal: 1280 },
                      height: { ideal: 720 },
                    }}
                    onUserMediaError={handleGarmentCameraError}
                    className="w-full h-full object-cover"
                    mirrored={garmentFacingMode === 'user'}
                  />

                  {/* Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Center Guide Frame */}
                    <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-14">
                      <div className="w-full h-full border-2 border-dashed border-white/40 rounded-xl" />
                    </div>

                    {/* Instructions */}
                    <div className="absolute top-3 sm:top-4 left-0 right-0 text-center px-3">
                      <div className="inline-block bg-black/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg">
                        <p className="text-white text-xs sm:text-sm font-medium">
                          {tryOnPath === 'REFERENCE' ? 'Center person in frame' : 'Center garment in frame'}
                        </p>
                      </div>
                    </div>

                    {/* Camera Status Badge */}
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-red-500/90 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-[10px] sm:text-xs font-bold tracking-wide">LIVE</span>
                      </div>
                    </div>

                    {/* Corner Guides - Responsive */}
                    <div className="absolute top-6 left-6 sm:top-10 sm:left-10 w-6 h-6 sm:w-10 sm:h-10 border-t-2 border-l-2 border-white/70 rounded-tl-lg" />
                    <div className="absolute top-6 right-6 sm:top-10 sm:right-10 w-6 h-6 sm:w-10 sm:h-10 border-t-2 border-r-2 border-white/70 rounded-tr-lg" />
                    <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 w-6 h-6 sm:w-10 sm:h-10 border-b-2 border-l-2 border-white/70 rounded-bl-lg" />
                    <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-6 h-6 sm:w-10 sm:h-10 border-b-2 border-r-2 border-white/70 rounded-br-lg" />

                    {/* Camera Switch Button */}
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 hover:bg-white shadow-xl pointer-events-auto transition-all hover:scale-110"
                        onClick={toggleGarmentCamera}
                      >
                        <SwitchCamera className="h-5 w-5 sm:h-6 sm:w-6 text-gray-800" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2 sm:gap-3 px-2 sm:px-0 sm:max-w-lg mx-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowGarmentCamera(false)}
                    className="flex-1 h-12 sm:h-14 text-base font-semibold border-2 hover:bg-destructive/10"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                    <span className="hidden xs:inline">Cancel</span>
                    <span className="xs:hidden">✕</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={captureGarmentPhoto}
                    className="flex-[2] h-12 sm:h-14 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Camera className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                    Capture Photo
                  </Button>
                </div>

                {/* Tips */}
                <Card className="mx-2 sm:mx-0 sm:max-w-lg sm:mx-auto p-3 sm:p-4 bg-purple-500/10 border-purple-500/20 backdrop-blur-sm">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mt-0.5 shrink-0" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm sm:text-base font-semibold text-purple-700 dark:text-purple-300">
                        {tryOnPath === 'REFERENCE' ? 'Reference Photo Tips' : 'Garment Photo Tips'}
                      </p>
                      <ul className="text-xs sm:text-sm text-purple-600/90 dark:text-purple-300/90 space-y-1">
                        {tryOnPath === 'REFERENCE' ? (
                          <>
                            <li className="flex items-start gap-1.5">
                              <span className="text-purple-500 font-bold">•</span>
                              <span>Full body visible, front-facing</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-purple-500 font-bold">•</span>
                              <span>Good lighting, no harsh shadows</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-purple-500 font-bold">•</span>
                              <span>Clear outfit details visible</span>
                            </li>
                          </>
                        ) : (
                          <>
                            <li className="flex items-start gap-1.5">
                              <span className="text-purple-500 font-bold">•</span>
                              <span>Lay garment flat or hang on wall</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-purple-500 font-bold">•</span>
                              <span>Use plain background for best results</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-purple-500 font-bold">•</span>
                              <span>Avoid shadows and wrinkles</span>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </Card>
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
                        <Badge variant="secondary">{garment.classification.label}</Badge>
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
                    <LoadingDots size="md" variant="primary" />
                    <span>Analyzing</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => garmentFileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New
                  </Button>
                  {tryOnPath !== 'REFERENCE' && (
                    <Button variant="outline" onClick={() => setShowGarmentCamera(true)}>
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
              <p className="text-sm text-muted-foreground">Shirt, t-shirt, top, or jacket</p>
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
                    <p className="text-xs text-muted-foreground">PNG, JPEG up to 10MB</p>
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
                      <Badge variant="secondary">{upperGarment.classification.label}</Badge>
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
              <p className="text-sm text-muted-foreground">Pants, jeans, skirt, or shorts</p>
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
                    <p className="text-xs text-muted-foreground">PNG, JPEG up to 10MB</p>
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
                      <Badge variant="secondary">{lowerGarment.classification.label}</Badge>
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
              <p className="text-sm text-muted-foreground">Your complete outfit is ready</p>
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

        {/* GENERATE STEP - 3-Rail Pro Canvas Layout */}
        {step === 'GENERATE' && !resultUrl && (
          <div className="w-full px-4 sm:px-8 py-6">
            {/* Desktop: 3-Rail Layout (≥1440px) */}
            <div className="mx-auto max-w-[1600px]">
              {/* Mobile/Tablet: Stacked Layout (< 1280px) */}
              <div className="block xl:hidden space-y-4">
                {/* Title - Mobile Only */}
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold">Options & Generate</h2>
                </div>

                {/* Detection + Cloth Type */}
                {garment.classification && tryOnPath === 'NORMAL' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Auto-selected:</span>
                    <ClassificationChip
                      label={garment.classification.label}
                      confidence={garment.classification.confidence}
                      size="sm"
                    />
                  </div>
                )}

                <ClothTypeSelector
                  value={options.clothType || 'upper'}
                  onChange={(value) => setOptions({ clothType: value })}
                  availableTypes={getAvailableClothTypes()}
                  disabledTypes={getDisabledClothTypes()}
                  preselectState={getPreselectState()}
                  detectedLabel={garment.classification?.label}
                  confidence={garment.classification?.confidence}
                />

                {/* Previews */}
                <ProcessingOverlay
                  isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                  lockMessage="Preview locked"
                  showPulse={false}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-2 space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Body</p>
                    {body.previewUrl && (
                      <div className="relative aspect-[3/4] rounded-md overflow-hidden border">
                        <Image src={body.previewUrl} alt="Body" fill className="object-contain" />
                      </div>
                    )}
                  </Card>
                  <Card className="p-2 space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {tryOnPath === 'FULL' ? 'Outfit' : 'Garment'}
                    </p>
                    {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                      <div className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted/20">
                        <Image
                          src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                          alt="Garment"
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                    )}
                  </Card>
                  </div>
                </ProcessingOverlay>

                {/* Generate Button */}
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!canProceedToGenerate()}
                  loading={status === 'processing'}
                  loadingText={`Processing ${progress}%`}
                  className="w-full"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Try-On
                </Button>

                {/* Progress Bar - Mobile */}
                <AnimatePresence mode="wait">
                  {status === 'processing' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                    >
                      <Card className="p-4 space-y-3 relative overflow-hidden">
                        {/* Animated background gradient */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5"
                          animate={{
                            x: ['-100%', '100%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        />

                        <div className="relative space-y-3">
                          {/* Processing header with animated dots */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <motion.div
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                                className="h-2 w-2 rounded-full bg-primary"
                              />
                              <span className="text-sm font-medium">Processing</span>
                            </div>
                            <motion.span
                              key={progress}
                              initial={{ scale: 1.2, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2 }}
                              className="text-sm font-bold text-primary"
                            >
                              {progress}%
                            </motion.span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                          </div>

                          {/* Info text with pulsing icon */}
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <motion.div
                              animate={{
                                opacity: [0.3, 1, 0.3],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                            >
                              <Sparkles className="h-3 w-3" />
                            </motion.div>
                            <span>This may take 30-60 seconds...</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Advanced - Collapsed on Mobile */}
                <ProcessingOverlay
                  isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                  lockMessage="Settings locked"
                >
                  <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="options">
                    <AccordionTrigger className="text-sm">Advanced Settings</AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Inference Steps</Label>
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
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Guidance Scale</Label>
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
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  </Accordion>
                </ProcessingOverlay>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Desktop: 3-Rail Grid (≥ 1280px) */}
              <div className="hidden xl:grid xl:grid-cols-12 xl:gap-6">
                {/* LEFT RAIL - Controls (3 cols, sticky) */}
                <div className="col-span-3 space-y-4 sticky top-20 self-start">
                  <ProcessingOverlay
                    isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                    lockMessage="Options locked during processing"
                  >
                    <Card className="p-4 space-y-4">
                      <h3 className="text-lg font-semibold">Garment Options</h3>

                    {/* Inline Detection + Cloth Type */}
                    {garment.classification && tryOnPath === 'NORMAL' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Auto-selected:</span>
                          <ClassificationChip
                            label={garment.classification.label}
                            confidence={garment.classification.confidence}
                            size="sm"
                          />
                        </div>
                      </div>
                    )}

                    <ClothTypeSelector
                      value={options.clothType || 'upper'}
                      onChange={(value) => setOptions({ clothType: value })}
                      availableTypes={getAvailableClothTypes()}
                      disabledTypes={getDisabledClothTypes()}
                      preselectState={getPreselectState()}
                      detectedLabel={garment.classification?.label}
                      confidence={garment.classification?.confidence}
                    />

                    {/* Mini Preflight Checklist */}
                    {(() => {
                      const preflight = getPreflightChecks();
                      if (tryOnPath === 'FULL' && !preflight.outfitReady) return null;

                      return (
                        <div className="space-y-1.5 text-xs">
                          <p className="font-medium text-muted-foreground">Quick Checks</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {preflight.resolutionOK ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                              )}
                              <span
                                className={
                                  preflight.resolutionOK
                                    ? 'text-muted-foreground'
                                    : 'text-amber-500'
                                }
                              >
                                Resolution
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {preflight.brightnessOK ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                              )}
                              <span
                                className={
                                  preflight.brightnessOK
                                    ? 'text-muted-foreground'
                                    : 'text-amber-500'
                                }
                              >
                                Brightness
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {preflight.clothTypeSelected ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <X className="h-3 w-3 text-red-500" />
                              )}
                              <span
                                className={
                                  preflight.clothTypeSelected
                                    ? 'text-muted-foreground'
                                    : 'text-red-500'
                                }
                              >
                                Cloth type
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    </Card>
                  </ProcessingOverlay>
                </div>

                {/* CENTER RAIL - Preview Stage (6 cols) */}
                <div className="col-span-6">
                  <ProcessingOverlay
                    isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                    lockMessage="Preview locked during processing"
                    showPulse={false}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {/* Body Preview Frame */}
                      <Card className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Body Photo</p>
                        {body.quality && (
                          <Badge
                            variant={
                              body.quality === 'GOOD'
                                ? 'default'
                                : body.quality === 'OK'
                                  ? 'outline'
                                  : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {body.quality}
                          </Badge>
                        )}
                      </div>
                      {body.previewUrl && (
                        <div
                          className="relative rounded-lg overflow-hidden border bg-muted/20"
                          style={{ height: 'clamp(420px, 56vh, 680px)' }}
                        >
                          <Image src={body.previewUrl} alt="Body" fill className="object-contain" />
                        </div>
                      )}
                    </Card>

                    {/* Garment Preview Frame */}
                    <Card className="p-3 space-y-2">
                      <p className="text-sm font-medium">
                        {tryOnPath === 'FULL'
                          ? 'Outfit'
                          : tryOnPath === 'REFERENCE'
                            ? 'Reference'
                            : 'Garment'}
                      </p>
                      {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                        <div
                          className="relative rounded-lg overflow-hidden border bg-muted/20"
                          style={{ height: 'clamp(420px, 56vh, 680px)' }}
                        >
                          <Image
                            src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                            alt="Garment"
                            fill
                            className="object-contain p-4"
                          />
                        </div>
                      )}
                    </Card>
                    </div>
                  </ProcessingOverlay>
                </div>

                {/* RIGHT RAIL - Actions (3 cols, sticky) */}
                <div className="col-span-3 space-y-4 sticky top-20 self-start">
                  <Card className="p-4 space-y-4">
                    {/* Generate Button */}
                    <Button
                      size="lg"
                      onClick={handleGenerate}
                      disabled={!canProceedToGenerate()}
                      loading={status === 'processing'}
                      loadingText="Generating..."
                      className="w-full"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Try-On
                    </Button>

                    {/* Inline Progress */}
                    <AnimatePresence mode="wait">
                      {status === 'processing' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                          className="relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-3"
                        >
                          {/* Animated shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                            animate={{
                              x: ['-200%', '200%'],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                          />

                          <div className="relative space-y-2">
                            {/* Processing header */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <motion.div
                                  animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.4, 1, 0.4],
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                  className="h-1.5 w-1.5 rounded-full bg-primary"
                                />
                                <span className="font-medium">Processing</span>
                              </div>
                              <motion.span
                                key={progress}
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="font-bold text-primary"
                              >
                                {progress}%
                              </motion.span>
                            </div>

                            {/* Progress bar */}
                            <Progress value={progress} className="h-1.5" />

                            {/* Info text */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <motion.div
                                animate={{
                                  rotate: [0, 360],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'linear',
                                }}
                              >
                                <Sparkles className="h-3 w-3" />
                              </motion.div>
                              <span>This may take 30-60 seconds...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {error && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Advanced Settings */}
                    <ProcessingOverlay
                      isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                      lockMessage="Settings locked during processing"
                    >
                      <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="advanced" className="border-none">
                        <AccordionTrigger className="text-sm py-2">
                          Advanced Settings
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs" title="Number of diffusion steps">
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
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs" title="Guidance strength">
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
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      </Accordion>
                    </ProcessingOverlay>

                    {/* Info Box */}
                    <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                      Processing uses shared GPU. First run may warm up.
                    </div>
                  </Card>
                </div>
              </div>
            </div>
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
              <p className="text-sm text-muted-foreground">Your virtual try-on is ready</p>
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
              <Button size="lg" onClick={handleDownload} className="w-full">
                <Download className="h-5 w-5 mr-2" />
                Download Result
              </Button>
              <Button size="lg" variant="outline" onClick={handleNewTryOn} className="w-full">
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
                    Synthetic preview; colors and fit may vary. Your try-on image is ready to
                    download or share.
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

      {/* Scroll Indicator - Shows when content below fold */}
      {step !== 'PATH_SELECT' && step !== 'RESULT' && (
        <ScrollIndicator
          containerRef={contentScrollRef}
          text="Scroll down"
          hideThreshold={50}
          mobileOnly={false}
        />
      )}
    </div>
  );
}
