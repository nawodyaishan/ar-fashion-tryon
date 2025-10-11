'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface PreflightCheck {
  label: string;
  passed: boolean;
  message?: string;
}

interface PreflightChecklistProps {
  checks: PreflightCheck[];
  allPassed: boolean;
}

export default function PreflightChecklist({ checks, allPassed }: PreflightChecklistProps) {
  const failedChecks = checks.filter((c) => !c.passed);

  if (allPassed) {
    return null; // Don't show checklist if all passed
  }

  return (
    <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/5">
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium text-sm">Before generating, please address:</p>
          <ul className="space-y-1 text-xs">
            {failedChecks.map((check, index) => (
              <li key={index} className="flex items-start gap-2">
                <Circle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                <span>{check.message || check.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Individual checklist item component (for detailed display)
 */
export function PreflightCheckItem({ label, passed, message }: PreflightCheck) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="flex-1">
        <p className={passed ? 'text-green-600' : 'text-muted-foreground'}>{label}</p>
        {message && !passed && (
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        )}
      </div>
    </div>
  );
}
