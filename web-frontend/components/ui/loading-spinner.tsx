'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'accent' | 'muted' | 'white';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const variantMap = {
  primary: 'border-primary',
  accent: 'border-accent',
  muted: 'border-muted-foreground',
  white: 'border-white',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  className
}: LoadingSpinnerProps) {
  return (
    <motion.div
      className={cn(
        'rounded-full border-2 border-t-transparent',
        sizeMap[size],
        variantMap[variant],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'accent' | 'muted';
  className?: string;
}

export function LoadingDots({
  size = 'md',
  variant = 'primary',
  className
}: LoadingDotsProps) {
  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const dotColor = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    muted: 'bg-muted-foreground',
  };

  const dotVariants = {
    start: { y: 0 },
    end: { y: -8 },
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn('rounded-full', dotSize[size], dotColor[variant])}
          variants={dotVariants}
          animate="end"
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: index * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

interface LoadingPulseProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'accent' | 'success';
  className?: string;
}

export function LoadingPulse({
  size = 'md',
  variant = 'primary',
  className
}: LoadingPulseProps) {
  const pulseSize = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const pulseColor = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-success',
  };

  return (
    <div className={cn('relative', pulseSize[size], className)}>
      {/* Outer pulse */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full opacity-30',
          pulseColor[variant]
        )}
        animate={{
          scale: [1, 1.5, 1.5, 1],
          opacity: [0.3, 0.1, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Middle pulse */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full opacity-40',
          pulseColor[variant]
        )}
        animate={{
          scale: [1, 1.3, 1.3, 1],
          opacity: [0.4, 0.2, 0, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
      />

      {/* Inner core */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full',
          pulseColor[variant]
        )}
        animate={{
          scale: [0.95, 1.05, 0.95],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

interface LoadingBarProps {
  progress?: number; // 0-100
  variant?: 'primary' | 'accent' | 'success';
  animated?: boolean;
  className?: string;
}

export function LoadingBar({
  progress = 0,
  variant = 'primary',
  animated = false,
  className
}: LoadingBarProps) {
  const barColor = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-success',
  };

  return (
    <div className={cn('w-full h-1 bg-muted rounded-full overflow-hidden', className)}>
      <motion.div
        className={cn('h-full rounded-full', barColor[variant])}
        initial={{ width: 0 }}
        animate={{
          width: animated ? '100%' : `${progress}%`,
        }}
        transition={
          animated
            ? {
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : {
                duration: 0.3,
                ease: 'easeOut',
              }
        }
      />
    </div>
  );
}

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  variant?: 'blur' | 'solid';
  children?: React.ReactNode;
}

export function LoadingOverlay({
  visible,
  message,
  variant = 'blur',
  children
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center gap-4',
        variant === 'blur'
          ? 'backdrop-blur-sm bg-background/80'
          : 'bg-background'
      )}
    >
      {children || (
        <>
          <LoadingPulse size="lg" variant="primary" />
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-medium text-muted-foreground"
            >
              {message}
            </motion.p>
          )}
        </>
      )}
    </motion.div>
  );
}
