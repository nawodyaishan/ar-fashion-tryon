'use client';

import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'ar-tryon-onboarding-completed';
const CAMERA_PERMISSION_KEY = 'ar-tryon-camera-permission-requested';

interface OnboardingState {
  isFirstVisit: boolean;
  showWelcomeGuide: boolean;
  showCameraPermission: boolean;
  markOnboardingComplete: () => void;
  markCameraPermissionRequested: () => void;
  resetOnboarding: () => void;
}

/**
 * Hook to manage onboarding flow for first-time users
 * - Detects first visit using localStorage
 * - Manages welcome guide visibility
 * - Manages camera permission dialog visibility
 */
export function useOnboarding(): OnboardingState {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [showCameraPermission, setShowCameraPermission] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY);
    const cameraPermissionRequested = localStorage.getItem(CAMERA_PERMISSION_KEY);

    if (!onboardingCompleted) {
      setIsFirstVisit(true);
      setShowWelcomeGuide(true);
    } else if (!cameraPermissionRequested) {
      // Onboarding done but camera permission not requested
      setShowCameraPermission(true);
    }
  }, []);

  const markOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowWelcomeGuide(false);
    setIsFirstVisit(false);
  };

  const markCameraPermissionRequested = () => {
    localStorage.setItem(CAMERA_PERMISSION_KEY, 'true');
    setShowCameraPermission(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(CAMERA_PERMISSION_KEY);
    setIsFirstVisit(true);
    setShowWelcomeGuide(true);
  };

  return {
    isFirstVisit,
    showWelcomeGuide,
    showCameraPermission,
    markOnboardingComplete,
    markCameraPermissionRequested,
    resetOnboarding
  };
}
