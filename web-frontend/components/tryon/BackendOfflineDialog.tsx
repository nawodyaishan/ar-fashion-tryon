'use client';

import { ExternalLink, Loader2, RefreshCw, ServerOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { HF_SPACE_URL } from '@/lib/constants';

interface BackendOfflineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  retrying?: boolean;
}

export function BackendOfflineDialog({
  open,
  onOpenChange,
  onRetry,
  retrying = false,
}: BackendOfflineDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto sm:mx-0 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <ServerOff className="h-6 w-6 text-red-500" />
          </div>
          <AlertDialogTitle>Photo try-on is offline</AlertDialogTitle>
          <AlertDialogDescription>
            The try-on backend is not responding right now, so photos can&apos;t be processed here.
            You can still try CatVTON directly on the Hugging Face Space, or retry in a moment. Live
            AR preview keeps working without the backend.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <Button variant="outline" onClick={onRetry} disabled={retrying} className="gap-2">
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry
          </Button>
          <AlertDialogAction asChild>
            <a href={HF_SPACE_URL} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Hugging Face Space
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
