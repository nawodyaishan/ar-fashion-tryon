# Railway Deployment Guide

## Overview

This document provides comprehensive deployment procedures for the Garment Extraction API on Railway, including troubleshooting, validation, and monitoring strategies.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Initial Deployment](#initial-deployment)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

### ✅ Code Verification

```bash
# 1. Run local tests
python test_model_load.py

# 2. Verify all dependencies are in requirements.txt
pip freeze | grep -E "(tensorflow|fastapi|uvicorn|rembg|cloudinary)"

# 3. Check environment variables
cat .env.example  # Ensure all required vars are documented
```

### ✅ Model Files

**Critical:** Models MUST be uploaded to Google Drive due to Git LFS limitations on Railway.

```bash
# Verify model files locally
ls -lh models/*.h5
# Expected: 2 files, each ~150-160 MB

# Check Google Drive upload
# File ID should be in download_models_railway.sh or download_models_railway_v2.sh
grep "FILE_ID=" download_models_railway*.sh
```

### ✅ Environment Variables

Required variables in Railway:
- `CLOUDINARY_CLOUD_NAME` - Cloudinary account name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `HF_TOKEN` (optional) - HuggingFace token if Gradio space is private
- `GDRIVE_MODEL_FILE_ID` (optional) - Override Google Drive file ID

---

## Initial Deployment

### Step 1: Configure Railway Project

```bash
# Install Railway CLI (if not already)
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link
```

### Step 2: Set Environment Variables

```bash
# Method 1: Via CLI
railway variables set CLOUDINARY_CLOUD_NAME=your_cloud_name
railway variables set CLOUDINARY_API_KEY=your_api_key
railway variables set CLOUDINARY_API_SECRET=your_api_secret

# Method 2: Via Railway Dashboard
# Settings → Variables → Add all required vars
```

### Step 3: Deploy

```bash
# Push to main branch (triggers Railway deployment)
git push origin main

# Monitor deployment
railway logs
```

###Step 4: Build Process

Railway will execute (from `nixpacks.toml`):

```toml
[phases.setup]
nixPkgs = ["python39", "unzip"]

[phases.install]
cmds = [
  "python -m venv /opt/venv",
  ". /opt/venv/bin/activate && pip install -r requirements.txt",
  "chmod +x download_models_railway_v2.sh",
  ". /opt/venv/bin/activate && ./download_models_railway_v2.sh"
]

[start]
cmd = ". /opt/venv/bin/activate && gunicorn -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:$PORT app:app"
```

**Expected build time:** 5-8 minutes
- Dependencies installation: ~2 min
- Model download from Google Drive: ~1-2 min (293 MB)
- Model validation: ~1 min

---

## Post-Deployment Validation

### 1. Check Build Logs

```bash
railway logs --filter="Installing"
```

**Look for:**
- ✅ `Successfully installed tensorflow-cpu-2.20.0`
- ✅ `Download successful (293MB)`
- ✅ `✅ best_clothing_model.h5 (151MB)`
- ✅ `Model loaded and validated successfully`
- ✅ `✅ All checks passed - Models ready for deployment`

**Red flags:**
- ❌ `File size: 0.00 MB` - Git LFS files weren't downloaded
- ❌ `Download failed after 3 attempts` - Google Drive access issue
- ❌ `Zip file is corrupted` - Download interrupted
- ❌ `Model loading test failed` - TensorFlow incompatibility

### 2. Test Health Endpoint

```bash
# Get your Railway URL
RAILWAY_URL=$(railway status --json | jq -r '.service.url')

# Test health endpoint
curl "https://${RAILWAY_URL}/health" | jq .
```

**Expected Response:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "model_loaded": true,
  "model_name": "best_clothing_model.h5",
  "gradio_connected": true,
  "services": {
    "classification": "operational",
    "background_removal": "operational",
    "virtual_tryon": "operational",
    "cloudinary": "operational"
  }
}
```

**If `model_loaded: false`:**
1. Check Railway logs for model loading errors
2. Verify Google Drive file is public and accessible
3. Run build validation script (see below)

### 3. Test Classification Endpoint

```bash
# Upload a test garment image
curl -X POST "https://${RAILWAY_URL}/detect_garment_type" \
  -F "garment=@test_images/tshirt.jpg"
```

**Expected Response:**
```json
{
  "label": "tshirt",
  "confidence": 0.9234,
  "filename": "garment_abc123.jpg",
  "file_size_bytes": 54321,
  "content_type": "image/jpeg"
}
```

**If you get 500 error:**
- Check if `label` is "UNKNOWN" and `confidence` is 0.0 → Model not loaded
- Check logs for: `Model not loaded: No model file could be loaded`

---

## Common Issues & Solutions

### Issue 1: Model Files Are 0 Bytes

**Symptoms:**
```
File size: 0.00 MB
Failed to load: Unable to synchronously open file (file signature not found)
```

**Root Cause:** Railway doesn't fetch Git LFS files automatically.

**Solution:** Models are now downloaded from Google Drive during build.

**Verify:**
```bash
# Check download script exists
ls -l download_models_railway_v2.sh

# Verify FILE_ID is set
grep "FILE_ID=" download_models_railway_v2.sh
```

---

### Issue 2: Download Script Fails

**Symptoms:**
```
Download failed after 3 attempts
ERROR: Model verification failed
```

**Possible Causes:**
1. Google Drive file is not public
2. File ID is incorrect
3. Network timeout during download

**Solutions:**

**a) Verify Google Drive File:**
```bash
# Test download manually
FILE_ID="1oZhdDnXcQs5Oy84z1AqxoGV9GxEVKUbH"
curl -L "https://drive.google.com/uc?id=${FILE_ID}" -o test.zip

# Check file size
ls -lh test.zip
# Should be ~293 MB
```

**b) Update File ID:**
1. Upload `trained_models.zip` to Google Drive
2. Set sharing to "Anyone with the link"
3. Copy file ID from URL
4. Update `download_models_railway_v2.sh`:
   ```bash
   FILE_ID="YOUR_NEW_FILE_ID"
   ```

**c) Increase Timeout:**
Edit `download_models_railway_v2.sh`:
```bash
TIMEOUT_SECONDS=600  # Increase from 300 to 600
```

---

### Issue 3: TensorFlow Version Incompatibility

**Symptoms:**
```
Error when deserializing class 'InputLayer'
Unrecognized keyword arguments: ['batch_shape']
```

**Root Cause:** Models trained with old TensorFlow (<2.13) using `batch_shape`.

**Solution:** Models have been retrained with TensorFlow 2.16+ (see Google Colab notebook).

**Verify:**
```bash
# Check model was trained with correct TensorFlow
python - <<EOF
import tensorflow as tf
from pathlib import Path

model = tf.keras.models.load_model('models/best_clothing_model.h5', compile=False)
print(f"Model input shape: {model.input_shape}")
print(f"Model output shape: {model.output_shape}")
# Should load without errors
EOF
```

---

### Issue 4: Unzip Prompts for Overwrite

**Symptoms:**
```
replace /app/models/best_clothing_model.h5? [y]es, [n]o, [A]ll, [N]one, [r]ename:  NULL
ERROR: failed to solve: exit code: 1
```

**Root Cause:** Unzip trying to overwrite Git LFS placeholder files.

**Solution:** Added `-o` flag to unzip command.

**Verify:**
```bash
grep "unzip -o" download_models_railway_v2.sh
# Should show: unzip -o -q /tmp/trained_models.zip -d "$MODELS_DIR"
```

---

### Issue 5: Python/pip Not Found

**Symptoms:**
```
/bin/bash: line 1: pip: command not found
```

**Root Cause:** Python virtual environment not activated.

**Solution:** All commands now use `. /opt/venv/bin/activate &&` prefix.

**Verify nixpacks.toml:**
```toml
[phases.install]
cmds = [
  "python -m venv /opt/venv",
  ". /opt/venv/bin/activate && pip install -r requirements.txt",
  ". /opt/venv/bin/activate && ./download_models_railway_v2.sh"
]
```

---

## Monitoring & Alerts

### Health Check Monitoring

Set up automated health checks in Railway:

```bash
# Railway automatically monitors:
# - HTTP 200 responses from your app
# - Memory usage
# - CPU usage

# For custom monitoring, add health check endpoint to external service:
# - UptimeRobot (free): https://uptimerobot.com
# - Better Uptime: https://betteruptime.com
# - Pingdom: https://www.pingdom.com
```

**Health Check Configuration:**
- **URL:** `https://your-app.railway.app/health`
- **Interval:** Every 5 minutes
- **Timeout:** 30 seconds
- **Expected Response:** `{"status": "ok", "model_loaded": true}`

### Log Monitoring

Key log patterns to monitor:

**Success Patterns:**
```bash
# Model loaded successfully
railway logs | grep "Model loaded successfully"

# Classification working
railway logs | grep "Classification result:"

# No errors in last hour
railway logs --since 1h | grep -i error | wc -l
```

**Error Patterns to Alert On:**
```bash
# Model loading failed
railway logs | grep "MODEL LOADING FAILED"

# Classification failures
railway logs | grep "Classification failed"

# Memory issues
railway logs | grep "MemoryError"

# Timeout errors
railway logs | grep "TimeoutError"
```

---

## Rollback Procedures

### Quick Rollback

```bash
# 1. View recent deployments
railway deployments

# 2. Rollback to previous deployment
railway rollback <deployment-id>

# 3. Verify health
curl "https://your-app.railway.app/health" | jq .
```

### Manual Rollback

```bash
# 1. Checkout previous commit
git log --oneline -5
git checkout <previous-commit-hash>

# 2. Force push to trigger redeploy
git push --force origin main

# 3. Monitor deployment
railway logs
```

### Emergency Fix

If classification is broken but other services work:

**Option 1: Disable Classification**
```bash
# Set environment variable to skip model loading
railway variables set SKIP_MODEL_LOADING=true

# Update classifier.py to check this var
```

**Option 2: Use Fallback Model**
```bash
# Keep a backup model URL in environment
railway variables set FALLBACK_MODEL_URL="https://backup-location/model.h5"
```

---

## Performance Optimization

### Cold Start Optimization

Current cold start time: ~15-20 seconds
- Model loading: ~10s
- Gradio connection: ~3s
- Application startup: ~2s

**Improvements:**
1. Use Railway's persistent disk (beta)
2. Pre-load models during build
3. Implement model caching

### Memory Optimization

Current memory usage:
- Base application: ~300 MB
- TensorFlow model: ~400 MB
- rembg (u2net): ~200 MB
- **Total:** ~900 MB

**Railway Plan Requirements:**
- Minimum: Starter Plan (512 MB) - May cause OOM
- Recommended: Developer Plan (1 GB) - Safe
- Optimal: Team Plan (2 GB+) - Headroom for traffic spikes

---

## Deployment Checklist

Before each deployment:

- [ ] Run `python test_model_load.py` locally
- [ ] Verify Google Drive file is accessible
- [ ] Check environment variables are set in Railway
- [ ] Review recent commits for breaking changes
- [ ] Test locally with `uvicorn app:app --reload`
- [ ] Update CHANGELOG.md with changes
- [ ] Tag release: `git tag v2.x.x`

After deployment:

- [ ] Monitor build logs for errors
- [ ] Test `/health` endpoint
- [ ] Test `/detect_garment_type` endpoint
- [ ] Check Railway metrics dashboard
- [ ] Verify no error spikes in logs
- [ ] Update team on deployment status

---

## Support & Troubleshooting

### Debug Mode

Enable verbose logging:

```bash
railway variables set LOG_LEVEL=DEBUG
railway restart
```

### Common Commands

```bash
# View live logs
railway logs --follow

# Check environment variables
railway variables

# Restart service
railway restart

# Check service status
railway status

# Open Railway dashboard
railway open
```

### Contact

For deployment issues:
- Check Railway Community: https://railway.app/discord
- Review Railway Docs: https://docs.railway.app
- Check GitHub Issues: https://github.com/your-repo/issues

---

**Last Updated:** 2025-10-10
**Version:** 2.0.0
