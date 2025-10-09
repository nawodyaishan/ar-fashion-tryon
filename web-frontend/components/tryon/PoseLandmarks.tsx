// components/tryon/PoseLandmarks.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { PoseLandmark } from '@/lib/hooks/usePoseDetection';

interface PoseLandmarksProps {
  landmarks: PoseLandmark[] | null;
  width: number;
  height: number;
  visible: boolean;
}

// MediaPipe pose landmark indices
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [29, 31],
  [27, 31], [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
];

// Landmark categories for color coding
const FACE_LANDMARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SHOULDER_LANDMARKS = [11, 12];
const ARM_LANDMARKS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const TORSO_LANDMARKS = [23, 24];
const LEG_LANDMARKS = [25, 26, 27, 28, 29, 30, 31, 32];

export function PoseLandmarks({ landmarks, width, height, visible }: PoseLandmarksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible || !landmarks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw connections (bones)
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start && end &&
          (start.visibility || 0) > 0.5 &&
          (end.visibility || 0) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // Draw landmarks (joints)
    landmarks.forEach((landmark, index) => {
      if ((landmark.visibility || 0) < 0.5) return;

      const x = landmark.x * width;
      const y = landmark.y * height;

      // Color code by body part
      let color = 'white';
      let size = 4;

      if (SHOULDER_LANDMARKS.includes(index)) {
        color = '#00ff00'; // Green for shoulders (important for alignment)
        size = 8;
      } else if (FACE_LANDMARKS.includes(index)) {
        color = '#ff00ff'; // Magenta for face
      } else if (ARM_LANDMARKS.includes(index)) {
        color = '#ffff00'; // Yellow for arms
      } else if (TORSO_LANDMARKS.includes(index)) {
        color = '#00ffff'; // Cyan for torso
      } else if (LEG_LANDMARKS.includes(index)) {
        color = '#ff8800'; // Orange for legs
      }

      // Draw dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();

      // Draw outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw landmark number for shoulders (important for debugging)
      if (SHOULDER_LANDMARKS.includes(index)) {
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`#${index}`, x + 10, y - 5);
      }
    });
  }, [landmarks, width, height, visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
