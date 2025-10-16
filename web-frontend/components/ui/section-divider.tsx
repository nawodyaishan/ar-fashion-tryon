'use client';

import { motion } from 'framer-motion';

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className }: SectionDividerProps) {
  return (
    <div className={`relative h-px w-full overflow-hidden ${className}`}>
      {/* Base line */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Animated glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        animate={{
          x: ['-100%', '100%'],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Decorative dots */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-primary/40"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
