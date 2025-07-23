'use client';

import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export function HeroBadge() {
  return (
    <div className="flex justify-center">
      <Badge
        variant="secondary"
        className="px-6 py-2 text-sm bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Powered by Advanced AI & AR Technology
      </Badge>
    </div>
  );
}
