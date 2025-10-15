import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Simplified Store - Backend-Driven AR System
 * No gestures, no manual transforms - everything from backend
 */

export interface Transform {
  tx: number;        // Translation X (pixels) - from backend
  ty: number;        // Translation Y (pixels) - from backend
  scale: number;     // Scale factor - from backend
  rotation: number;  // Rotation (radians) - from backend
  opacity: number;   // 0-100 (local UI control only)
}

export interface Garment {
  id: string;
  name: string;
  src: string;
  category: string;
  gsmId?: string;    // Backend GSM ID after processing
  width?: number;
  height?: number;
}

interface TryonState {
  // Mode
  activeMode: 'ar' | 'photo';

  // Garments
  garments: Garment[];
  selectedGarmentId: string | null;

  // Transform (from backend fit solver)
  transform: Transform;

  // MediaPipe
  mediaPipeEnabled: boolean;
  landmarksVisible: boolean;
  poseConfidence: number;      // 0-1 from backend

  // Status
  status: {
    camera: boolean;
    fitting: boolean;           // tracking vs paused
    message?: string;
  };

  // Actions
  setMode: (mode: 'ar' | 'photo') => void;
  selectGarment: (id: string | null) => void;
  addGarment: (garment: Garment) => void;
  updateGarment: (id: string, updates: Partial<Garment>) => void;
  removeGarment: (id: string) => void;
  setTransform: (transform: Partial<Transform>) => void;
  setOpacity: (opacity: number) => void;
  toggleMediaPipe: () => void;
  toggleLandmarks: () => void;
  setPoseConfidence: (confidence: number) => void;
  setStatus: (status: Partial<TryonState['status']>) => void;
  clearAll: () => void;
}

const defaultTransform = (): Transform => ({
  tx: 320,
  ty: 180,
  scale: 1.0,
  rotation: 0,
  opacity: 90
});

// Sample garments
const sampleGarments: Garment[] = [
  {
    id: 'sample-1',
    name: 'White T-Shirt',
    src: '/garments/white-tshirt.jpg',
    category: 'tshirt'
  },
  {
    id: 'sample-2',
    name: 'Black Hoodie',
    src: '/garments/black-hoodie.jpg',
    category: 'tshirt'
  },
  {
    id: 'sample-3',
    name: 'Denim Jacket',
    src: '/garments/denim-jacket.jpg',
    category: 'shirt'
  }
];

export const useTryonStore = create<TryonState>()(
  persist(
    (set, get) => ({
      activeMode: 'ar',

      garments: sampleGarments,
      selectedGarmentId: null,
      transform: defaultTransform(),

      mediaPipeEnabled: false,
      landmarksVisible: false,
      poseConfidence: 0,

      status: {
        camera: false,
        fitting: false
      },

      setMode: (mode) => set({ activeMode: mode }),

      selectGarment: (id) => set({ selectedGarmentId: id }),

      addGarment: (garment) => set((state) => ({
        garments: [...state.garments, garment]
      })),

      updateGarment: (id, updates) => set((state) => ({
        garments: state.garments.map(g =>
          g.id === id ? { ...g, ...updates } : g
        )
      })),

      removeGarment: (id) => set((state) => ({
        garments: state.garments.filter(g => g.id !== id),
        selectedGarmentId: state.selectedGarmentId === id ? null : state.selectedGarmentId
      })),

      setTransform: (partial) => set((state) => ({
        transform: { ...state.transform, ...partial }
      })),

      setOpacity: (opacity) => set((state) => ({
        transform: { ...state.transform, opacity }
      })),

      toggleMediaPipe: () => set((state) => ({
        mediaPipeEnabled: !state.mediaPipeEnabled
      })),

      toggleLandmarks: () => set((state) => ({
        landmarksVisible: !state.landmarksVisible
      })),

      setPoseConfidence: (confidence) => set({ poseConfidence: confidence }),

      setStatus: (status) => set((state) => ({
        status: { ...state.status, ...status }
      })),

      clearAll: () => set({
        selectedGarmentId: null,
        transform: defaultTransform(),
        mediaPipeEnabled: false,
        landmarksVisible: false,
        status: { camera: false, fitting: false }
      })
    }),
    {
      name: 'tryon-store-v4-simple',
      partialize: (state) => ({
        garments: state.garments,
        activeMode: state.activeMode
      })
    }
  )
);
