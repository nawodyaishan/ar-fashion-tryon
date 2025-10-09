import axios from 'axios';

// Legacy VTON API base (deprecated - use garmentHttp for new endpoints)
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_VTON_API_BASE || 'http://127.0.0.1:8000',
  timeout: 60_000, // long-running generation
  headers: {
    'X-Client': 'ar-tryon-web',
    // Note: User-Agent is a forbidden header in browsers and cannot be set
    // The browser will automatically set it
  },
});

// Garment API with Gradio integration (recommended for new features)
export const garmentHttp = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GARMENT_API_BASE || 'http://127.0.0.1:5000',
  timeout: 120_000, // 2 minutes for Gradio processing
  headers: {
    'X-Client': 'ar-tryon-web',
  },
});
