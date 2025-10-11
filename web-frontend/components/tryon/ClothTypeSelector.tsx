'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, Lock, HelpCircle } from 'lucide-react';
import type { ClothType } from '@/lib/types';
import type { PreselectState } from '@/lib/store/useVtonStore';

interface ClothTypeSelectorProps {
  value: ClothType;
  onChange: (value: ClothType) => void;
  availableTypes: ClothType[];
  disabledTypes: { type: ClothType; reason: string }[];
  preselectState: PreselectState;
  detectedLabel?: string;
  confidence?: number;
}

export default function ClothTypeSelector({
  value,
  onChange,
  disabledTypes,
  preselectState,
  detectedLabel,
  confidence,
}: ClothTypeSelectorProps) {
  const allTypes: ClothType[] = ['upper', 'lower', 'overall'];

  const isDisabled = (type: ClothType) => {
    return disabledTypes.some((d) => d.type === type);
  };

  const getDisabledReason = (type: ClothType) => {
    return disabledTypes.find((d) => d.type === type)?.reason;
  };

  const isPreselected = (type: ClothType) => {
    return value === type && (preselectState === 'LOCKED' || preselectState === 'SUGGESTED');
  };

  const getPreselectBadge = () => {
    if (!detectedLabel || !confidence) return null;

    const confidencePercent = (confidence * 100).toFixed(0);

    if (preselectState === 'LOCKED') {
      return (
        <div className="flex items-center gap-2 text-sm">
          <Lock className="h-4 w-4 text-green-500" />
          <span className="font-medium">
            Auto-selected: {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
            {detectedLabel} · {confidencePercent}%
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Allow user to change even when locked
                  }}
                  className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Change
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">High confidence detection</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }

    if (preselectState === 'SUGGESTED') {
      return (
        <div className="flex items-center gap-2 text-sm">
          <HelpCircle className="h-4 w-4 text-amber-500" />
          <span className="font-medium">
            Suggestion: {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">
            {detectedLabel} · {confidencePercent}%
          </Badge>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                // User confirms suggestion
              }}
              className="h-auto px-2 py-1 text-xs"
            >
              Confirm
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                // User wants to change
              }}
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
            >
              Change
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Garment Type</Label>
        {getPreselectBadge()}
      </div>

      {preselectState === 'UNKNOWN' && (
        <p className="text-xs text-muted-foreground">
          Choose a cloth type to continue.
        </p>
      )}

      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 gap-2">
        {allTypes.map((type) => {
          const disabled = isDisabled(type);
          const reason = getDisabledReason(type);
          const selected = value === type;
          const preselected = isPreselected(type);

          return (
            <div key={type} className="relative">
              <RadioGroupItem value={type} id={type} disabled={disabled} className="peer sr-only" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor={type}
                      className={`
                        flex items-center justify-between rounded-md border-2 bg-popover p-3 transition-all
                        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'}
                        ${selected ? 'border-primary' : 'border-muted'}
                        ${preselected && preselectState === 'LOCKED' ? 'border-green-500 bg-green-500/5' : ''}
                        ${preselected && preselectState === 'SUGGESTED' ? 'border-amber-500 bg-amber-500/5' : ''}
                      `}
                    >
                      <span className="text-sm font-medium capitalize">{type}</span>

                      <div className="flex items-center gap-2">
                        {preselected && preselectState === 'LOCKED' && (
                          <Badge variant="default" className="text-xs bg-green-500">
                            Detected
                          </Badge>
                        )}
                        {preselected && preselectState === 'SUGGESTED' && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                            Suggested
                          </Badge>
                        )}
                        {disabled && (
                          <Info className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </Label>
                  </TooltipTrigger>
                  {(disabled && reason) && (
                    <TooltipContent>
                      <p className="text-xs max-w-xs">{reason}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </RadioGroup>

      {preselectState === 'UNKNOWN' && detectedLabel && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-xs">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            We&apos;re not sure about this garment type. Please choose what you intend.
          </p>
        </div>
      )}
    </div>
  );
}
