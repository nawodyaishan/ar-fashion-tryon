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
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    // Check if there's scrollable content
    const checkScrollable = () => {
      if (containerRef?.current) {
        const container = containerRef.current;
        const hasScroll = container.scrollHeight > container.clientHeight;
        const isAtBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < hideThreshold;

        setVisible(hasScroll && !isAtBottom && !hasScrolled);
      } else {
        // Use window scroll
        const hasScroll = document.documentElement.scrollHeight > window.innerHeight;
        const isAtBottom =
          document.documentElement.scrollHeight - window.scrollY - window.innerHeight <
          hideThreshold;

        setVisible(hasScroll && !isAtBottom && !hasScrolled);
      }
    };

    const handleScroll = () => {
      setHasScrolled(true);
      checkScrollable();
    };

    // Initial check
    checkScrollable();

    // Add scroll listener
    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll as EventListener);

    // Recheck on resize
    window.addEventListener('resize', checkScrollable);

    // Cleanup
    return () => {
      target.removeEventListener('scroll', handleScroll as EventListener);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [containerRef, hideThreshold, hasScrolled]);

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
    setHasScrolled(true);
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
          'bg-black/40 backdrop-blur-md border border-white/10',
          'text-white/90 text-xs font-medium',
          'transition-all duration-300 hover:bg-black/50 hover:scale-105',
          'animate-bounce shadow-lg shadow-black/20',
        )}
        aria-label="Scroll to bottom"
      >
        {text && <span className="whitespace-nowrap">{text}</span>}
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
