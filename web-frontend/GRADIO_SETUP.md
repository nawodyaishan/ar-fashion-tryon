# Gradio HuggingFace Space Setup Guide

This guide explains how to configure the frontend to use the Gradio-based virtual try-on service hosted on HuggingFace Spaces.

## Environment Variables

Create a `.env.local` file in the `web-frontend` directory with the following configuration:

```bash
# ==============================================================================
# Gradio HuggingFace Space Configuration
# ==============================================================================

# Space identifier (format: username/space-name)
NEXT_PUBLIC_GRADIO_SPACE=nawodyaishan/ar-fashion-tryon

# HuggingFace Token (Required for private spaces, optional for public)
# Get your token from: https://huggingface.co/settings/tokens
# Permissions needed: Read access to repositories
NEXT_PUBLIC_HF_TOKEN=hf_your_token_here

# API Timeout (milliseconds)
# Recommended: 120000 (2 minutes) for GPU processing
# Increase to 180000 (3 minutes) for CPU or slower hardware
NEXT_PUBLIC_API_TIMEOUT=120000

# Garment Extraction API (Local service)
NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000
```

## Getting Your HuggingFace Token

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: `ar-fashion-tryon` (or any name)
4. Type: Select "Read" (minimum required)
5. Click "Generate"
6. Copy the token (starts with `hf_`)
7. Add to `.env.local` as shown above

## Space Configuration

### Public Space (No Token Required)
If your space is public, you can omit the `NEXT_PUBLIC_HF_TOKEN` or leave it empty:

```bash
NEXT_PUBLIC_GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
NEXT_PUBLIC_HF_TOKEN=
```

### Private Space (Token Required)
For private spaces, you must provide a valid HuggingFace token:

```bash
NEXT_PUBLIC_GRADIO_SPACE=your-username/your-private-space
NEXT_PUBLIC_HF_TOKEN=hf_your_token_here
```

## API Request Format

The Gradio client uses the following format for the `/submit_function` endpoint:

```javascript
{
  person_image: {
    background: handle_file(personFile),  // File object
    layers: [],                            // Empty array for ImageEditor
    composite: null                        // Required field
  },
  cloth_image: handle_file(clothFile),    // File object
  cloth_type: "upper" | "lower" | "overall",
  num_inference_steps: 50,                // 20-100 (quality)
  guidance_scale: 2.5,                    // 1.0-10.0 (adherence)
  seed: 42,                               // -1 for random
  show_type: "result only"                // Display mode
}
```

## How It Works

1. **File Upload**: Files are automatically uploaded using `handle_file()` from `@gradio/client`
2. **Authentication**: Token is passed via `hf_token` option to `Client.connect()`
3. **ImageEditor Component**: The `person_image` uses a special format for Gradio's ImageEditor:
   - `background`: The uploaded file
   - `layers`: Empty array (no editing layers)
   - `composite`: `null` (no composite image)
4. **Response Handling**: The result is converted to a data URL for display

## Troubleshooting

### "Failed to connect to space"
- Check that `NEXT_PUBLIC_GRADIO_SPACE` is correct (format: `username/space-name`)
- Verify the space is running on HuggingFace
- For private spaces, ensure `NEXT_PUBLIC_HF_TOKEN` is valid

### "Authentication failed"
- Check that your HF token is valid and not expired
- Ensure the token has "Read" permissions
- Token must start with `hf_`

### "Request timeout"
- Increase `NEXT_PUBLIC_API_TIMEOUT` (default 120000ms = 2 minutes)
- Check the space status on HuggingFace (may be sleeping/building)
- GPU processing: 30-60 seconds per image
- CPU processing: 2-5 minutes per image

### "Invalid response format"
- Ensure the space is running the correct Gradio app
- Check the space logs on HuggingFace for errors
- Verify the API endpoint is `/submit_function`

## API Endpoints

The Gradio Space provides these endpoints:

### `/submit_function` (Main Try-On)
**Parameters:**
- `person_image`: ImageEditor format (see above)
- `cloth_image`: File/Blob
- `cloth_type`: "upper" | "lower" | "overall"
- `num_inference_steps`: 20-100 (default: 50)
- `guidance_scale`: 1.0-10.0 (default: 2.5)
- `seed`: -1 to 999 (default: 42, -1 = random)
- `show_type`: "result only" | "input & result"

**Returns:** Image (Blob, data URL, or file path)

### `/person_example_fn` (Load Example)
**Parameters:**
- `image_path`: File/Blob

**Returns:** ImageEditor format

## Performance Tips

1. **Use GPU Space**: Significantly faster (30-60s vs 2-5min on CPU)
2. **Reduce Inference Steps**: Lower quality but faster (try 20-30 steps)
3. **Optimize Image Size**: Resize to 768x1024 or 512x768 before upload
4. **Enable Caching**: The client caches connections for faster subsequent requests

## Testing

Test the connection:

```bash
# In web-frontend directory
pnpm dev

# Navigate to http://localhost:3000/try-on
# Switch to "Photo Try-On HD" mode
# Upload body and garment images
# Click "Generate Try-On Result"
# Check browser console for logs
```

Expected console output:
```
🔐 Connecting to Gradio Space: { space: 'nawodyaishan/ar-fashion-tryon', authenticated: true }
✅ Connected to Gradio Space successfully
🚀 Gradio Client Request: { ... }
✅ Gradio Client Success: { duration: '45.23s', size: '1.2 MB' }
```

## Security Notes

- **Never commit `.env.local` to git** (already in `.gitignore`)
- Rotate tokens regularly on HuggingFace
- Use "Read" permission tokens, not "Write"
- For production, use environment variables in your hosting platform
- Keep tokens separate for development and production

## Production Deployment

For Vercel/Netlify/etc., add environment variables in the dashboard:

```
NEXT_PUBLIC_GRADIO_SPACE=your-username/your-space
NEXT_PUBLIC_HF_TOKEN=hf_production_token_here
NEXT_PUBLIC_API_TIMEOUT=120000
```

Don't forget to redeploy after adding environment variables.
