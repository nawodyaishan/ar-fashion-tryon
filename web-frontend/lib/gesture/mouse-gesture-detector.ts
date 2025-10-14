export interface MouseGestureData {
  type: 'drag' | 'scale' | 'rotate' | null;
  startPos: { x: number; y: number };
  currentPos: { x: number; y: number };
  active: boolean;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
}

export class MouseGestureDetector {
  private gestureData: MouseGestureData = {
    type: null,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    active: false,
    modifiers: { shift: false, ctrl: false, alt: false }
  };

  handleMouseDown(e: MouseEvent) {
    this.gestureData.active = true;
    this.gestureData.startPos = { x: e.clientX, y: e.clientY };
    this.gestureData.currentPos = { x: e.clientX, y: e.clientY };
    this.gestureData.modifiers = {
      shift: e.shiftKey,
      ctrl: e.ctrlKey || e.metaKey,
      alt: e.altKey
    };

    // Determine gesture type from modifiers
    if (this.gestureData.modifiers.ctrl) {
      this.gestureData.type = 'scale';
    } else if (this.gestureData.modifiers.alt) {
      this.gestureData.type = 'rotate';
    } else {
      this.gestureData.type = 'drag';
    }
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.gestureData.active) return;

    this.gestureData.currentPos = { x: e.clientX, y: e.clientY };
  }

  handleMouseUp() {
    this.gestureData.active = false;
    this.gestureData.type = null;
  }

  getGestureData(): MouseGestureData {
    return { ...this.gestureData };
  }

  isActive(): boolean {
    return this.gestureData.active;
  }

  reset() {
    this.gestureData = {
      type: null,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
      active: false,
      modifiers: { shift: false, ctrl: false, alt: false }
    };
  }
}
