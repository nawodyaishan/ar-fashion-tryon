# Deprecated Backends

This directory contains backend experiments that are preserved for reference but are not part of the active AR Fashion Try-On runtime path.

## Contents

- `web-backend/` - legacy NestJS backend.
- `ml-backend/` - legacy FastAPI/Flask ML backend experiments.

## Active Replacement

The active backend is:

```text
../garment-processing-api/
```

Use that service for garment classification, background removal, outfit construction, Cloudinary persistence, and virtual try-on orchestration.
