'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { checkBackendHealth, type HealthStatus } from '@/lib/services/healthCheckService';

interface BackendStatusIndicatorProps {
  /**
   * Polling interval in milliseconds
   * @default 30000 (30 seconds)
   */
  pollInterval?: number;

  /**
   * Show loading state on initial mount
   * @default true
   */
  showLoading?: boolean;

  /**
   * Compact mode - only show icon without text
   * @default false
   */
  compact?: boolean;
}

export function BackendStatusIndicator({
  pollInterval = 30000,
  showLoading = true,
  compact = false,
}: BackendStatusIndicatorProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'loading',
    timestamp: Date.now(),
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (!mounted) return;

      const status = await checkBackendHealth();
      if (mounted) {
        setHealthStatus(status);
        timeoutId = setTimeout(poll, pollInterval);
      }
    };

    // Initial check
    poll();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pollInterval]);

  if (!showLoading && healthStatus.status === 'loading') {
    return null;
  }

  const getStatusConfig = () => {
    switch (healthStatus.status) {
      case 'ok':
        return {
          icon: CheckCircle2,
          label: 'Ready',
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
        };
      case 'error':
        return {
          icon: XCircle,
          label: 'Offline',
          variant: 'destructive' as const,
          className: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
        };
      case 'loading':
      default:
        return {
          icon: Loader2,
          label: 'Checking',
          variant: 'secondary' as const,
          className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon
        className={`h-3 w-3 ${compact ? '' : 'mr-1.5'} ${healthStatus.status === 'loading' ? 'animate-spin' : ''}`}
      />
      {!compact && <span className="text-xs font-medium">{config.label}</span>}
    </Badge>
  );
}
