'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle, Upload, RotateCcw, Play, Maximize2, Github } from 'lucide-react';
import { toast } from 'sonner';

interface UploadCardProps {
  title: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

function UploadCard({ title, file, onFileSelect }: UploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      onFileSelect(imageFile);
      toast.success(`${title} uploaded successfully`);
    } else {
      toast.error('Please upload a valid image file');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      toast.success(`${title} uploaded successfully`);
    }
  };

  return (
    <Card className={`relative transition-all duration-300 ${
      isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 
      file ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
      'border-gray-300 dark:border-gray-600'
    }`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`relative h-48 border-2 border-dashed rounded-lg transition-all duration-300 ${
            isDragOver ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'
          } ${file ? 'p-2' : 'p-8'}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
        >
          {file ? (
            <div className="relative w-full h-full">
              <Image
                src={URL.createObjectURL(file)}
                alt={title}
                fill
                className="object-cover rounded"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => onFileSelect(null)}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag & drop an image here, or{' '}
                  <label className="text-blue-600 cursor-pointer hover:underline">
                    browse files
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </label>
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FitControls({ disabled, scale, offsetX, offsetY, onScaleChange, onOffsetXChange, onOffsetYChange }: {
  disabled: boolean;
  scale: number[];
  offsetX: number[];
  offsetY: number[];
  onScaleChange: (value: number[]) => void;
  onOffsetXChange: (value: number[]) => void;
  onOffsetYChange: (value: number[]) => void;
}) {
  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle>Fit & Alignment Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Scale: {scale[0].toFixed(2)}
          </label>
          <Slider
            value={scale}
            onValueChange={onScaleChange}
            min={0.5}
            max={1.5}
            step={0.1}
            disabled={disabled}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Offset X: {offsetX[0]}
          </label>
          <Slider
            value={offsetX}
            onValueChange={onOffsetXChange}
            min={-100}
            max={100}
            step={5}
            disabled={disabled}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Offset Y: {offsetY[0]}
          </label>
          <Slider
            value={offsetY}
            onValueChange={onOffsetYChange}
            min={-100}
            max={100}
            step={5}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CanvasPreview({ processing }: { processing: boolean }) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Preview Canvas</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsFullScreen(true)}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {processing ? (
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Processing...</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">640×480 placeholder</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-2">Overlays</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Drag to rotate (future)</li>
            <li>• Click to full-screen</li>
          </ul>
        </div>
      </CardContent>

      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Full Screen Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 flex items-center justify-center min-h-[400px]">
            <p className="text-gray-600 dark:text-gray-400">Full screen preview coming soon</p>
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

  const canTryOn = garmentFile && userFile;

  const handleTryOn = async () => {
    if (!canTryOn) return;
    
    setProcessing(true);
    toast.info('Processing...');
    
    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setProcessing(false);
    toast.success('AR Try-On completed!');
  };

  const handleReset = () => {
    setGarmentFile(null);
    setUserFile(null);
    setScale([1.0]);
    setOffsetX([0]);
    setOffsetY([0]);
    toast.info('Reset completed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white/60 via-white/40 to-white/10 dark:from-black/40 dark:via-black/20 dark:to-black/10">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg" />
            <h1 className="text-xl font-bold">AR Try-On Prototype</h1>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How to Use AR Try-On</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Step 1: Upload Garment Image</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop or select a clear image of the clothing item you want to try on.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Step 2: Upload Your Photo</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload a photo of yourself in good lighting, facing the camera.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Step 3: Adjust Fit</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the controls to adjust scale and position for the best fit.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 - Garment Upload */}
            <UploadCard
              title="Step 1 – Garment Image"
              file={garmentFile}
              onFileSelect={setGarmentFile}
            />

            {/* Step 2 - User Photo Upload */}
            <UploadCard
              title="Step 2 – Your Photo"
              file={userFile}
              onFileSelect={setUserFile}
            />

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
            <div className="flex gap-4">
              <Button
                onClick={handleTryOn}
                disabled={!canTryOn || processing}
                className="flex-1"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {processing ? 'Processing...' : 'Try-On'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                size="lg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Status Messages */}
            {!garmentFile && !userFile && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Upload both images to start the try-on process
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-3">
            <CanvasPreview processing={processing} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>©2025</span>
              <span>•</span>
              <button className="hover:underline">Privacy note</button>
            </div>
            <Button variant="ghost" size="sm">
              <Github className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}