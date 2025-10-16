'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                    {
                      'bg-primary border-primary text-primary-foreground scale-110': isActive,
                      'bg-success border-success text-success-foreground': isCompleted,
                      'bg-background border-border text-muted-foreground': !isActive && !isCompleted,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 animate-in zoom-in duration-300" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}

                  {/* Pulse animation for active step */}
                  {isActive && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                      <div className="absolute inset-0 -m-1 rounded-full bg-primary/30 animate-pulse" />
                    </>
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center hidden sm:block">
                  <p
                    className={cn(
                      'text-xs font-medium transition-colors whitespace-nowrap',
                      {
                        'text-primary': isActive,
                        'text-success': isCompleted,
                        'text-muted-foreground': !isActive && !isCompleted,
                      }
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[100px] truncate">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 relative">
                  <div className="absolute inset-0 bg-border" />
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-r from-primary to-success transition-all duration-500',
                      {
                        'w-full': isCompleted,
                        'w-0': !isCompleted,
                      }
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Show only current step label */}
      <div className="sm:hidden mt-4 text-center">
        <p className="text-sm font-medium text-primary">
          {steps[currentStep].label}
        </p>
        {steps[currentStep].description && (
          <p className="text-xs text-muted-foreground mt-1">
            {steps[currentStep].description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
