'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollIndicatorProps {
  /**
   * Container ref to track scroll state
   * If not provided, uses window scroll
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /**
   * Threshold in pixels from bottom to hide indicator
   * Default: 100px
   */
  hideThreshold?: number;
  /**
   * Only show on mobile viewports
   * Default: true
   */
  mobileOnly?: boolean;
  /**
   * Custom className for styling
   */
  className?: string;
  /**
   * Text to display above arrow
   */
  text?: string;
}

export default function ScrollIndicator({
  containerRef,
  hideThreshold = 100,
  mobileOnly = true,
  className,
  text = 'Scroll for more',
}: ScrollIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if there's scrollable content - always show if scrollable
    const checkScrollable = () => {
      if (containerRef?.current) {
        const container = containerRef.current;
        const hasScroll = container.scrollHeight > container.clientHeight;
        setVisible(hasScroll);
      } else {
        // Use window scroll
        const hasScroll = document.documentElement.scrollHeight > window.innerHeight;
        setVisible(hasScroll);
      }
    };

    // Initial check
    checkScrollable();

    // Recheck on resize and scroll (content might change dynamically)
    const target = containerRef?.current || window;
    target.addEventListener('scroll', checkScrollable as EventListener);
    window.addEventListener('resize', checkScrollable);

    // Cleanup
    return () => {
      target.removeEventListener('scroll', checkScrollable as EventListener);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [containerRef, hideThreshold]);

  const handleClick = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex justify-center',
        mobileOnly && 'md:hidden',
        className,
      )}
    >
      <button
        onClick={handleClick}
        className={cn(
          'pointer-events-auto flex flex-col items-center gap-1 rounded-full px-4 py-2',
          'bg-green-500/30 backdrop-blur-md border border-green-400/40',
          'text-green-50 text-xs font-medium',
          'transition-all duration-300 hover:bg-green-500/40 hover:scale-105 hover:border-green-400/60',
          'animate-bounce shadow-lg shadow-green-500/20',
        )}
        aria-label="Scroll to bottom"
      >
        {text && <span className="whitespace-nowrap">{text}</span>}
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
