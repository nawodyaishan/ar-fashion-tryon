// lib/gradio-client.ts
'use client';

import { Client } from '@gradio/client';

/** Config */
const GRADIO_SPACE = process.env.NEXT_PUBLIC_GRADIO_SPACE || 'nawodyaishan/ar-fashion-tryon';
const HF_TOKEN = (process.env.NEXT_PUBLIC_HF_TOKEN ?? '') as `hf_${string}` | '';
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
