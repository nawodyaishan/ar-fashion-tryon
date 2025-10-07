# Garment Images

This directory should contain sample garment PNG images with transparency for the AR Try-On feature.

## Required Files

The application expects the following garment images:

1. **white-tshirt.png** - A white t-shirt on transparent background (512x512px)
2. **black-hoodie.png** - A black hoodie on transparent background (512x512px)
3. **denim-jacket.png** - A denim jacket on transparent background (512x512px)

## Image Requirements

- **Format**: PNG with transparency
- **Size**: Recommended 512x512px or larger
- **Background**: Transparent (alpha channel)
- **Orientation**: Front-facing garment view
- **Quality**: High resolution for best AR results

## How to Add Garment Images

1. Place PNG files in this directory
2. Update `lib/tryon-store.ts` if you change filenames or add new garments
3. Ensure images have proper transparency around the garment

## Placeholder

If you don't have garment images yet, the app will show image load errors but will still function. You can:

- Add your own garment images following the requirements above
- Use the "Add PNG" feature in the AR Panel to upload custom garments at runtime

## Example Sources

You can find garment images from:
- Fashion e-commerce sites (with proper licensing)
- 3D rendering tools
- Photo editing software with background removal
- Stock photo sites offering transparent PNGs
