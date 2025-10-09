// lib/utils/device.ts - Device detection utilities
import { useState, useEffect } from 'react';

/**
 * Detects if the current device is mobile based on user agent
 * Works on both client and server side
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera;

  // Check for mobile device patterns
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent || '');
}

/**
 * Detects if the current device is a tablet
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera;

  // Check for tablet-specific patterns
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;
  return tabletRegex.test(userAgent || '');
}

/**
 * Detects if the current viewport width is mobile-sized
 * More reliable than user agent for responsive design
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768; // Tailwind md breakpoint
}

/**
 * Combined mobile detection (user agent + viewport)
 */
export function isMobile(): boolean {
  return isMobileDevice() || isMobileViewport();
}

/**
 * Hook for mobile detection with reactive updates
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    // Set initial value on client side
    setMobile(isMobile());

    const handleResize = () => {
      setMobile(isMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return mobile;
}
