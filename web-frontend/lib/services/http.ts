import axios from 'axios';

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_VTON_API_BASE || 'http://127.0.0.1:8000',
  timeout: 60_000, // long-running generation
  headers: {
    'X-Client': 'ar-tryon-web',
    // Note: User-Agent is a forbidden header in browsers and cannot be set
    // The browser will automatically set it
  },
});
