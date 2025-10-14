// components/tryon/CalibrationWizard.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, Save, X } from 'lucide-react';
import type { GarmentMetadata } from '@/lib/types';
import { saveGarmentMetadata } from '@/lib/services/metadata';

interface CalibrationWizardProps {
  garmentId: string;
  garmentSrc: string;
  garmentWidth: number;
  garmentHeight: number;
  open: boolean;
  onClose: () => void;
  onSave: (metadata: GarmentMetadata) => void;
}

export function CalibrationWizard({
  garmentId,
  garmentSrc,
  garmentWidth,
  garmentHeight,
  open,
  onClose,
  onSave
}: CalibrationWizardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [step, setStep] = useState<'collar' | 'hem' | 'preview'>('collar');
  const [collarLeft, setCollarLeft] = useState<[number, number] | null>(null);
  const [collarRight, setCollarRight] = useState<[number, number] | null>(null);
  const [hemCenter, setHemCenter] = useState<[number, number] | null>(null);

  // Load image
  useEffect(() => {
    if (!open) return;

    const img = new Image();
    img.src = garmentSrc;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [open, garmentSrc]);

  // Redraw canvas when anchors change
  useEffect(() => {
    if (imageRef.current) {
      drawCanvas();
    }
  }, [collarLeft, collarRight, hemCenter]);

  // Draw canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw garment image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw anchor points
    const scale = canvas.width / garmentWidth;

    if (collarLeft) {
      drawAnchor(ctx, collarLeft[0] * garmentWidth * scale, collarLeft[1] * garmentHeight * scale, '#00ff00', 'L');
    }

    if (collarRight) {
      drawAnchor(ctx, collarRight[0] * garmentWidth * scale, collarRight[1] * garmentHeight * scale, '#00ff00', 'R');
    }

    if (hemCenter) {
      drawAnchor(ctx, hemCenter[0] * garmentWidth * scale, hemCenter[1] * garmentHeight * scale, '#0000ff', 'H');
    }
  };

  const drawAnchor = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) => {
    // Draw circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();

    // Draw outline
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(label, x - 5, y + 5);
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalize to 0-1
    const normX = x / canvas.width;
    const normY = y / canvas.height;

    if (step === 'collar') {
      if (!collarLeft) {
        setCollarLeft([normX, normY]);
      } else if (!collarRight) {
        setCollarRight([normX, normY]);
        // Auto-advance to hem step
        setTimeout(() => setStep('hem'), 500);
      }
    } else if (step === 'hem') {
      setHemCenter([normX, normY]);
      // Auto-advance to preview
      setTimeout(() => setStep('preview'), 500);
    }
  };

  // Save metadata
  const handleSave = async () => {
    if (!collarLeft || !collarRight) {
      alert('Please set collar left and right anchors');
      return;
    }

    const metadata: GarmentMetadata = {
      id: garmentId,
      version: 1,
      displayName: garmentId.replace(/-/g, ' '),
      width: garmentWidth,
      height: garmentHeight,
      anchors: {
        collar_left: collarLeft,
        collar_right: collarRight,
        ...(hemCenter && { hem_center: hemCenter })
      },
      body_offsets: {
        neck_drop_ratio: 0.06,
        torso_length_ratio: 1.05
      }
    };

    await saveGarmentMetadata(metadata);
    onSave(metadata);
    onClose();
  };

  const handleReset = () => {
    setCollarLeft(null);
    setCollarRight(null);
    setHemCenter(null);
    setStep('collar');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Calibrate Garment Anchors</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Card className="bg-blue-500/10 border-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  {step === 'collar' && (
                    <div>
                      <strong>Step 1: Mark Collar Points</strong>
                      <p className="text-muted-foreground mt-1">
                        Click on the <strong>left collar edge</strong>, then the <strong>right collar edge</strong>.
                        These points should align with the user&apos;s shoulders.
                      </p>
                    </div>
                  )}
                  {step === 'hem' && (
                    <div>
                      <strong>Step 2: Mark Hem Center (Optional)</strong>
                      <p className="text-muted-foreground mt-1">
                        Click on the <strong>center of the bottom hem</strong>. This helps with length adjustment.
                        Skip this step if not needed.
                      </p>
                    </div>
                  )}
                  {step === 'preview' && (
                    <div>
                      <strong>Step 3: Preview and Save</strong>
                      <p className="text-muted-foreground mt-1">
                        Review your anchor points. Green = collar, Blue = hem. Click Save to apply.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canvas */}
          <div className="relative border rounded-lg overflow-hidden bg-black/5">
            <canvas
              ref={canvasRef}
              width={600}
              height={900}
              onClick={handleCanvasClick}
              className="cursor-crosshair w-full"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleReset}>
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>

            <div className="flex gap-2">
              {step === 'hem' && (
                <Button variant="outline" onClick={() => setStep('preview')}>
                  Skip Hem
                </Button>
              )}

              {step === 'preview' && (
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Anchors
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
