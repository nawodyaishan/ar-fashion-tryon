import { Badge } from '@/components/ui/badge';
import { Camera, Activity, Target, Loader2, Wifi, WifiOff, Server } from 'lucide-react';

interface QoSMetrics {
  proc_ms: number;
  frame_count: number;
  drop_rate: number;
}

interface StatusFooterProps {
  cameraActive: boolean;
  mediaPipeActive: boolean;
  fitting: boolean;           // tracking vs searching
  confidence: number;         // 0-1
  fps: number;
  wsConnected?: boolean;      // WebSocket connection status
  qos?: QoSMetrics;           // Quality of Service metrics
}

export function StatusFooter({
  cameraActive,
  mediaPipeActive,
  fitting,
  confidence,
  fps,
  wsConnected,
  qos
}: StatusFooterProps) {
  const getConfidenceColor = () => {
    if (confidence >= 0.7) return 'bg-green-500/80';
    if (confidence >= 0.5) return 'bg-yellow-500/80';
    return 'bg-red-500/80';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.7) return 'Good';
    if (confidence >= 0.5) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-20">
      {/* Camera Status */}
      <Badge
        variant="secondary"
        className="backdrop-blur-sm bg-black/30 text-white border-white/20"
      >
        <Camera className="mr-1 h-3 w-3" />
        {cameraActive ? 'Camera Active' : 'No Camera'}
      </Badge>

      {/* MediaPipe Status */}
      {mediaPipeActive && (
        <Badge
          variant="secondary"
          className="backdrop-blur-sm bg-black/30 text-white border-white/20"
        >
          <Activity className="mr-1 h-3 w-3" />
          {fps} FPS
        </Badge>
      )}

      {/* Fitting Status */}
      {mediaPipeActive && (
        <Badge
          variant="secondary"
          className={`backdrop-blur-sm ${
            fitting
              ? 'bg-green-500/80 text-white'
              : 'bg-yellow-500/80 text-white'
          } border-white/20`}
        >
          {fitting ? (
            <>
              <Target className="mr-1 h-3 w-3" />
              Tracking
            </>
          ) : (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Searching...
            </>
          )}
        </Badge>
      )}

      {/* Confidence Indicator */}
      {mediaPipeActive && confidence > 0 && (
        <Badge
          variant="secondary"
          className={`backdrop-blur-sm ${getConfidenceColor()} text-white border-white/20`}
        >
          <Wifi className="mr-1 h-3 w-3" />
          {getConfidenceLabel()}: {(confidence * 100).toFixed(0)}%
        </Badge>
      )}

      {/* WebSocket Status (NEW) */}
      {mediaPipeActive && wsConnected !== undefined && (
        <Badge
          variant="secondary"
          className={`backdrop-blur-sm ${
            wsConnected ? 'bg-blue-500/80' : 'bg-gray-500/80'
          } text-white border-white/20`}
        >
          {wsConnected ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
          WS: {wsConnected ? 'ON' : 'OFF'}
        </Badge>
      )}

      {/* QoS Metrics (NEW) */}
      {qos && wsConnected && (
        <Badge
          variant="secondary"
          className="backdrop-blur-sm bg-black/30 text-white border-white/20 text-xs"
        >
          <Server className="mr-1 h-3 w-3" />
          {qos.proc_ms.toFixed(1)}ms | {qos.frame_count}f | {(qos.drop_rate * 100).toFixed(1)}% drop
        </Badge>
      )}
    </div>
  );
}
