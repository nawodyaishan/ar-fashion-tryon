'use client';

import { Card } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface UploadCardProps {
  title: string;
  subtitle: string;
  onUpload: () => void;
  icon?: React.ReactNode;
}

export default function UploadCard({
  title,
  subtitle,
  onUpload,
  icon,
}: UploadCardProps) {
  return (
    <Card
      className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
      onClick={onUpload}
    >
      <div className="p-8 sm:p-12 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {icon || <Upload className="h-8 w-8 text-primary" />}
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}
