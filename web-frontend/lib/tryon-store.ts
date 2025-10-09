import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Garment, Transform, PoseConfidence, Status } from './types';

interface TryonState {
  // Mode
  activeMode: 'ar' | 'photo';

  // Garments
  garments: Garment[];
  selectedGarmentId: string | null;

  // Transform
  transform: Transform;
  baselineTransform: Transform;

  // AR Settings
  mediaPipeEnabled: boolean;
  landmarksVisible: boolean;
  snapToShoulders: boolean;
  poseConfidence: PoseConfidence;
  continuousTracking: boolean;
  autoAlignInProgress: boolean;
  lastAutoAlignTime: number;

  // Status
  status: Status;

  // Photo Mode
  bodyPhoto: string | null;
  garmentPhoto: string | null;
  resultPhoto: string | null;

  // Modals
  helpModalOpen: boolean;
  aboutModalOpen: boolean;
  galleryModalOpen: boolean;

  // Actions
  setMode: (mode: 'ar' | 'photo') => void;
  selectGarment: (id: string | null) => void;
  addGarment: (garment: Garment) => void;
  removeGarment: (id: string) => void;
  setTransform: (transform: Partial<Transform>) => void;
  setOpacity: (opacity: number) => void;
  toggleLockAspect: () => void;
  autoAlign: () => void;
  resetToBaseline: () => void;
  toggleMediaPipe: () => void;
  toggleLandmarks: () => void;
  setLandmarksVisible: (visible: boolean) => void;
  setSnapToShoulders: (snap: boolean) => void;
  setPoseConfidence: (confidence: PoseConfidence | number) => void;
  toggleContinuousTracking: () => void;
  autoAlignGarment: (x: number, y: number, scale: number, rotation: number) => void;
  setStatus: (status: Partial<Status>) => void;
  setBodyPhoto: (photo: string | null) => void;
  setGarmentPhoto: (photo: string | null) => void;
  setResultPhoto: (photo: string | null) => void;
  openHelp: () => void;
  closeHelp: () => void;
  openAbout: () => void;
  closeAbout: () => void;
  openGallery: () => void;
  closeGallery: () => void;
  clearAll: () => void;
  resetPhotoMode: () => void;
}

const defaultTransform: Transform = {
  x: 320,      // Center of typical video width
  y: 180,      // Upper chest area
  scale: 1.0,
  rotation: 0,
  opacity: 90,  // 0-100 range
  lockAspect: true,
};

// Sample garments for demo
const sampleGarments: Garment[] = [
  {
    id: 'sample-1',
    name: 'White T-Shirt',
    src: '/garments/white-tshirt.jpg',
    width: 512,
    height: 512,
    sizeKb: 3,
    category: 'tops',
  },
  {
    id: 'sample-2',
    name: 'Black Hoodie',
    src: '/garments/black-hoodie.jpg',
    width: 512,
    height: 512,
    sizeKb: 4,
    category: 'tops',
  },
  {
    id: 'sample-3',
    name: 'Denim Jacket',
    src: '/garments/denim-jacket.jpg',
    width: 512,
    height: 512,
    sizeKb: 41,
    category: 'jackets',
  },
];

export const useTryonStore = create<TryonState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeMode: 'ar',
      garments: sampleGarments,
      selectedGarmentId: null,
      transform: { ...defaultTransform },
      baselineTransform: { ...defaultTransform },
      mediaPipeEnabled: false,
      landmarksVisible: false,
      snapToShoulders: true,
      poseConfidence: 'Okay',
      continuousTracking: false,
      autoAlignInProgress: false,
      lastAutoAlignTime: 0,
      status: {},
      bodyPhoto: null,
      garmentPhoto: null,
      resultPhoto: null,
      helpModalOpen: false,
      aboutModalOpen: false,
      galleryModalOpen: false,

      // Actions
      setMode: (mode) => set({ activeMode: mode }),

      selectGarment: (id) => set({ selectedGarmentId: id }),

      addGarment: (garment) =>
        set((state) => ({
          garments: [...state.garments, garment],
        })),

      removeGarment: (id) =>
        set((state) => ({
          garments: state.garments.filter((g) => g.id !== id),
          selectedGarmentId: state.selectedGarmentId === id ? null : state.selectedGarmentId,
        })),

      setTransform: (partial) =>
        set((state) => ({
          transform: { ...state.transform, ...partial },
        })),

      setOpacity: (opacity) =>
        set((state) => ({
          transform: { ...state.transform, opacity },
        })),

      toggleLockAspect: () =>
        set((state) => ({
          transform: { ...state.transform, lockAspect: !state.transform.lockAspect },
        })),

      autoAlign: () => {
        // Stub: In future, this will read pose landmarks and auto-adjust transform
        // For now, just save current transform as baseline
        const currentTransform = get().transform;
        set({
          baselineTransform: { ...currentTransform },
          status: { message: 'Auto-aligned to pose (demo mode)' },
        });
        setTimeout(() => {
          set({ status: {} });
        }, 2000);
      },

      resetToBaseline: () =>
        set((state) => ({
          transform: { ...state.baselineTransform },
          status: { message: 'Reset to baseline' },
        })),

      toggleMediaPipe: () =>
        set((state) => ({
          mediaPipeEnabled: !state.mediaPipeEnabled,
        })),

      toggleLandmarks: () =>
        set((state) => ({
          landmarksVisible: !state.landmarksVisible,
        })),

      setLandmarksVisible: (visible) => set({ landmarksVisible: visible }),

      setSnapToShoulders: (snap) => set({ snapToShoulders: snap }),

      setPoseConfidence: (confidence) => {
        // Accept either string or number (0-1)
        if (typeof confidence === 'number') {
          const label: PoseConfidence = confidence >= 0.7 ? 'Good' : confidence >= 0.5 ? 'Okay' : 'Low';
          set({ poseConfidence: label });
        } else {
          set({ poseConfidence: confidence });
        }
      },

      toggleContinuousTracking: () =>
        set((state) => ({
          continuousTracking: !state.continuousTracking,
        })),

      autoAlignGarment: (x, y, scale, rotation) =>
        set((state) => ({
          transform: {
            ...state.transform,
            x: Math.round(x),
            y: Math.round(y),
            scale: Math.max(0.3, Math.min(3.0, scale)), // Clamp scale
            rotation: Math.round(rotation)
          },
          autoAlignInProgress: false,
          lastAutoAlignTime: Date.now()
        })),

      setStatus: (status) =>
        set((state) => ({
          status: { ...state.status, ...status },
        })),

      setBodyPhoto: (photo) => set({ bodyPhoto: photo }),

      setGarmentPhoto: (photo) => set({ garmentPhoto: photo }),

      setResultPhoto: (photo) => set({ resultPhoto: photo }),

      openHelp: () => set({ helpModalOpen: true }),
      closeHelp: () => set({ helpModalOpen: false }),

      openAbout: () => set({ aboutModalOpen: true }),
      closeAbout: () => set({ aboutModalOpen: false }),

      openGallery: () => set({ galleryModalOpen: true }),
      closeGallery: () => set({ galleryModalOpen: false }),

      clearAll: () =>
        set({
          selectedGarmentId: null,
          transform: { ...defaultTransform },
          baselineTransform: { ...defaultTransform },
          status: {},
        }),

      resetPhotoMode: () =>
        set({
          bodyPhoto: null,
          garmentPhoto: null,
          resultPhoto: null,
          status: {},
        }),
    }),
    {
      name: 'tryon-store-v2',
      partialize: (state) => ({
        // Only persist garments and settings, not transient state
        garments: state.garments,
        snapToShoulders: state.snapToShoulders,
        activeMode: state.activeMode,
      }),
    },
  ),
);
