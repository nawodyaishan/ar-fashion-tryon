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
  lockScale: boolean; // Lock garment size during tracking
  autoAlignInProgress: boolean;
  lastAutoAlignTime: number;

  // New Positioning Features
  positionHistory: Transform[];
  historyIndex: number;
  fineTuneMode: boolean;
  showAlignmentGuides: boolean;

  // Status
  status: Status;

  // Photo Mode
  bodyPhoto: string | null;
  garmentPhoto: string | null;
  resultPhoto: string | null;

  // Modals
  helpModalOpen: boolean;
  aboutModalOpen: boolean;
  arOnboardingOpen: boolean;
  photoOnboardingOpen: boolean;

  // Actions
  setMode: (mode: 'ar' | 'photo') => void;
  selectGarment: (id: string | null) => void;
  addGarment: (garment: Garment) => void;
  removeGarment: (id: string) => void;
  setTransform: (transform: Partial<Transform>, addToHistory?: boolean) => void;
  setOpacity: (opacity: number) => void;
  toggleLockAspect: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  toggleFineTuneMode: () => void;
  toggleAlignmentGuides: () => void;
  applyPreset: (preset: 'chest' | 'waist' | 'shoulders', containerWidth: number, containerHeight: number) => void;
  centerGarment: (containerWidth: number, containerHeight: number, garmentWidth: number) => void;
  saveGarmentPosition: (garmentId: string) => void;
  loadGarmentPosition: (garmentId: string) => void;
  autoAlign: () => void;
  resetToBaseline: () => void;
  toggleMediaPipe: () => void;
  toggleLandmarks: () => void;
  setLandmarksVisible: (visible: boolean) => void;
  setSnapToShoulders: (snap: boolean) => void;
  setPoseConfidence: (confidence: PoseConfidence | number) => void;
  toggleContinuousTracking: () => void;
  toggleLockScale: () => void;
  autoAlignGarment: (x: number, y: number, scale: number, rotation: number) => void;
  setStatus: (status: Partial<Status>) => void;
  setBodyPhoto: (photo: string | null) => void;
  setGarmentPhoto: (photo: string | null) => void;
  setResultPhoto: (photo: string | null) => void;
  openHelp: () => void;
  closeHelp: () => void;
  openAbout: () => void;
  closeAbout: () => void;
  openAROnboarding: () => void;
  closeAROnboarding: () => void;
  openPhotoOnboarding: () => void;
  closePhotoOnboarding: () => void;
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

// Sample garments for demo (disabled - users should upload their own)
const sampleGarments: Garment[] = [];

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
      lockScale: false,
      autoAlignInProgress: false,
      lastAutoAlignTime: 0,
      positionHistory: [{ ...defaultTransform }],
      historyIndex: 0,
      fineTuneMode: false,
      showAlignmentGuides: false,
      status: {},
      bodyPhoto: null,
      garmentPhoto: null,
      resultPhoto: null,
      helpModalOpen: false,
      aboutModalOpen: false,
      arOnboardingOpen: false,
      photoOnboardingOpen: false,

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

      setTransform: (partial, addToHistory = true) =>
        set((state) => {
          const newTransform = { ...state.transform, ...partial };

          if (addToHistory) {
            // Add to history and truncate any forward history
            const newHistory = [...state.positionHistory.slice(0, state.historyIndex + 1), newTransform];
            // Keep max 50 history items
            const trimmedHistory = newHistory.slice(-50);

            return {
              transform: newTransform,
              positionHistory: trimmedHistory,
              historyIndex: trimmedHistory.length - 1,
            };
          }

          return { transform: newTransform };
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1;
            return {
              transform: state.positionHistory[newIndex],
              historyIndex: newIndex,
            };
          }
          return state;
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex < state.positionHistory.length - 1) {
            const newIndex = state.historyIndex + 1;
            return {
              transform: state.positionHistory[newIndex],
              historyIndex: newIndex,
            };
          }
          return state;
        }),

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().positionHistory.length - 1,

      toggleFineTuneMode: () =>
        set((state) => ({
          fineTuneMode: !state.fineTuneMode,
        })),

      toggleAlignmentGuides: () =>
        set((state) => ({
          showAlignmentGuides: !state.showAlignmentGuides,
        })),

      applyPreset: (preset, containerWidth, containerHeight) => {
        const presets = {
          chest: {
            x: containerWidth / 2 - 100,
            y: containerHeight * 0.25,
            scale: 1.0,
          },
          waist: {
            x: containerWidth / 2 - 100,
            y: containerHeight * 0.45,
            scale: 0.8,
          },
          shoulders: {
            x: containerWidth / 2 - 120,
            y: containerHeight * 0.2,
            scale: 1.2,
          },
        };

        const position = presets[preset];
        get().setTransform(position, true);
      },

      centerGarment: (containerWidth, containerHeight, garmentWidth) => {
        const centerX = (containerWidth - garmentWidth) / 2;
        const centerY = containerHeight * 0.3;
        get().setTransform({ x: centerX, y: centerY }, true);
      },

      saveGarmentPosition: (garmentId) => {
        const { transform } = get();
        try {
          localStorage.setItem(`garment-position-${garmentId}`, JSON.stringify(transform));
        } catch (error) {
          console.warn('Failed to save garment position:', error);
        }
      },

      loadGarmentPosition: (garmentId) => {
        try {
          const saved = localStorage.getItem(`garment-position-${garmentId}`);
          if (saved) {
            const transform = JSON.parse(saved);
            get().setTransform(transform, false); // Don't add to history on load
          }
        } catch (error) {
          console.warn('Failed to load garment position:', error);
        }
      },

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

      toggleLockScale: () =>
        set((state) => ({
          lockScale: !state.lockScale,
        })),

      autoAlignGarment: (x, y, scale, rotation) =>
        set((state) => ({
          transform: {
            ...state.transform,
            x: Math.round(x),
            y: Math.round(y),
            // Only update scale if not locked
            scale: state.lockScale ? state.transform.scale : Math.max(0.3, Math.min(3.0, scale)),
            rotation: Math.max(-45, Math.min(45, Math.round(rotation))) // Clamp rotation: -45° to +45°
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

      openAROnboarding: () => set({ arOnboardingOpen: true }),
      closeAROnboarding: () => set({ arOnboardingOpen: false }),

      openPhotoOnboarding: () => set({ photoOnboardingOpen: true }),
      closePhotoOnboarding: () => set({ photoOnboardingOpen: false }),

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
