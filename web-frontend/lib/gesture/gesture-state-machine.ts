import type { GestureState, PinchData } from './types';
import { pinchDistance, pinchAngle, pinchMidpoint } from './pinch-detector';

export class GestureStateMachine {
  private state: GestureState;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private onRebaseNeeded: (() => void) | null = null;

  constructor() {
    this.state = {
      type: 'idle',
      pinches: [],
      baseTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
      startPinches: []
    };
  }

  /**
   * Set callback to be called when rebase is needed (after 800ms timer)
   */
  setRebaseCallback(callback: () => void) {
    this.onRebaseNeeded = callback;
  }

  /**
   * Update state machine with new pinch data
   * Returns updated userDelta transform
   */
  step(
    pinches: PinchData[],
    currentUserDelta: { x: number; y: number; scale: number; rotation: number }
  ): { x: number; y: number; scale: number; rotation: number } | null {
    const activePinches = pinches.filter(p => p.active);

    // IDLE → Enter gesture
    if (this.state.type === 'idle' && activePinches.length > 0) {
      this.enterGesture(activePinches, currentUserDelta);
      return null; // Don't update transform on first frame
    }

    // ONE-PINCH-DRAG
    if (this.state.type === 'one-pinch-drag') {
      if (activePinches.length === 0) {
        // Release → start resume timer
        this.exitGesture();
        return null;
      }

      if (activePinches.length === 2) {
        // Transition to two-pinch
        this.state.type = 'two-pinch-scale-rotate';
        this.state.startPinches = activePinches;
        this.state.startDistance = pinchDistance(activePinches[0], activePinches[1]);
        this.state.startAngle = pinchAngle(activePinches[0], activePinches[1]);
        return null;
      }

      // Update drag
      return this.updateOnePinchDrag(activePinches[0]);
    }

    // TWO-PINCH-SCALE-ROTATE
    if (this.state.type === 'two-pinch-scale-rotate') {
      if (activePinches.length === 0) {
        // Release → start resume timer
        this.exitGesture();
        return null;
      }

      if (activePinches.length === 1) {
        // Transition to one-pinch
        this.state.type = 'one-pinch-drag';
        this.state.startPinches = activePinches;
        return null;
      }

      // Update scale/rotate
      return this.updateTwoPinchScaleRotate(activePinches);
    }

    return null;
  }

  private enterGesture(pinches: PinchData[], currentUserDelta: { x: number; y: number; scale: number; rotation: number }) {
    console.log('👋 Gesture started:', pinches.length, 'pinch(es)');

    this.state.type = pinches.length === 1 ? 'one-pinch-drag' : 'two-pinch-scale-rotate';
    this.state.pinches = pinches;
    this.state.baseTransform = { ...currentUserDelta };
    this.state.startPinches = pinches;

    if (pinches.length === 2) {
      this.state.startDistance = pinchDistance(pinches[0], pinches[1]);
      this.state.startAngle = pinchAngle(pinches[0], pinches[1]);
    }

    // Clear resume timer if it was running
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  private exitGesture() {
    console.log('👋 Gesture ended, starting resume timer...');

    this.state.type = 'idle';

    // Start 800ms resume timer
    this.resumeTimer = setTimeout(() => {
      console.log('⏰ Resume timer expired, calling rebase callback');
      this.resumeTimer = null;

      // CRITICAL: Trigger rebase callback
      if (this.onRebaseNeeded) {
        this.onRebaseNeeded();
      }
    }, 800);
  }

  private updateOnePinchDrag(pinch: PinchData): { x: number; y: number; scale: number; rotation: number } {
    const start = this.state.startPinches[0];

    const deltaX = pinch.center.x - start.center.x;
    const deltaY = pinch.center.y - start.center.y;

    return {
      x: this.state.baseTransform.x + deltaX,
      y: this.state.baseTransform.y + deltaY,
      scale: this.state.baseTransform.scale,
      rotation: this.state.baseTransform.rotation
    };
  }

  private updateTwoPinchScaleRotate(pinches: PinchData[]): { x: number; y: number; scale: number; rotation: number } {
    const currentDist = pinchDistance(pinches[0], pinches[1]);
    const currentAngle = pinchAngle(pinches[0], pinches[1]);
    const currentMid = pinchMidpoint(pinches[0], pinches[1]);

    const startDist = this.state.startDistance!;
    const startAngle = this.state.startAngle!;
    const startMid = pinchMidpoint(this.state.startPinches[0], this.state.startPinches[1]);

    // Calculate scale change
    const scaleRatio = currentDist / startDist;
    const newScale = this.state.baseTransform.scale * scaleRatio;

    // Calculate rotation change
    const angleDelta = currentAngle - startAngle;
    const newRotation = this.state.baseTransform.rotation + angleDelta;

    // Calculate position change (track midpoint shift)
    const midDeltaX = currentMid.x - startMid.x;
    const midDeltaY = currentMid.y - startMid.y;

    return {
      x: this.state.baseTransform.x + midDeltaX,
      y: this.state.baseTransform.y + midDeltaY,
      scale: Math.max(0.3, Math.min(3.0, newScale)),
      rotation: Math.max(-45, Math.min(45, newRotation))
    };
  }

  isActive(): boolean {
    return this.state.type !== 'idle';
  }

  shouldRebase(): boolean {
    return this.state.type === 'idle' && this.resumeTimer === null;
  }

  reset() {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }

    this.state = {
      type: 'idle',
      pinches: [],
      baseTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
      startPinches: []
    };
  }
}
