'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { ReactNode } from 'react';

interface ProcessingOverlayProps {
  isProcessing: boolean;
  children: ReactNode;
  showPulse?: boolean;
  lockMessage?: string;
}

export function ProcessingOverlay({
  isProcessing,
  children,
  showPulse = true,
  lockMessage = 'Locked during processing',
}: ProcessingOverlayProps) {
  return (
    <motion.div
      animate={{
        opacity: isProcessing ? 0.5 : 1,
        scale: isProcessing ? 0.98 : 1,
      }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="relative"
    >
      {/* Overlay with lock message */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg bg-background/90 border shadow-lg"
          >
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1.1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
            >
              <Lock className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="text-xs font-medium text-muted-foreground">{lockMessage}</span>
          </motion.div>
        </motion.div>
      )}

      {/* Pulsing border effect when processing */}
      {isProcessing && showPulse && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.01, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {children}
    </motion.div>
  );
}
