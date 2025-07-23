'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  HelpCircle,
  Upload,
  RotateCcw,
  Play,
  Maximize2,
  Github,
  CheckCircle,
  Camera,
  Shirt,
  AlertCircle,
  Sparkles,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadCardProps {
  title: string;
  description: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  icon: React.ReactNode;
  step: number;
}

function UploadCard({ title, description, file, onFileSelect, icon, step }: UploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) => file.type.startsWith('image/'));
    if (imageFile) {
      onFileSelect(imageFile);
      toast.success(`${title} uploaded successfully`, {
        icon: <CheckCircle className="w-4 h-4" />,
      });
    } else {
      toast.error('Please upload a valid image file', {
        icon: <AlertCircle className="w-4 h-4" />,
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      toast.success(`${title} uploaded successfully`, {
        icon: <CheckCircle className="w-4 h-4" />,
      });
    }
  };

  return (
    <Card
      className={`group relative transition-all duration-500 hover:shadow-xl ${
        isDragOver
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 scale-[1.02]'
          : file
            ? 'border-green-500 bg-green-50 dark:bg-green-950/50'
            : 'border-border hover:border-primary/50'
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="w-8 h-8 rounded-full p-0 flex items-center justify-center"
          >
            {step}
          </Badge>
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {file && (
            <Badge variant="secondary" className="ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent>
        <div
          className={`relative h-56 border-2 border-dashed rounded-xl transition-all duration-300 ${
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${file ? 'p-2' : 'p-8'} group-hover:shadow-inner`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
          {file ? (
            <div className="relative w-full h-full group/image">
              <Image
                src={URL.createObjectURL(file)}
                alt={title}
                fill
                className="object-cover rounded-lg transition-all duration-300 group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  className="opacity-0 group-hover/image:opacity-100 transition-all duration-300"
                  onClick={() => onFileSelect(null)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Replace
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 text-center h-full">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Upload an image</h3>
                <p className="text-sm text-muted-foreground">
                  Drag & drop your image here, or{' '}
                  <label className="text-primary cursor-pointer hover:underline font-medium">
                    browse files
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </label>
                </p>
                <p className="text-xs text-muted-foreground">Supports JPG, PNG, WebP up to 10MB</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FitControls({
  disabled,
  scale,
  offsetX,
  offsetY,
  onScaleChange,
  onOffsetXChange,
  onOffsetYChange,
}: {
  disabled: boolean;
  scale: number[];
  offsetX: number[];
  offsetY: number[];
  onScaleChange: (value: number[]) => void;
  onOffsetXChange: (value: number[]) => void;
  onOffsetYChange: (value: number[]) => void;
}) {
  return (
    <Card
      className={`transition-all duration-300 ${disabled ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'}`}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <CardTitle>Fit & Alignment Controls</CardTitle>
        </div>
        {disabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Upload both images to enable fit controls</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Scale</label>
            <Badge variant="outline" className="text-xs">
              {scale[0].toFixed(2)}x
            </Badge>
          </div>
          <Slider
            value={scale}
            onValueChange={onScaleChange}
            min={0.5}
            max={1.5}
            step={0.05}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5x</span>
            <span>1.5x</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Horizontal Position</label>
            <Badge variant="outline" className="text-xs">
              {offsetX[0] > 0 ? '+' : ''}
              {offsetX[0]}px
            </Badge>
          </div>
          <Slider
            value={offsetX}
            onValueChange={onOffsetXChange}
            min={-100}
            max={100}
            step={5}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-100px</span>
            <span>+100px</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Vertical Position</label>
            <Badge variant="outline" className="text-xs">
              {offsetY[0] > 0 ? '+' : ''}
              {offsetY[0]}px
            </Badge>
          </div>
          <Slider
            value={offsetY}
            onValueChange={onOffsetYChange}
            min={-100}
            max={100}
            step={5}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-100px</span>
            <span>+100px</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CanvasPreview({ processing, progress }: { processing: boolean; progress: number }) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <Card className="h-full group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle>Live Preview</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            640×480
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFullScreen(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/25"
          style={{ aspectRatio: '4/3' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {processing ? (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/30 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Processing your try-on...</p>
                  <Progress value={progress} className="w-48" />
                  <p className="text-xs text-muted-foreground">{progress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Your AR Preview</p>
                  <p className="text-sm text-muted-foreground">Upload images to see the magic!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
          <TabsContent value="controls" className="mt-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Future
                </Badge>
                <span>Drag to rotate garment</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Future
                </Badge>
                <span>Pinch to zoom</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
                <span>Click to full-screen</span>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="info" className="mt-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• AR processing uses MediaPipe</p>
              <p>• Supports common image formats</p>
              <p>• Real-time pose detection</p>
              <p>• Optimized for mobile & desktop</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Maximize2 className="w-5 h-5" />
              Full Screen Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg p-8 flex items-center justify-center min-h-[500px]">
            <div className="text-center space-y-4">
              <Camera className="w-16 h-16 text-primary mx-auto" />
              <p className="text-lg font-medium">Full Screen Mode</p>
              <p className="text-muted-foreground">
                Enhanced preview coming soon with AR capabilities
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function TryOnPage() {
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [scale, setScale] = useState([1.0]);
  const [offsetX, setOffsetX] = useState([0]);
  const [offsetY, setOffsetY] = useState([0]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const canTryOn = garmentFile && userFile;

  const handleTryOn = async () => {
    if (!canTryOn) return;

    setProcessing(true);
    setProgress(0);
    toast.info('Starting AR try-on process...', {
      icon: <Sparkles className="w-4 h-4" />,
    });

    // Simulate processing with progress
    const intervals = [0, 25, 50, 75, 100];
    for (let i = 0; i < intervals.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress(intervals[i]);
    }

    setProcessing(false);
    toast.success('AR Try-On completed successfully!', {
      icon: <CheckCircle className="w-4 h-4" />,
      action: {
        label: 'Download',
        onClick: () => toast.info('Download feature coming soon!'),
      },
    });
  };

  const handleReset = () => {
    setGarmentFile(null);
    setUserFile(null);
    setScale([1.0]);
    setOffsetX([0]);
    setOffsetY([0]);
    setProgress(0);
    toast.info('Settings reset to default', {
      icon: <RotateCcw className="w-4 h-4" />,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AR Try-On Studio
                </h1>
                <p className="text-sm text-muted-foreground">
                  Virtual fashion fitting powered by AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                Beta v1.0
              </Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5" />
                      How to Use AR Try-On
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                          1
                        </Badge>
                        <div>
                          <h4 className="font-medium">Upload Garment Image</h4>
                          <p className="text-sm text-muted-foreground">
                            Select a clear image of the clothing item you want to try on.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                          2
                        </Badge>
                        <div>
                          <h4 className="font-medium">Upload Your Photo</h4>
                          <p className="text-sm text-muted-foreground">
                            Upload a well-lit photo of yourself facing the camera.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                          3
                        </Badge>
                        <div>
                          <h4 className="font-medium">Adjust & Preview</h4>
                          <p className="text-sm text-muted-foreground">
                            Fine-tune the fit using our advanced controls, then see the results!
                          </p>
                        </div>
                      </div>
                    </div>
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        Our AI uses advanced pose detection for the most realistic virtual try-on
                        experience.
                      </AlertDescription>
                    </Alert>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid xl:grid-cols-5 gap-8">
          {/* Left Panel - Controls */}
          <div className="xl:col-span-2 space-y-8">
            {/* Upload Cards */}
            <div className="space-y-6">
              <UploadCard
                title="Garment Image"
                description="Upload a clear image of the clothing item"
                file={garmentFile}
                onFileSelect={setGarmentFile}
                icon={<Shirt className="w-5 h-5 text-primary" />}
                step={1}
              />

              <UploadCard
                title="Your Photo"
                description="Upload a well-lit photo of yourself"
                file={userFile}
                onFileSelect={setUserFile}
                icon={<Camera className="w-5 h-5 text-primary" />}
                step={2}
              />
            </div>

            {/* Fit Controls */}
            <FitControls
              disabled={!canTryOn}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
              onScaleChange={setScale}
              onOffsetXChange={setOffsetX}
              onOffsetYChange={setOffsetY}
            />

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={handleTryOn}
                      disabled={!canTryOn || processing}
                      className="flex-1 h-12"
                      size="lg"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {processing ? 'Processing...' : 'Try-On'}
                    </Button>
                    <Button variant="outline" onClick={handleReset} size="lg" className="h-12">
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                  </div>

                  {!canTryOn && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Upload both images to enable the AR try-on feature
                      </AlertDescription>
                    </Alert>
                  )}

                  {canTryOn && !processing && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        Ready to try on! Click the button above to start.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <div className="xl:col-span-3">
            <CanvasPreview processing={processing} progress={progress} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>© 2025 AR Fashion Try-On</span>
              <Separator orientation="vertical" className="h-4" />
              <button className="hover:text-foreground transition-colors">Privacy Policy</button>
              <Separator orientation="vertical" className="h-4" />
              <button className="hover:text-foreground transition-colors">Terms of Service</button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
