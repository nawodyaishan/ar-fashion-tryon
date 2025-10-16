/**
 * Onboarding utilities for first-visit detection and management
 */

const STORAGE_KEYS = {
  AR_ONBOARDING_SEEN: 'ar-tryon-onboarding-seen',
  PHOTO_ONBOARDING_SEEN: 'photo-tryon-onboarding-seen',
} as const;

/**
 * Check if user has seen AR mode onboarding
 */
export function hasSeenAROnboarding(): boolean {
  if (typeof window === 'undefined') return true; // SSR safe
  return localStorage.getItem(STORAGE_KEYS.AR_ONBOARDING_SEEN) === 'true';
}

/**
 * Mark AR mode onboarding as seen
 */
export function markAROnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.AR_ONBOARDING_SEEN, 'true');
}

/**
 * Check if user has seen Photo mode onboarding
 */
export function hasSeenPhotoOnboarding(): boolean {
  if (typeof window === 'undefined') return true; // SSR safe
  return localStorage.getItem(STORAGE_KEYS.PHOTO_ONBOARDING_SEEN) === 'true';
}

/**
 * Mark Photo mode onboarding as seen
 */
export function markPhotoOnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PHOTO_ONBOARDING_SEEN, 'true');
}

/**
 * Reset both onboarding flags (useful for testing)
 */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.AR_ONBOARDING_SEEN);
  localStorage.removeItem(STORAGE_KEYS.PHOTO_ONBOARDING_SEEN);
}

/**
 * Check if user has seen any onboarding
 */
export function hasSeenAnyOnboarding(): boolean {
  return hasSeenAROnboarding() || hasSeenPhotoOnboarding();
}
