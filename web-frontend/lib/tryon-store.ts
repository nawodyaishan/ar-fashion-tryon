import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Garment, Transform, PoseConfidence, Status, GarmentMetadata, UiMode, PoseConfidenceData } from './types';

interface TryonState {
  // Mode
  activeMode: 'ar' | 'photo';

  // Garments
  garments: Garment[];
  selectedGarmentId: string | null;

  // OLD: Single transform (kept for backward compatibility)
  transform: Transform;
  baselineTransform: Transform;

  // NEW: Dual transform system
  tracked: Transform;      // From pose detection (filtered)
  userDelta: Transform;    // From user edits (hands/mouse/keys)
  final: Transform;        // Composition result (what gets rendered)

  // NEW: UI mode
  mode: UiMode;

  // AR Settings
  mediaPipeEnabled: boolean;
  landmarksVisible: boolean;
  snapToShoulders: boolean;
  poseConfidence: PoseConfidence; // Legacy (kept for compatibility)

  // NEW: Enhanced confidence with hysteresis
  poseConfidenceData: PoseConfidenceData;

  continuousTracking: boolean;
  autoAlignInProgress: boolean;
  lastAutoAlignTime: number;

  // NEW: Metadata
  garmentMetadata: Map<string, GarmentMetadata>;

  // NEW: Filter state
  filterEnabled: boolean;

  // Status
  status: Status;

  // Photo Mode
  bodyPhoto: string | null;
  garmentPhoto: string | null;
  resultPhoto: string | null;

  // Modals
  helpModalOpen: boolean;
  aboutModalOpen: boolean;

  // Actions
  setMode: (mode: 'ar' | 'photo') => void;
  selectGarment: (id: string | null) => void;
  addGarment: (garment: Garment) => void;
  removeGarment: (id: string) => void;

  // OLD: Transform actions (kept for backward compatibility)
  setTransform: (transform: Partial<Transform>) => void;
  setOpacity: (opacity: number) => void;
  toggleLockAspect: () => void;
  autoAlign: () => void;
  resetToBaseline: () => void;

  // NEW: Dual transform actions
  setTracked: (transform: Partial<Transform>) => void;
  setUserDelta: (transform: Partial<Transform>) => void;
  composeFinal: () => void;  // tracked ⊕ userDelta → final
  setUiMode: (mode: UiMode) => void;
  resetUserDelta: () => void;
  rebaseTransforms: () => void;  // For smooth resume

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

// Helper: Identity transform (no change)
const identityTransform = (): Transform => ({
  x: 0,
  y: 0,
  scale: 1.0,
  rotation: 0,
  opacity: 90,
  lockAspect: true
});

// Helper: Default tracked transform (centered)
const defaultTracked = (): Transform => ({
  x: 320,
  y: 180,
  scale: 1.0,
  rotation: 0,
  opacity: 90,
  lockAspect: true
});

// Helper: Compose transforms (tracked + delta → final)
function composeTransforms(tracked: Transform, delta: Transform): Transform {
  return {
    x: tracked.x + delta.x,
    y: tracked.y + delta.y,
    scale: tracked.scale * delta.scale,
    rotation: tracked.rotation + delta.rotation,
    opacity: Math.min(100, tracked.opacity + (delta.opacity - 90)), // 90 is neutral
    lockAspect: tracked.lockAspect || delta.lockAspect
  };
}

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

      // OLD: Single transform (kept for backward compatibility)
      transform: { ...defaultTransform },
      baselineTransform: { ...defaultTransform },

      // NEW: Dual transform initialization
      tracked: defaultTracked(),
      userDelta: identityTransform(),
      final: defaultTracked(),

      // NEW: UI mode
      mode: 'AutoTrack',

      mediaPipeEnabled: false,
      landmarksVisible: false,
      snapToShoulders: true,
      poseConfidence: 'Okay', // Legacy

      // NEW: Enhanced confidence data
      poseConfidenceData: {
        value: 0,
        level: 'Low',
        tracking: false
      },

      continuousTracking: false,
      autoAlignInProgress: false,
      lastAutoAlignTime: 0,

      // NEW: Metadata and filter state
      garmentMetadata: new Map(),
      filterEnabled: true,

      status: {},
      bodyPhoto: null,
      garmentPhoto: null,
      resultPhoto: null,
      helpModalOpen: false,
      aboutModalOpen: false,

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

      // OLD: setTransform (kept for backward compatibility, now updates userDelta)
      setTransform: (partial) =>
        set((state) => {
          // Update both legacy transform and userDelta for backward compatibility
          const newTransform = { ...state.transform, ...partial };
          const newUserDelta = { ...state.userDelta, ...partial };
          const newFinal = composeTransforms(state.tracked, newUserDelta);

          return {
            transform: newTransform,
            userDelta: newUserDelta,
            final: newFinal
          };
        }),

      setOpacity: (opacity) =>
        set((state) => {
          const newTransform = { ...state.transform, opacity };
          const newUserDelta = { ...state.userDelta, opacity };
          const newFinal = composeTransforms(state.tracked, newUserDelta);

          return {
            transform: newTransform,
            userDelta: newUserDelta,
            final: newFinal
          };
        }),

      // NEW: Set tracked transform (from pose detection)
      setTracked: (transform) => set((state) => {
        const newTracked = { ...state.tracked, ...transform };
        return {
          tracked: newTracked,
          // Auto-compose whenever tracked changes (if in AutoTrack mode)
          ...(state.mode === 'AutoTrack' && { final: composeTransforms(newTracked, state.userDelta) })
        };
      }),

      // NEW: Set user delta (from manual edits)
      setUserDelta: (transform) => set((state) => {
        const newDelta = { ...state.userDelta, ...transform };
        const newFinal = composeTransforms(state.tracked, newDelta);
        return {
          userDelta: newDelta,
          final: newFinal
        };
      }),

      // NEW: Force composition (tracked ⊕ userDelta → final)
      composeFinal: () => set((state) => ({
        final: composeTransforms(state.tracked, state.userDelta)
      })),

      // NEW: Set UI mode
      setUiMode: (mode) => set({ mode }),

      // NEW: Reset user delta to identity
      resetUserDelta: () => set((state) => ({
        userDelta: identityTransform(),
        final: state.tracked
      })),

      // NEW: Rebase (smooth transition when resuming tracking)
      rebaseTransforms: () => {
        const state = get();

        console.log('🔄 Rebase: tracked =', state.tracked);
        console.log('🔄 Rebase: userDelta =', state.userDelta);
        console.log('🔄 Rebase: final =', state.final);

        // OPTION 2: Smooth rebase with lerp (200ms transition)
        // This prevents visible "snap" when resuming tracking
        const startTracked = { ...state.tracked };
        const targetTracked = { ...state.final };
        const startDelta = { ...state.userDelta };
        const targetDelta = identityTransform();

        const duration = 200; // ms
        const startTime = performance.now();

        const animate = () => {
          const elapsed = performance.now() - startTime;
          const t = Math.min(elapsed / duration, 1.0); // 0 to 1

          // Ease-out cubic: smooth deceleration
          const eased = 1 - Math.pow(1 - t, 3);

          // Lerp tracked: startTracked → targetTracked
          const lerpedTracked = {
            x: startTracked.x + (targetTracked.x - startTracked.x) * eased,
            y: startTracked.y + (targetTracked.y - startTracked.y) * eased,
            scale: startTracked.scale + (targetTracked.scale - startTracked.scale) * eased,
            rotation: startTracked.rotation + (targetTracked.rotation - startTracked.rotation) * eased,
            opacity: state.tracked.opacity,
            lockAspect: state.tracked.lockAspect
          };

          // Lerp userDelta: startDelta → identityTransform
          const lerpedDelta = {
            x: startDelta.x + (targetDelta.x - startDelta.x) * eased,
            y: startDelta.y + (targetDelta.y - startDelta.y) * eased,
            scale: startDelta.scale + (targetDelta.scale - startDelta.scale) * eased,
            rotation: startDelta.rotation + (targetDelta.rotation - startDelta.rotation) * eased,
            opacity: startDelta.opacity,
            lockAspect: startDelta.lockAspect
          };

          set({
            tracked: lerpedTracked,
            userDelta: lerpedDelta,
            final: composeTransforms(lerpedTracked, lerpedDelta)
          });

          if (t < 1.0) {
            requestAnimationFrame(animate);
          } else {
            // Ensure final state is exact
            set({
              tracked: targetTracked,
              userDelta: targetDelta,
              final: targetTracked
            });
            console.log('✅ Rebase complete');
          }
        };

        requestAnimationFrame(animate);
      },

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
        set((state) => {
          // Update tracked transform with new position
          const newTracked = {
            ...state.tracked,
            x: Math.round(x),
            y: Math.round(y),
            scale: Math.max(0.3, Math.min(3.0, scale)), // Clamp scale: 0.3 to 3.0
            rotation: Math.max(-45, Math.min(45, Math.round(rotation))) // Clamp rotation: -45° to +45°
          };

          // Also update legacy transform for backward compatibility
          const newTransform = { ...newTracked };

          // Compose with current userDelta
          const newFinal = composeTransforms(newTracked, state.userDelta);

          return {
            transform: newTransform,
            tracked: newTracked,
            final: newFinal,
            autoAlignInProgress: false,
            lastAutoAlignTime: Date.now()
          };
        }),

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
      name: 'tryon-store-v4', // Updated: Don't persist garments to avoid localStorage quota
      partialize: (state) => ({
        // Only persist settings, NOT garments (to avoid localStorage quota)
        // Custom garments with large image data URLs will exceed browser limits
        snapToShoulders: state.snapToShoulders,
        activeMode: state.activeMode,
        filterEnabled: state.filterEnabled,
      }),
      // Add storage error handler to prevent quota errors from breaking the app
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('⚠️ Failed to rehydrate storage:', error);
          // Clear corrupted storage
          try {
            localStorage.removeItem('tryon-store-v4');
            console.log('🗑️ Cleared corrupted localStorage');
          } catch (e) {
            console.error('Failed to clear localStorage:', e);
          }
        } else if (state) {
          console.log('✅ Store rehydrated successfully');
        }
      },
    },
  ),
);
