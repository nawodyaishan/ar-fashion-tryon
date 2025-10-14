/**
 * Filtering utilities for smooth pose tracking
 *
 * This module provides filters for smoothing pose detection data:
 * - EMAFilter: Exponential Moving Average for single values
 * - TransformFilter: Multi-dimensional EMA for transforms
 * - HysteresisGate: Prevents jitter when confidence fluctuates
 */

/**
 * Exponential Moving Average filter for smooth tracking
 * Lower alpha = more smoothing, higher latency
 */
export class EMAFilter {
  private value: number | null = null;
  private alpha: number;

  constructor(alpha: number = 0.15) {
    this.alpha = alpha;
  }

  filter(newValue: number): number {
    if (this.value === null) {
      this.value = newValue;
      return newValue;
    }

    this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset() {
    this.value = null;
  }

  getValue(): number | null {
    return this.value;
  }
}

/**
 * Multi-dimensional EMA filter for transforms
 */
export class TransformFilter {
  private xFilter: EMAFilter;
  private yFilter: EMAFilter;
  private scaleFilter: EMAFilter;
  private rotFilter: EMAFilter;

  constructor(
    posAlpha: number = 0.15,
    scaleAlpha: number = 0.10,
    rotAlpha: number = 0.10
  ) {
    this.xFilter = new EMAFilter(posAlpha);
    this.yFilter = new EMAFilter(posAlpha);
    this.scaleFilter = new EMAFilter(scaleAlpha);
    this.rotFilter = new EMAFilter(rotAlpha);
  }

  filter(transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }): typeof transform {
    return {
      x: this.xFilter.filter(transform.x),
      y: this.yFilter.filter(transform.y),
      scale: this.scaleFilter.filter(transform.scale),
      rotation: this.rotFilter.filter(transform.rotation)
    };
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.scaleFilter.reset();
    this.rotFilter.reset();
  }
}

/**
 * Hysteresis gate for visibility-based tracking
 * Prevents jitter when confidence fluctuates near threshold
 */
export class HysteresisGate {
  private isActive: boolean = false;
  private enterThreshold: number;
  private exitThreshold: number;

  constructor(enterThreshold: number = 0.70, exitThreshold: number = 0.55) {
    this.enterThreshold = enterThreshold;
    this.exitThreshold = exitThreshold;
  }

  update(confidence: number): boolean {
    if (!this.isActive && confidence >= this.enterThreshold) {
      this.isActive = true;
    } else if (this.isActive && confidence < this.exitThreshold) {
      this.isActive = false;
    }

    return this.isActive;
  }

  isTracking(): boolean {
    return this.isActive;
  }

  reset() {
    this.isActive = false;
  }
}
