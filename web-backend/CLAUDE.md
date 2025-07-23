# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This backend uses **yarn** as the package manager (as indicated in package.json scripts).

- **Development server**: `yarn start:dev` or `npm run start:dev` (watch mode with auto-reload)
- **Production server**: `yarn start:prod` or `npm start:prod`
- **Build**: `yarn build` or `npm run build`
- **Lint**: `yarn lint` or `npm run lint` (auto-fixes issues)
- **Format**: `yarn format` or `npm run format`
- **Test**: `yarn test` or `npm run test`
- **Test (watch)**: `yarn test:watch` or `npm run test:watch`
- **Test (coverage)**: `yarn test:cov` or `npm run test:cov`
- **E2E tests**: `yarn test:e2e` or `npm run test:e2e`
- **Install dependencies**: `yarn install` or `npm install`

## Project Architecture

This is a NestJS-based REST API backend for the AR Fashion Try-On system. It's part of a larger multi-service architecture that includes a Next.js frontend, FastAPI ML backend, and Three.js AR module.

### Key Technologies

- **Framework**: NestJS 11.x (Node.js framework)
- **Language**: TypeScript with strict configuration
- **Package Manager**: Yarn (preferred) or npm
- **Runtime Port**: 3001 (as configured in start-dev.sh script)
- **Database**: PostgreSQL (via Docker Compose)
- **Cache**: Redis (via Docker Compose)
- **API Documentation**: Swagger/OpenAPI (@nestjs/swagger)
- **Validation**: class-validator and class-transformer
- **Testing**: Jest with supertest for E2E

### Application Structure

#### Core Files
- `src/main.ts` - Application bootstrap (currently runs on port 3000, configurable via PORT env var)
- `src/app.module.ts` - Root application module
- `src/app.controller.ts` - Basic controller with health check endpoint
- `src/app.service.ts` - Basic service returning "Hello World!"

#### Configuration
- `nest-cli.json` - NestJS CLI configuration
- `tsconfig.json` - TypeScript configuration with ES2023 target
- `tsconfig.build.json` - Build-specific TypeScript config
- `eslint.config.mjs` - ESLint configuration with TypeScript support and Prettier integration

### Development Environment

The project is designed to work with Docker Compose for external services:

#### Database Setup
- **PostgreSQL**: Available on port 5432 (configured in docker-compose.yml)
- **Redis**: Available on port 6379 (configured in docker-compose.yml)
- Start with: `docker-compose up -d postgres redis`

#### Multi-Service Development
Use the provided script to start all services:
```bash
./scripts/start-dev.sh
```

This starts:
- ML Backend: http://localhost:8000
- Web Backend (this service): http://localhost:3001 
- Frontend: http://localhost:3000

### Code Style & Quality

- **ESLint**: Configured with TypeScript support and Prettier integration
- **TypeScript**: Strict configuration with experimental decorators enabled
- **Testing**: Jest configuration for unit tests and E2E tests
- **Formatting**: Prettier integration through ESLint

### Development Notes

- The backend is currently a basic NestJS starter template
- Designed to integrate with ML backend for AR processing
- Expected to serve API endpoints for the Next.js frontend
- Uses standard NestJS patterns (modules, controllers, services, decorators)
- Includes Swagger integration for API documentation
- Configured for validation using class-validator