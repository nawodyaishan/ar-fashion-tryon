'use client';

import { useTryonStore } from '@/lib/tryon-store';
import { Shield, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';

export default function StatusFooter() {
  const { activeMode, status } = useTryonStore();

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-sm z-10">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* Left: FPS indicator (AR mode only) */}
          <div className="flex items-center gap-4">
            {activeMode === 'ar' && status.fps !== undefined && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>{Math.round(status.fps)} FPS</span>
              </div>
            )}
          </div>

          {/* Center: Processing status */}
          <div className="flex items-center gap-2">
            {status.processing && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>{status.message || 'Processing...'}</span>
              </>
            )}
            {!status.processing && status.message && (
              <span className="text-primary">{status.message}</span>
            )}
          </div>

          {/* Right: Privacy info */}
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground/70">{APP_VERSION}</span>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-green-500" />
              <span>
                Local processing
                {activeMode === 'photo' && <span className="text-muted-foreground/70"> (HD mode may use server)</span>}
              </span>
            </div>
            <Link
              href="/about"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              Docs
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
