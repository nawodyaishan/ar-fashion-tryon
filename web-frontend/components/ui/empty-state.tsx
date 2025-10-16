'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
      {/* Animated Icon Container */}
      <div className="relative mb-6">
        {/* Pulsing background */}
        <div className="absolute inset-0 -m-4 rounded-full bg-primary/5 animate-pulse" />
        <div className="absolute inset-0 -m-8 rounded-full bg-primary/3 animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="absolute inset-0 -m-12 rounded-full bg-primary/2 animate-pulse" style={{ animationDelay: '300ms' }} />

        {/* Icon with float animation */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-float">
          <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        {description}
      </p>

      {/* Action or Custom Children */}
      {action && (
        <Button onClick={action.onClick} size="lg" className="gap-2">
          {action.label}
        </Button>
      )}
      {children}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
