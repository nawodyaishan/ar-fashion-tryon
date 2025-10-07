# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** as the package manager (version 10.13.1 specified in packageManager field).

- **Development server**: `pnpm dev` (uses Turbopack, runs on http://localhost:3000)
- **Build**: `pnpm build`
- **Start production**: `pnpm start`
- **Lint**: `pnpm lint` (ESLint with TypeScript support)
- **Lint with fix**: `pnpm lint:fix` (auto-fixes issues)
- **Format**: `pnpm format` (Prettier formatting)
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

- **Client/Server Boundary**: ClientLayout handles all client-side logic (theme provider, navigation) while main layout is server-side
- **Styling Consistency**: All pages use glassmorphic patterns with backdrop-blur effects
- **State Management**: Zustand store with localStorage persistence for settings (e.g., lighting toggle)
- **Type Safety**: TypeScript strict mode enabled with custom types in `lib/types.ts`
- **Code Quality**: ESLint configured with Next.js, TypeScript, and Prettier plugins
- **Import Aliases**: `@/*` maps to project root for clean imports

### MediaPipe Integration

The project includes MediaPipe dependencies for pose detection, indicating planned AR functionality:

- `@mediapipe/camera_utils`
- `@mediapipe/pose`

### Project Constants

The application uses centralized configuration in `lib/constants.ts`:
- **features**: Homepage feature cards with icons, routes, and gradients
- **highlights**: Key selling points displayed on homepage
- **navigationItems**: Navigation menu structure
- **performanceOptions** & **languageOptions**: Settings configurations

### Custom Hooks

- `useMount` (lib/hooks/useMount.ts): Client-side mount detection for hydration safety
- `useSettings` (lib/hooks/useSettings.ts): Wrapper for settings store access
