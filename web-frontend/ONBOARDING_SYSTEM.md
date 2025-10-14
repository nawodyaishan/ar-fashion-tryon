# AR Try-On Onboarding System

## Overview

A comprehensive onboarding system that guides first-time users through the AR Fashion Try-On experience with step-by-step instructions and camera permission flow.

## Features

### 1. Welcome Guide Modal
- **5-step interactive guide** with visual progress indicators
- Step-by-step walkthrough of AR features:
  1. **Welcome**: Introduction to AR Try-On features
  2. **Camera Setup**: Camera positioning and lighting tips
  3. **Select Garments**: How to browse and select garments
  4. **Gesture Controls**: Hand gestures, mouse, and keyboard controls
  5. **Auto-Resume Tracking**: Understanding the auto-tracking system

### 2. Camera Permission Dialog
- **Smart permission detection** using Permissions API
- **Multiple states handled**:
  - Pending: Initial state with explanation
  - Requesting: Loading state during permission request
  - Granted: Success confirmation
  - Denied: Browser-specific troubleshooting steps
  - Error: Detailed error handling with solutions

### 3. First-Time User Detection
- **LocalStorage-based tracking**:
  - `ar-tryon-onboarding-completed`: Tracks welcome guide completion
  - `ar-tryon-camera-permission-requested`: Tracks camera permission flow
- **Automatic flow**:
  - First visit → Welcome Guide
  - After guide → Camera Permission Dialog
  - Auto-enable MediaPipe on permission grant

## File Structure

```
components/tryon/
├── WelcomeGuide.tsx           # Multi-step welcome guide modal
├── CameraPermissionDialog.tsx # Camera permission request flow
└── ARStage.tsx                # Integration point

lib/hooks/
└── useOnboarding.ts           # First-time user detection hook
```

## Component Details

### WelcomeGuide Component

**Props:**
```typescript
interface WelcomeGuideProps {
  open: boolean;
  onClose: () => void;
  onRequestCamera: () => void;
}
```

**Features:**
- Progress indicators (5 dots)
- Step navigation (Previous/Next buttons)
- Skip option
- Visual icons for each step
- Tips and best practices
- "Get Started" CTA on final step

**Guide Steps:**
1. **Welcome** - Overview with 4 key benefits
2. **Camera Setup** - Positioning and lighting instructions
3. **Select & Try On** - Garment selection guide
4. **Gesture Controls** - Hand/mouse/keyboard reference
5. **Auto-Resume** - Tracking behavior explanation

### CameraPermissionDialog Component

**Props:**
```typescript
interface CameraPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
}
```

**States:**
- `pending`: Shows permission request button and privacy note
- `requesting`: Loading indicator while waiting for user response
- `granted`: Success message with auto-close (1.5s)
- `denied`: Browser-specific troubleshooting steps
- `error`: Error message with troubleshooting tips

**Browser Detection:**
- Chrome: Address bar camera icon instructions
- Firefox: Permissions icon instructions
- Safari: Preferences → Websites instructions
- Generic fallback for other browsers

**Error Handling:**
- `NotAllowedError`: Permission denied
- `NotFoundError`: No camera detected
- `NotReadableError`: Camera in use
- Generic error fallback

### useOnboarding Hook

**Returns:**
```typescript
interface OnboardingState {
  isFirstVisit: boolean;
  showWelcomeGuide: boolean;
  showCameraPermission: boolean;
  markOnboardingComplete: () => void;
  markCameraPermissionRequested: () => void;
  resetOnboarding: () => void;
}
```

**Usage:**
```typescript
const {
  showWelcomeGuide,
  showCameraPermission,
  markOnboardingComplete,
  markCameraPermissionRequested
} = useOnboarding();
```

## User Flow

```
┌─────────────────────────────────────────────────────┐
│ First Visit to /try-on                              │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ WelcomeGuide Modal Opens                            │
│ - 5 steps with tips and instructions               │
│ - User can skip or navigate through                │
└─────────────────────────────────────────────────────┘
                      │
                      ▼ (Click "Get Started")
┌─────────────────────────────────────────────────────┐
│ CameraPermissionDialog Opens                        │
│ - Explains why camera is needed                     │
│ - Privacy & security note                           │
└─────────────────────────────────────────────────────┘
                      │
                      ▼ (Click "Grant Camera Access")
┌─────────────────────────────────────────────────────┐
│ Browser Permission Prompt                           │
│ - Native browser dialog                             │
└─────────────────────────────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
        Granted              Denied
            │                   │
            ▼                   ▼
┌───────────────────┐  ┌──────────────────────┐
│ Success State     │  │ Denied State         │
│ - Auto-close      │  │ - Show instructions  │
│ - Enable MediaPipe│  │ - Try Again button   │
└───────────────────┘  └──────────────────────┘
```

## Testing

### Test First-Time User Experience

1. **Clear localStorage:**
```javascript
localStorage.removeItem('ar-tryon-onboarding-completed');
localStorage.removeItem('ar-tryon-camera-permission-requested');
```

2. **Navigate to `/try-on`**
3. **Verify:**
   - Welcome Guide appears automatically
   - Progress indicators work
   - Navigation buttons (Previous/Next) work
   - Skip button closes the guide
   - "Get Started" triggers camera permission dialog

### Test Camera Permission Flow

1. **Pending State:**
   - Privacy note visible
   - "Grant Camera Access" button present
   - Help link visible

2. **Click "Grant Camera Access":**
   - State changes to "requesting"
   - Loading animation appears
   - Browser permission prompt shows

3. **Grant Permission:**
   - Success message appears
   - Auto-closes after 1.5 seconds
   - MediaPipe automatically enabled

4. **Deny Permission:**
   - Denied state shows
   - Browser-specific instructions appear
   - "Try Again" button available

### Test Returning User

1. **Complete onboarding once**
2. **Refresh page or revisit `/try-on`**
3. **Verify:**
   - Welcome Guide does NOT appear
   - Camera Permission Dialog does NOT appear
   - Normal AR experience starts

### Reset Onboarding

**Via Console:**
```javascript
localStorage.removeItem('ar-tryon-onboarding-completed');
localStorage.removeItem('ar-tryon-camera-permission-requested');
location.reload();
```

**Via Hook:**
```typescript
const { resetOnboarding } = useOnboarding();
resetOnboarding(); // Triggers welcome guide again
```

## Customization

### Modify Welcome Guide Steps

Edit `components/tryon/WelcomeGuide.tsx`:
```typescript
const guideSteps: GuideStep[] = [
  {
    title: 'Your Custom Title',
    description: 'Your custom description',
    icon: <YourIcon className="h-12 w-12" />,
    tips: [
      'Tip 1',
      'Tip 2',
      'Tip 3'
    ]
  },
  // Add more steps...
];
```

### Change Auto-Close Duration

In `CameraPermissionDialog.tsx`:
```typescript
// Change from 1500ms to your desired duration
setTimeout(() => {
  onPermissionGranted();
  onClose();
}, 1500); // <-- Change this value
```

### Customize LocalStorage Keys

In `lib/hooks/useOnboarding.ts`:
```typescript
const ONBOARDING_KEY = 'your-custom-key';
const CAMERA_PERMISSION_KEY = 'your-custom-permission-key';
```

## Browser Compatibility

### Supported Browsers

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Required APIs

- **Permissions API**: For checking camera permission state
- **getUserMedia API**: For requesting camera access
- **localStorage**: For tracking onboarding completion

### Fallbacks

- If Permissions API unavailable, defaults to `pending` state
- Generic browser instructions if browser not detected

## Privacy & Security

### Local Processing Only

**Privacy Note Shown to Users:**
> "All processing happens locally in your browser. No video or images are uploaded to our servers."

### Data Storage

- **LocalStorage only**: Two boolean flags
- **No sensitive data**: No camera feed or images stored
- **No server communication**: Permission flow is client-side only

## Accessibility

- **Keyboard Navigation**: Full dialog navigation support
- **Screen Reader Support**: Descriptive labels and ARIA attributes
- **Focus Management**: Proper focus trapping in dialogs
- **High Contrast**: Works with system color schemes
- **Responsive Design**: Mobile and desktop optimized

## Performance

### Bundle Size Impact

- WelcomeGuide: ~3 kB gzipped
- CameraPermissionDialog: ~2 kB gzipped
- useOnboarding hook: ~0.5 kB gzipped
- **Total**: ~5.5 kB additional bundle size

### Lazy Loading

Both dialogs are conditionally rendered, so they don't impact initial page load if not shown.

## Future Enhancements

### Planned Features

- [ ] Video tutorials embedded in guide
- [ ] Interactive hand gesture practice mode
- [ ] Accessibility improvements (keyboard shortcuts guide)
- [ ] Multi-language support
- [ ] Analytics tracking for onboarding completion rate
- [ ] A/B testing different onboarding flows

### Potential Improvements

- Add animation transitions between steps
- Include GIF demos for gesture controls
- Add "Don't show again" checkbox
- Implement onboarding analytics
- Create admin panel to edit guide content

## Troubleshooting

### Welcome Guide Not Showing

**Check:**
1. LocalStorage key: `ar-tryon-onboarding-completed`
2. Clear localStorage and refresh
3. Check browser console for errors

### Camera Permission Dialog Not Working

**Check:**
1. HTTPS required (or localhost for development)
2. getUserMedia API support
3. Browser camera permissions in settings
4. Camera not in use by another app

### MediaPipe Not Auto-Enabling

**Check:**
1. `handleCameraPermissionGranted` function
2. Store toggleMediaPipe action
3. Browser console for errors

## Code Examples

### Manual Trigger Welcome Guide

```typescript
import { useOnboarding } from '@/lib/hooks/useOnboarding';

function YourComponent() {
  const { resetOnboarding } = useOnboarding();

  return (
    <button onClick={resetOnboarding}>
      Show Welcome Guide
    </button>
  );
}
```

### Check Onboarding Status

```typescript
const { isFirstVisit } = useOnboarding();

if (isFirstVisit) {
  console.log('First-time user!');
} else {
  console.log('Returning user!');
}
```

## Support

For issues or questions:
- Check browser console for errors
- Verify camera permissions in browser settings
- Test with different browsers
- Clear localStorage and retry

---

**Documentation Version**: 1.0
**Last Updated**: 2025
**Component Version**: AR Try-On v3.0
