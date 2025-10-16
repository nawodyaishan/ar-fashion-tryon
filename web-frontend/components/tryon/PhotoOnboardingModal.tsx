'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTryonStore } from '@/lib/tryon-store';
import { markPhotoOnboardingSeen } from '@/lib/utils/onboarding';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import {
  Sparkles,
  Upload,
  Wand2,
  Camera,
  Zap,
  Shield,
  TrendingUp,
  ChevronRight,
  Check,
  Shirt,
  Users,
  Eye,
} from 'lucide-react';
import { useState } from 'react';

const PHOTO_ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Photo Try-On HD!',
    description: 'AI-powered virtual fitting with stunning HD results',
    icon: Sparkles,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/10 to-pink-500/10',
    highlights: [
      { icon: Wand2, text: 'ML-Powered Generation', color: 'text-purple-500' },
      { icon: Zap, text: 'HD Quality Results', color: 'text-blue-500' },
      { icon: Shield, text: '100% Private', color: 'text-green-500' },
    ],
  },
  {
    id: 'paths',
    title: 'Choose Your Try-On Path',
    description: 'Three powerful modes for different needs',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    modes: [
      {
        icon: Shirt,
        title: 'NORMAL',
        description: 'Try on a single garment (top or bottom)',
        badge: 'Quick',
        color: 'text-blue-500',
      },
      {
        icon: Users,
        title: 'FULL',
        description: 'Combine upper + lower garments for complete outfit',
        badge: 'Complete',
        color: 'text-purple-500',
      },
      {
        icon: Eye,
        title: 'REFERENCE',
        description: 'Transfer style from a reference photo',
        badge: 'Advanced',
        color: 'text-amber-500',
      },
    ],
  },
  {
    id: 'workflow',
    title: 'Simple Step-by-Step Process',
    description: 'Easy workflow from upload to result',
    icon: Upload,
    color: 'text-green-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    steps: [
      {
        number: '1',
        title: 'Upload Body Photo',
        description: 'Take or upload a front-facing photo',
        tips: ['Good lighting', 'Plain background', 'Shoulders visible'],
      },
      {
        number: '2',
        title: 'Select Garment',
        description: 'Upload garment or choose from gallery',
        tips: ['Flat or on hanger', 'Clear image', 'Centered frame'],
      },
      {
        number: '3',
        title: 'AI Processing',
        description: 'Our ML model generates HD result',
        tips: ['20-60 seconds', 'Auto-classification', 'Quality checks'],
      },
      {
        number: '4',
        title: 'Download & Share',
        description: 'Save your virtual try-on result',
        tips: ['HD quality', 'Instant download', 'Try variations'],
      },
    ],
  },
  {
    id: 'features',
    title: 'Smart Features',
    description: 'Advanced technology for best results',
    icon: Wand2,
    color: 'text-amber-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    features: [
      {
        icon: Sparkles,
        title: 'Auto-Classification',
        description: 'ML automatically detects garment type with confidence scores',
        badge: 'AI',
      },
      {
        icon: Shield,
        title: 'Quality Validation',
        description: 'Pre-upload checks for resolution, brightness, and aspect ratio',
        badge: 'Smart',
      },
      {
        icon: Camera,
        title: 'Camera Capture',
        description: 'Upload files or capture photos directly with your device camera',
        badge: 'Flexible',
      },
      {
        icon: Zap,
        title: 'WebP Conversion',
        description: 'Automatic format conversion for backend compatibility',
        badge: 'Seamless',
      },
      {
        icon: TrendingUp,
        title: 'Advanced Settings',
        description: 'Fine-tune inference steps, guidance scale, and seed values',
        badge: 'Pro',
      },
    ],
  },
];

export default function PhotoOnboardingModal() {
  const { photoOnboardingOpen, closePhotoOnboarding } = useTryonStore();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < PHOTO_ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markPhotoOnboardingSeen();
    closePhotoOnboarding();
    setCurrentStep(0);
  };

  const handleSkip = () => {
    markPhotoOnboardingSeen();
    closePhotoOnboarding();
    setCurrentStep(0);
  };

  const step = PHOTO_ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === PHOTO_ONBOARDING_STEPS.length - 1;

  return (
    <Dialog open={photoOnboardingOpen} onOpenChange={closePhotoOnboarding}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto glassmorphic-card border-2" aria-describedby="photo-onboarding-description">
        <VisuallyHidden>
          <DialogTitle>Photo Try-On HD Onboarding</DialogTitle>
          <DialogDescription id="photo-onboarding-description">
            Learn how to use the Photo Try-On HD feature with this interactive tutorial.
          </DialogDescription>
        </VisuallyHidden>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-6">
          {PHOTO_ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={`rounded-xl bg-gradient-to-br ${step.bgGradient} p-6 mb-6`}>
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-background/80 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Icon className={`h-6 w-6 ${step.color}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          </div>

          {/* Welcome Step */}
          {step.id === 'welcome' && (
            <div className="grid grid-cols-3 gap-3 mt-6">
              {step.highlights?.map((highlight, index) => {
                const HighlightIcon = highlight.icon;
                return (
                  <div
                    key={index}
                    className="bg-background/60 backdrop-blur rounded-lg p-4 text-center"
                  >
                    <HighlightIcon className={`h-6 w-6 mx-auto mb-2 ${highlight.color}`} />
                    <p className="text-xs font-medium">{highlight.text}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paths Step */}
          {step.id === 'paths' && (
            <div className="space-y-3 mt-6">
              {step.modes?.map((mode, index) => {
                const ModeIcon = mode.icon;
                return (
                  <div
                    key={index}
                    className="bg-background/60 backdrop-blur rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0`}>
                        <ModeIcon className={`h-5 w-5 ${mode.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{mode.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {mode.badge}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{mode.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Workflow Step */}
          {step.id === 'workflow' && (
            <div className="space-y-4 mt-6">
              {step.steps?.map((item, index) => (
                <div
                  key={index}
                  className="bg-background/60 backdrop-blur rounded-lg p-4"
                >
                  <div className="flex gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.number}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tips.map((tip, tipIndex) => (
                          <Badge key={tipIndex} variant="outline" className="text-xs">
                            {tip}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Features Step */}
          {step.id === 'features' && (
            <div className="space-y-3 mt-6">
              {step.features?.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={index}
                    className="bg-background/60 backdrop-blur rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <FeatureIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{feature.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {feature.badge}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip Tutorial
          </Button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            )}
            <Button onClick={handleNext} className="gap-2">
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4" />
                  Start Try-On
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

        {/* Step counter */}
        <div className="text-center text-xs text-muted-foreground mt-2">
          Step {currentStep + 1} of {PHOTO_ONBOARDING_STEPS.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}
