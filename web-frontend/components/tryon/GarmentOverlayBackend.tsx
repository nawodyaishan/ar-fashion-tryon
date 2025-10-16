/**
 * Backend-Driven Garment Overlay
 * Renders garment with backend-calculated transform + warp
 * No manual controls - everything automatic
 */
'use client';

import { useEffect, useRef } from 'react';
import { useTryonStore } from '@/lib/tryon-store';
import type { WarpData, OcclusionData } from '@/lib/services/fit-client';

interface GarmentOverlayBackendProps {
  garmentSrc: string;
  containerWidth: number;
  containerHeight: number;
  warpData: WarpData | null;
  occlusionData: OcclusionData | null;
}

export function GarmentOverlayBackend({
  garmentSrc,
  containerWidth,
  containerHeight,
  warpData,
  occlusionData
}: GarmentOverlayBackendProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const { transform } = useTryonStore();

  // Load garment image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = garmentSrc;
    img.onload = () => {
      imageRef.current = img;
      drawGarment();
    };
    img.onerror = () => {
      console.error('Failed to load garment image');
    };
  }, [garmentSrc]);

  // Redraw when transform or warp changes
  useEffect(() => {
    drawGarment();
  }, [transform, warpData, occlusionData]);

  const drawGarment = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;

    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    ctx.save();

    // Apply base similarity transform from backend
    ctx.translate(transform.tx || 0, transform.ty || 0);
    ctx.rotate(transform.rotation || 0);
    ctx.scale(transform.scale || 1, transform.scale || 1);

    // Set opacity
    ctx.globalAlpha = (transform.opacity || 90) / 100;

    // Draw garment (centered at origin)
    const drawWidth = img.width;
    const drawHeight = img.height;
    const drawX = -drawWidth / 2;
    const drawY = -drawHeight / 2;

    // Apply TPS warp if available (simplified for MVP)
    if (warpData && warpData.type === 'tps') {
      // For MVP: Just draw normally without warp
      // TODO: Implement proper TPS interpolation in production
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Debug: Draw control points (dev only)
      if (process.env.NODE_ENV === 'development' && warpData.dst_ctrl.length > 0) {
        drawControlPoints(ctx, img, warpData);
      }
    } else {
      // No warp - just draw normally
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    ctx.restore();

    // Apply occlusion (neck clip)
    if (occlusionData && occlusionData.neck_clip) {
      applyNeckClip(ctx, occlusionData.neck_clip);
    }
  };

  const drawControlPoints = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    warp: WarpData
  ) => {
    ctx.save();

    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = 2;

    const drawWidth = img.width;
    const drawHeight = img.height;

    // Draw destination control points
    warp.dst_ctrl.forEach((pt, i) => {
      // Transform from normalized (0-1) to image space
      const x = (pt[0] - 0.5) * drawWidth;
      const y = (pt[1] - 0.5) * drawHeight;

      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Draw line from src to dst
      if (i < warp.src_ctrl.length) {
        const srcX = (warp.src_ctrl[i][0] - 0.5) * drawWidth;
        const srcY = (warp.src_ctrl[i][1] - 0.5) * drawHeight;

        ctx.beginPath();
        ctx.moveTo(srcX, srcY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    });

    ctx.restore();
  };

  const applyNeckClip = (
    ctx: CanvasRenderingContext2D,
    neckClip: { center: [number, number]; rx: number; ry: number }
  ) => {
    // Create elliptical clipping mask to hide back neck area
    ctx.save();

    ctx.globalCompositeOperation = 'destination-out';

    ctx.beginPath();
    ctx.ellipse(
      neckClip.center[0],
      neckClip.center[1],
      neckClip.rx,
      neckClip.ry,
      0,
      0,
      2 * Math.PI
    );
    ctx.fill();

    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      width={containerWidth}
      height={containerHeight}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}
