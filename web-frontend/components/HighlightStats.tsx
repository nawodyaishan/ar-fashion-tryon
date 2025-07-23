'use client';

import type { Highlight } from '@/lib/types';

interface HighlightStatsProps {
  highlights: Highlight[];
}

export function HighlightStats({ highlights }: HighlightStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-2xl mx-auto">
      {highlights.map((item, index) => (
        <div
          key={item.label}
          className="text-center space-y-2 opacity-0 animate-fadeInUp"
          style={{ animationDelay: `${800 + index * 100}ms`, animationFillMode: 'forwards' }}
        >
          <div className="flex justify-center">
            <item.icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
