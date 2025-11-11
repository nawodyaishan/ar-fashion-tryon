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

// Garment Keypoint Types
export interface GarmentKeypoint {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  confidence: number; // 0-1
}

export interface GarmentKeypointData {
  leftShoulder: GarmentKeypoint;
  rightShoulder: GarmentKeypoint;
  shoulderCenter: GarmentKeypoint;
  shoulderWidth: number; // Pixels
  shoulderAngle: number; // Degrees
  leftHip?: GarmentKeypoint;
  rightHip?: GarmentKeypoint;
  detectionConfidence: number; // Overall confidence 0-1
  detectedAt: string; // ISO timestamp
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

  // Keypoint data (for precise AR alignment)
  keypoints?: GarmentKeypointData;
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
export type ClothType = 'upper' | 'lower' | 'overall';

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

// FastAPI Virtual Try-On Response (new endpoint)
export interface VirtualTryonResponse {
  success: boolean;
  person_url: string; // Cloudinary URL for person image
  garment_url: string; // Cloudinary URL for garment image
  cutout_url?: string; // Cloudinary URL for cutout garment (if processed)
  result_url: string; // Cloudinary URL for try-on result
  result_public_id: string; // Cloudinary public ID
  cloth_type: ClothType;
  parameters: {
    num_inference_steps: number;
    guidance_scale: number;
    seed: number;
    show_type: string;
  };
  garment_classification?: {
    label: string;
    confidence: number;
  };
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
