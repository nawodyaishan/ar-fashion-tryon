# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** as the package manager. Make sure you have pnpm installed globally (`npm install -g pnpm`).

- **Development server**: `pnpm dev` (uses Turbopack for faster builds)
- **Build**: `pnpm build`
- **Start production**: `pnpm start`
- **Lint**: `pnpm lint`
- **Lint with fix**: `pnpm lint:fix`
- **Format**: `pnpm format`
- **Install dependencies**: `pnpm install`

## Project Architecture

This is an AR Fashion Try-On web application built with Next.js 15, featuring a futuristic neon aesthetic and glassmorphic design. The project uses the App Router architecture.

### Key Technologies
- **Package Manager**: pnpm (specified in package.json)
- **Framework**: Next.js 15.4.2 with App Router
- **Styling**: Tailwind CSS v4 with custom glassmorphic effects
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand with persistence
- **3D/AR Libraries**: Three.js, React Three Fiber, MediaPipe (Pose detection)
- **Fonts**: Geist Sans and Geist Mono
- **Theme System**: next-themes with dark/light mode support

### Application Structure

#### Pages Structure
- `/` - Home page with card grid layout featuring Try On, Gallery, and About sections
- `/try-on` - AR try-on functionality (currently placeholder)
- `/gallery` - Fashion gallery/catalog (currently placeholder) 
- `/about` - Project information (currently placeholder)
- `/settings` - User settings with lighting effects toggle

#### Component Architecture
- `ClientLayout` - Client-side wrapper handling theme provider and navigation
- `NavBar` - Navigation with theme toggle and settings link
- `ModeToggle` - Dark/light mode switcher
- `theme-provider` - Theme system wrapper
- UI components in `/components/ui/` following shadcn/ui patterns

#### State Management
- `settings-store.ts` - Zustand store for persistent user settings (lighting effects toggle)
- Settings are persisted to localStorage automatically

### Styling Patterns
- Glassmorphic design with `backdrop-blur` effects
- Dynamic background lighting controlled by settings
- Responsive grid layouts using Tailwind CSS
- Custom color blending backgrounds with conditional rendering
- Consistent card-based layouts with transparency effects

### Development Notes
- Client/server boundary properly separated (ClientLayout handles client-side logic)
- All pages use consistent glassmorphic styling patterns
- Settings are globally applied through the settings store
- Mobile-responsive design with adaptive grid layouts
- Uses TypeScript with strict mode enabled

### MediaPipe Integration
The project includes MediaPipe dependencies for pose detection, indicating planned AR functionality:
- `@mediapipe/camera_utils`
- `@mediapipe/pose`

### Import Aliases
- `@/components` - Components directory
- `@/lib` - Library utilities
- `@/components/ui` - UI components
- Base URL configured for absolute imports from project root