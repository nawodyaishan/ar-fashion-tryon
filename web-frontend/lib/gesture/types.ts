export interface PinchData {
  center: { x: number; y: number };  // In pixels
  active: boolean;
  hand: 'left' | 'right';
}

export interface GestureState {
  type: 'idle' | 'one-pinch-drag' | 'two-pinch-scale-rotate';
  pinches: PinchData[];
  baseTransform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  startPinches: PinchData[];
  startDistance?: number;
  startAngle?: number;
}
