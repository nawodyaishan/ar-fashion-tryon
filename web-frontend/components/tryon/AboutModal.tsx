'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTryonStore } from '@/lib/tryon-store';
import { Github, ExternalLink, Sparkles } from 'lucide-react';

export default function AboutModal() {
  const { aboutModalOpen, closeAbout } = useTryonStore();

  return (
    <Dialog open={aboutModalOpen} onOpenChange={closeAbout}>
      <DialogContent className="sm:max-w-[500px] glassmorphic-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            About AR Fashion Try-On
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Version */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <Badge variant="outline">1.0.0</Badge>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-semibold">Overview</h3>
            <p className="text-sm text-muted-foreground">
              AR Fashion Try-On is a cutting-edge web application that brings virtual garment
              fitting to your browser using advanced computer vision and AR technology.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h3 className="font-semibold">Features</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Real-time AR preview with live camera feed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>High-quality photo try-on with uploaded images</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Advanced garment transformation controls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Local processing for privacy and speed</span>
              </li>
            </ul>
          </div>

          {/* Technology Stack */}
          <div className="space-y-2">
            <h3 className="font-semibold">Technology</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Next.js 15</Badge>
              <Badge variant="secondary">TypeScript</Badge>
              <Badge variant="secondary">Three.js</Badge>
              <Badge variant="secondary">MediaPipe</Badge>
              <Badge variant="secondary">Tailwind CSS</Badge>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <h3 className="font-semibold">Links</h3>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/your-repo/ar-fashion-tryon"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Github className="h-4 w-4" />
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://docs.your-project.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Documentation
              </a>
            </div>
          </div>

          {/* Privacy */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Privacy:</strong> All image processing happens locally in your browser. No
              data is sent to external servers unless you explicitly use the HD Photo Try-On
              feature.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
