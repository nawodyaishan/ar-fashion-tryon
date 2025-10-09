export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  variant: 'default' | 'secondary' | 'outline';
  badge?: string;
  stats: string;
  gradient: string;
}

export interface Highlight {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

export interface NavigationItem {
  title: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

// Garment Extraction API Types
export type GarmentLabel = 'tshirt' | 'trousers' | 'unknown';

export interface ClassificationResult {
  label: GarmentLabel;
  confidence: number; // 0.0 to 1.0
}

export interface ExtractionResult {
  cutout_url: string; // URL path to extracted image (e.g., "/static/outputs/cutout_xxx.png")
  cutout_path: string; // Relative path for download
  original_url: string; // URL to original uploaded image
}

export type GarmentProcessResponse = {
  success: boolean;
  message?: string;
  processing_time_ms?: number; // client-measured
  classification?: { label: string; confidence: number };
  extraction?: { cutout_url: string; garment_url: string; cutout_path: string };
};

export interface GarmentExtractionError {
  detail: string;
  error_code?: string;
  details?: Record<string, unknown>;
}

export interface GarmentHealthCheck {
  status: 'healthy' | 'unhealthy';
  model_loaded: boolean;
  model_name: string;
  version: string;
}

export interface Garment {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  sizeKb: number;
  category?: 'tops' | 'jackets' | 'misc';

  // Extraction metadata (populated after extraction)
  extracted?: boolean;
  extractedUrl?: string; // URL to extracted/cutout image
  classification?: ClassificationResult;
  processingTime?: number;
}

export interface ImageSelection {
  file: File | null;
  previewUrl: string | null;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  lockAspect: boolean;
}

export type PoseConfidence = 'Low' | 'Okay' | 'Good';

export interface Status {
  fps?: number;
  processing?: boolean;
  message?: string;
}

// VTON API Types
export type ClothType = 'upper' | 'lower' | 'full';

export interface VtonProcessResponse {
  // ML backend returns processed image data
  result_image?: string; // base64 encoded image
  processed_image?: string; // alternative field name
  image?: string; // alternative field name
  success?: boolean;
  message?: string;
  error?: string;
}

export interface VtonOptions {
  removeBg?: boolean;
  clothType?: ClothType;
  numInferenceSteps?: number; // default: 50
  guidanceScale?: number; // default: 2.5
  seed?: number; // default: 42, -1 for random
}

// Legacy types (kept for compatibility)
export type VtonJobStatus = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface VtonStartResponse {
  status: VtonJobStatus;
  jobId?: string;
  resultUrl?: string;
  etaSeconds?: number;
  message?: string;
}

export type VtonJobResponse = VtonStartResponse;
