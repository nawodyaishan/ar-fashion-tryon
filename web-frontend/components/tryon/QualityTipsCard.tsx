'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface QualityTip {
  text: string;
}

interface QualityTipsCardProps {
  title: string;
  tips: QualityTip[] | string[];
  defaultOpen?: boolean;
}

export default function QualityTipsCard({ title, tips, defaultOpen = false }: QualityTipsCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const tipTexts = tips.map((tip) => (typeof tip === 'string' ? tip : tip.text));

  return (
    <Card className="overflow-hidden border-blue-500/20 bg-blue-500/5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-blue-500/10 rounded-none"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {isOpen && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {tipTexts.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
