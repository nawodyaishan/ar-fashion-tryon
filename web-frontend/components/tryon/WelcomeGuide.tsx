'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Camera,
  Hand,
  Move,
  ZoomIn,
  RotateCw,
  Keyboard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

interface WelcomeGuideProps {
  open: boolean;
  onClose: () => void;
  onRequestCamera: () => void;
}

interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
}

const guideSteps: GuideStep[] = [
  {
    title: 'Welcome to AR Fashion Try-On!',
    description: 'Experience virtual try-on with real-time pose tracking and gesture controls. Follow this quick guide to get started.',
    icon: <Sparkles className="h-12 w-12 text-primary" />,
    tips: [
      'Works best with good lighting',
      'Stand 0.6-1.2 meters from camera',
      'Face camera with both shoulders visible',
      'Supports multiple garment types'
    ]
  },
  {
    title: 'Camera Setup',
    description: 'Allow camera access for live AR preview. Position yourself in frame with both shoulders visible.',
    icon: <Camera className="h-12 w-12 text-blue-500" />,
    tips: [
      'Click "Allow" when browser asks for camera permission',
      'Ensure good lighting (avoid backlighting)',
      'Position yourself centered in frame',
      'Green border = both shoulders detected ✓'
    ]
  },
  {
    title: 'Select & Try On Garments',
    description: 'Choose a garment from the gallery. It will automatically snap to your shoulders using AI pose detection.',
    icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
    tips: [
      'Browse garments in the right panel',
      'Click any garment to try it on',
      'Upload custom garments (PNG format)',
      'Auto-alignment happens in real-time'
    ]
  },
  {
    title: 'Gesture Controls',
    description: 'Use hand gestures, mouse, or keyboard to adjust garment position, scale, and rotation.',
    icon: <Hand className="h-12 w-12 text-purple-500" />,
    tips: [
      '1 Pinch: Drag to move garment',
      '2 Pinches: Scale and rotate',
      'Mouse: Drag, Ctrl+drag (scale), Alt+drag (rotate)',
      'Keyboard: Arrows (move), +/- (scale), [ ] (rotate)'
    ]
  },
  {
    title: 'Auto-Resume Tracking',
    description: 'After manual adjustments, tracking automatically resumes after 0.8 seconds of inactivity.',
    icon: <RotateCw className="h-12 w-12 text-orange-500" />,
    tips: [
      'Edit garment position manually',
      'Release gesture/mouse/key',
      'Wait 0.8 seconds',
      'Smooth rebase → auto-tracking resumes ✓'
    ]
  }
];

export function WelcomeGuide({ open, onClose, onRequestCamera }: WelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step, close and request camera
      onRequestCamera();
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onRequestCamera();
    onClose();
  };

  const step = guideSteps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            AR Try-On Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2">
            {guideSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : index < currentStep
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          <Card className="border-2">
            <CardContent className="pt-6 space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                {step.icon}
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>

              {/* Tips */}
              <div className="space-y-3">
                {step.tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>

              {/* Quick Reference Icons */}
              {currentStep === 3 && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs">
                    <Move className="h-4 w-4 text-blue-500" />
                    <span>Move</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ZoomIn className="h-4 w-4 text-green-500" />
                    <span>Scale</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <RotateCw className="h-4 w-4 text-orange-500" />
                    <span>Rotate</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Keyboard className="h-4 w-4 text-purple-500" />
                    <span>Keyboard</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Guide
            </Button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}

              <Button onClick={handleNext} className="gap-2">
                {currentStep === guideSteps.length - 1 ? (
                  <>
                    Get Started
                    <Camera className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step Counter */}
          <div className="text-center text-sm text-muted-foreground">
            Step {currentStep + 1} of {guideSteps.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
