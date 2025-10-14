import type { GarmentMetadata } from '@/lib/types';

// Default metadata if file not found
const DEFAULT_METADATA: Omit<GarmentMetadata, 'id' | 'displayName'> = {
  version: 1,
  width: 512,
  height: 768,
  anchors: {
    collar_left: [0.30, 0.12],
    collar_right: [0.70, 0.12],
    hem_center: [0.50, 0.95]
  },
  body_offsets: {
    neck_drop_ratio: 0.06,
    torso_length_ratio: 1.05
  }
};

/**
 * Load garment metadata from JSON file
 */
export async function loadGarmentMetadata(garmentId: string): Promise<GarmentMetadata> {
  try {
    const response = await fetch(`/data/garment-metadata/${garmentId}.json`);

    if (!response.ok) {
      console.warn(`Metadata not found for ${garmentId}, using defaults`);
      return createDefaultMetadata(garmentId);
    }

    const metadata: GarmentMetadata = await response.json();

    // Validate schema
    if (!validateMetadata(metadata)) {
      console.warn(`Invalid metadata for ${garmentId}, using defaults`);
      return createDefaultMetadata(garmentId);
    }

    console.log(`✅ Loaded metadata for ${garmentId}:`, metadata);
    return metadata;
  } catch (error) {
    console.error(`Error loading metadata for ${garmentId}:`, error);
    return createDefaultMetadata(garmentId);
  }
}

/**
 * Save garment metadata (in real app, would POST to backend)
 */
export async function saveGarmentMetadata(metadata: GarmentMetadata): Promise<void> {
  console.log('📝 Saving metadata:', metadata);

  // For now, just store in localStorage (in production, use backend API)
  const key = `garment-metadata-${metadata.id}`;
  localStorage.setItem(key, JSON.stringify(metadata));

  // TODO: In production, POST to backend
  // await fetch('/api/garment-metadata', {
  //   method: 'POST',
  //   body: JSON.stringify(metadata)
  // });
}

/**
 * Load metadata from localStorage if it exists
 */
export function loadLocalMetadata(garmentId: string): GarmentMetadata | null {
  const key = `garment-metadata-${garmentId}`;
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    const metadata = JSON.parse(stored) as GarmentMetadata;
    console.log(`📦 Loaded local metadata for ${garmentId}:`, metadata);
    return metadata;
  } catch {
    return null;
  }
}

function createDefaultMetadata(garmentId: string): GarmentMetadata {
  return {
    ...DEFAULT_METADATA,
    id: garmentId,
    displayName: garmentId.replace(/-/g, ' ')
  };
}

function validateMetadata(metadata: unknown): metadata is GarmentMetadata {
  if (!metadata || typeof metadata !== 'object') return false;

  const meta = metadata as Record<string, unknown>;

  return (
    typeof meta.id === 'string' &&
    typeof meta.version === 'number' &&
    meta.anchors !== undefined &&
    typeof meta.anchors === 'object' &&
    meta.anchors !== null &&
    Array.isArray((meta.anchors as Record<string, unknown>).collar_left) &&
    Array.isArray((meta.anchors as Record<string, unknown>).collar_right)
  );
}
