// lib/gradio-client.ts
'use client';

import { Client } from '@gradio/client';

/** Config */
const GRADIO_SPACE = process.env.NEXT_PUBLIC_GRADIO_SPACE || 'nawodyaishan/ar-fashion-tryon';
const HF_TOKEN = (process.env.NEXT_PUBLIC_HF_TOKEN ?? '') as `hf_${string}` | '';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '120000', 10);

/** Helpers */
function withTimeout<T>(p: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Request timeout. Please try again.')), ms);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settle = (fn: (v: any) => void) => (v: any) => (clearTimeout(id), fn(v));
    if (signal) {
      if (signal.aborted) return (clearTimeout(id), reject(new Error('Request aborted.')));
      const onAbort = () => (clearTimeout(id), reject(new Error('Request aborted.')));
      signal.addEventListener('abort', onAbort, { once: true });
    }
    p.then(settle(resolve)).catch(settle(reject));
  });
}

function spaceBaseUrl(ref: string): string {
  if (/^https?:\/\//i.test(ref)) return ref.replace(/\/+$/, '');
  const [owner, name] = ref.split('/');
  return `https://${owner}-${name}.hf.space`;
}
function resolveGradioFileUrl(pathOrUrl: string, spaceRef = GRADIO_SPACE): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = spaceBaseUrl(spaceRef);
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (path.startsWith('/file=') || path.startsWith('/gradio_api/file=')) return `${base}${path}`;
  return `${base}/file=${encodeURIComponent(pathOrUrl)}`;
}

// Sniff common image types from first bytes
async function sniffImageMime(blob: Blob): Promise<string | null> {
  const slice = await blob.slice(0, 12).arrayBuffer();
  const b = new Uint8Array(slice);
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return 'image/png';
  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  // WebP: "RIFF"...."WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 && // RIFF
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return 'image/webp';
  return null;
}

// Blob → DataURL (preserving/correcting MIME)
async function blobToDataURLSafe(blob: Blob): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error || new Error('Failed to read image blob'));
    fr.readAsDataURL(blob);
  });
  // If reader returned "data:;base64,..." or empty type, patch it by sniffing
  if (/^data:;base64,/.test(dataUrl) || /^data:(?!image\/)/.test(dataUrl)) {
    const mime = (await sniffImageMime(blob)) || 'image/png';
    return dataUrl.replace(/^data:;?/, `data:${mime};`);
  }
  return dataUrl;
}

/** Health (optional) */
export async function checkGradioHealthClient(): Promise<boolean> {
  try {
    await Client.connect(GRADIO_SPACE, HF_TOKEN ? { hf_token: HF_TOKEN } : undefined);
    return true;
  } catch {
    return false;
  }
}

/** Utils */
export function base64ToBlob(base64: string): Blob {
  const b64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const mime = base64.match(/data:([^;]+);/)?.[1] || 'image/png';
  return new Blob([bytes], { type: mime });
}
export function downloadBase64ImageSmart(dataUrl: string, baseName = 'tryon-result') {
  // Open image in new window/tab
  const newWindow = window.open();

  if (newWindow) {
    // Detect mime and extension
    const mime = dataUrl.match(/^data:([^;]+);/i)?.[1] || 'image/png';
    const ext = mime.includes('webp')
      ? 'webp'
      : mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : 'png';

    // Create HTML content with the image
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${baseName.replace(/[<>"']/g, '')}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #000;
              font-family: system-ui, -apple-system, sans-serif;
            }
            img {
              max-width: 100%;
              max-height: 90vh;
              object-fit: contain;
              box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            .controls {
              position: fixed;
              top: 20px;
              right: 20px;
              display: flex;
              gap: 10px;
              z-index: 10;
            }
            button {
              padding: 10px 20px;
              background: #fff;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s;
            }
            button:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(255,255,255,0.3);
            }
            button:active {
              transform: translateY(0);
            }
          </style>
        </head>
        <body>
          <div class="controls">
            <button id="downloadBtn">Download</button>
            <button onclick="window.close()">Close</button>
          </div>
          <img id="resultImage" alt="Try-on result" />
        </body>
      </html>
    `);

    // Set image source and download handler via script injection (safer than inline)
    const script = newWindow.document.createElement('script');
    script.textContent = `
      (function() {
        const img = document.getElementById('resultImage');
        const downloadBtn = document.getElementById('downloadBtn');

        // Set image source
        img.src = ${JSON.stringify(dataUrl)};

        // Download handler
        downloadBtn.onclick = function() {
          const a = document.createElement('a');
          a.href = ${JSON.stringify(dataUrl)};
          a.download = ${JSON.stringify(`${baseName}.${ext}`)};
          document.body.appendChild(a);
          a.click();
          a.remove();
        };
      })();
    `;
    newWindow.document.body.appendChild(script);
    newWindow.document.close();
  } else {
    // Fallback: If popup was blocked, use the old download method
    console.warn('Popup blocked. Using fallback download method.');
    const mime = dataUrl.match(/^data:([^;]+);/i)?.[1] || 'image/png';
    const ext = mime.includes('webp')
      ? 'webp'
      : mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : 'png';
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${baseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
