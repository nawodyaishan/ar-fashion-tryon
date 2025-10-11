'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

interface ClassificationChipProps {
  label: string;
  confidence: number; // 0.0 to 1.0
  showConfidence?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ClassificationChip({
  label,
  confidence,
  showConfidence = true,
  size = 'md',
}: ClassificationChipProps) {
  // Confidence thresholds and colors
  const getConfidenceData = () => {
    if (confidence >= 0.85) {
      return {
        color: 'green',
        variant: 'default' as const,
        icon: CheckCircle2,
        label: 'High',
        bgClass: 'bg-green-500',
        borderClass: 'border-green-500/20',
        textClass: 'text-green-600',
        ringClass: 'ring-green-500',
      };
    } else if (confidence >= 0.6) {
      return {
        color: 'amber',
        variant: 'outline' as const,
        icon: AlertCircle,
        label: 'Medium',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/30',
        textClass: 'text-amber-600',
        ringClass: 'ring-amber-500',
      };
    } else {
      return {
        color: 'gray',
        variant: 'outline' as const,
        icon: HelpCircle,
        label: 'Low',
        bgClass: 'bg-gray-500/10',
        borderClass: 'border-gray-500/20',
        textClass: 'text-gray-600',
        ringClass: 'ring-gray-400',
      };
    }
  };

  const confidenceData = getConfidenceData();
  const Icon = confidenceData.icon;
  const confidencePercent = (confidence * 100).toFixed(0);

  const sizeClasses = {
    sm: 'h-6 text-xs gap-1 px-2',
    md: 'h-7 text-xs gap-1.5 px-2.5',
    lg: 'h-8 text-sm gap-2 px-3',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <div className="flex items-center gap-2">
      {/* Main classification badge */}
      <Badge
        variant={confidenceData.variant}
        className={`${sizeClasses[size]} ${confidenceData.bgClass} ${confidenceData.borderClass} ${confidenceData.textClass} font-medium flex items-center`}
      >
        <Icon className={`${iconSizes[size]} shrink-0`} />
        <span className="capitalize">{label}</span>
        {showConfidence && (
          <>
            <span className="text-muted-foreground">·</span>
            <span>{confidencePercent}%</span>
          </>
        )}
      </Badge>

      {/* Confidence ring indicator (optional visual) */}
      <div
        className={`hidden sm:flex h-2 w-2 rounded-full ${confidenceData.bgClass} ring-2 ${confidenceData.ringClass} ring-opacity-30`}
        title={`Confidence: ${confidenceData.label}`}
      />
    </div>
  );
}
