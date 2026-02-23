# TrueStack Monorepo - Development Guide

This guide covers how to set up and run the TrueStack monorepo locally for development.

## Architecture Overview

```
truestack-monorepo/
├── apps/
│   ├── admin/       # Admin dashboard (port 3002)
│   ├── backend/     # API backend (port 3001)
│   ├── core/        # Marketing landing page (port 3003)
│   └── frontend/    # Production multi-app server (Docker only)
├── packages/
│   └── shared/      # Shared code: Prisma, utilities, types
├── terraform/       # Infrastructure as Code
└── scripts/         # Utility scripts
```

### Applications

| App | Port | URL | Description |
|-----|------|-----|-------------|
| **Backend** | 3001 | http://localhost:3001 | API server, authentication, webhooks |
| **Admin** | 3002 | http://localhost:3002 | Admin dashboard for managing KYC sessions |
| **Core** | 3003 | http://localhost:3003 | Marketing/landing page |

## Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Docker** & Docker Compose (for PostgreSQL)
- **Git**

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url> truestack
cd truestack

# Install all dependencies
pnpm install
```

### 2. Start PostgreSQL

```bash
# Start only the database container (not the app container)
docker compose up -d postgres

# Verify it's running
docker ps
# Should show: trueidentity-postgres
```

> **Note:** The `docker-compose.yml` also defines an `app` service that requires a Dockerfile.
> For local development, we run Next.js directly with `pnpm dev` instead of in a container.

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trueidentity"

# Authentication
BETTER_AUTH_SECRET="development-secret-change-in-prod"
BETTER_AUTH_URL="http://localhost:3001"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3001"

# API Key Encryption (64 hex characters for 32-byte key)
API_KEY_ENCRYPTION_SECRET="0000000000000000000000000000000000000000000000000000000000000000"

# Innovatif e-KYC (use staging credentials for dev)
INNOVATIF_API_KEY="xmFdJeGRQLh7ApdeYTwZDcTL7MXpU12Y"
INNOVATIF_PACKAGE_NAME="truestack.gateway.test"
INNOVATIF_MD5_KEY="m4X12dM8GeYGYl1gLXO8PaZTERGG9bVt"
INNOVATIF_CIPHERTEXT="MTIzNDU2Nzg5MDEy"
INNOVATIF_BASE_URL="https://staging.ekyc.xendity.com/v1/gateway"

# AWS (optional for local dev, use LocalStack or real credentials)
AWS_REGION="ap-southeast-5"
S3_KYC_BUCKET="trueidentity-kyc-documents-dev"

# Admin app API URL (points to backend)
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 4. Initialize the Database

The database commands need `DATABASE_URL` to be available. Since Prisma runs from the `packages/shared` directory, you need to either:

**Option A: Export the variable first (recommended)**
```bash
# Export DATABASE_URL for this terminal session
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trueidentity"

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# (Optional) Seed the database with test data
pnpm db:seed
```

**Option B: Inline with each command**
```bash
# Generate Prisma client
pnpm db:generate

# Run migrations with inline DATABASE_URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trueidentity" pnpm db:migrate:dev

# Seed the database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/trueidentity" pnpm db:seed
```

> **Note:** The `.env` file in the root is used by Next.js apps during `pnpm dev`, but Prisma CLI
> commands run from `packages/shared` need the `DATABASE_URL` exported or passed inline.

### 5. Start Development Servers

```bash
# Start all apps in parallel
pnpm dev

# Or start individual apps:
pnpm dev:backend   # Backend only (port 3001)
pnpm dev:admin     # Admin only (port 3002)
pnpm dev:core      # Core only (port 3003)
```

## Development URLs

Once all services are running:

| Service | URL | Notes |
|---------|-----|-------|
| Backend API | http://localhost:3001 | API endpoints under `/api/*` |
| Backend Health | http://localhost:3001/api/health | Health check endpoint |
| Admin Dashboard | http://localhost:3002 | Login and manage KYC |
| Admin Login | http://localhost:3002/login | Sign in page |
| Core Landing | http://localhost:3003 | Marketing page |
| Prisma Studio | Run `pnpm db:studio` | Database GUI on port 5555 |

## Common Commands

### Package Management

```bash
# Install all dependencies
pnpm install

# Add a dependency to a specific app
pnpm --filter @truestack/admin add <package>
pnpm --filter @truestack/backend add <package>
pnpm --filter @truestack/shared add <package>

# Add a dev dependency
pnpm --filter @truestack/admin add -D <package>
```

### Database Operations

```bash
# Generate Prisma client after schema changes
pnpm db:generate

# Create a new migration (development)
pnpm db:migrate:dev

# Apply pending migrations (production-style)
pnpm db:migrate

# Push schema changes without migration (quick prototyping)
pnpm db:push

# Open Prisma Studio (database GUI)
pnpm db:studio

# Seed the database
pnpm db:seed
```

### Docker Commands

```bash
# Start PostgreSQL
pnpm docker:up

# Stop PostgreSQL
pnpm docker:down

# View logs
pnpm docker:logs

# Start with LocalStack for S3 testing
docker compose --profile local-aws up -d
```

### Build & Lint

```bash
# Build all apps
pnpm build

# Build specific app
pnpm build:backend
pnpm build:admin
pnpm build:core

# Run linting
pnpm lint
```

## Project Structure Details

### Shared Package (`packages/shared`)

Contains code shared across all applications:

```
packages/shared/
├── lib/
│   ├── index.ts        # Re-exports all modules
│   ├── prisma.ts       # Prisma client singleton
│   ├── db.ts           # PostgreSQL pool & helpers
│   ├── api-keys.ts     # API key utilities
│   ├── innovatif.ts    # Innovatif e-KYC integration
│   └── s3.ts           # S3 document utilities
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed script
└── types/
    └── index.ts        # Shared TypeScript types
```

**Importing shared code in apps:**

```typescript
// Import Prisma client
import { prisma } from "@truestack/shared/prisma";

// Import utilities
import { hashApiKey, generateApiKey } from "@truestack/shared/api-keys";

// Import types
import type { User, Organization } from "@truestack/shared/types";
```

### Backend App (`apps/backend`)

API server with all backend routes:

```
apps/backend/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts   # Authentication (Better Auth)
│   │   ├── health/route.ts          # Health check
│   │   ├── admin/                   # Admin API routes
│   │   ├── internal/webhooks/       # Webhook handlers
│   │   └── v1/                      # Public API v1
│   └── page.tsx                     # Root page (redirects)
├── lib/
│   └── auth.ts                      # Auth configuration
└── Dockerfile
```

### Admin App (`apps/admin`)

Dashboard for managing organizations, users, and KYC sessions:

```
apps/admin/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   ├── page.tsx          # Dashboard home
│   │   ├── clients/          # Client management
│   │   ├── users/            # User management
│   │   └── kyc/              # KYC session management
│   ├── login/page.tsx        # Login page
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # Shadcn/UI components
│   ├── layout/               # Layout components
│   └── dashboard/            # Dashboard-specific components
└── lib/
    ├── auth-client.ts        # Auth client config
    └── utils.ts              # Utilities + API client
```

### Core App (`apps/core`)

Marketing landing page:

```
apps/core/
├── app/
│   ├── page.tsx           # Landing page
│   ├── health/page.tsx    # Health check
│   ├── layout.tsx
│   └── globals.css
└── lib/
    └── utils.ts
```

## Testing API Endpoints

### Health Check

```bash
curl http://localhost:3001/api/health
# Response: {"status":"healthy","timestamp":"..."}
```

### Authentication

The backend uses [Better Auth](https://better-auth.com/). Test authentication flows:

```bash
# Sign up (if enabled)
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Sign in
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### API Key Protected Routes

```bash
# Replace with a valid API key from the database
curl http://localhost:3001/api/v1/kyc/sessions \
  -H "x-api-key: ti_live_xxxx"
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001
lsof -i :3002
lsof -i :3003

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# Check container logs
docker logs trueidentity-postgres

# Restart the container
pnpm docker:down && pnpm docker:up
```

### Prisma Issues

```bash
# Regenerate client after schema changes
pnpm db:generate

# Reset database (WARNING: deletes all data)
cd packages/shared
npx prisma migrate reset
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# Regenerate Prisma client
pnpm db:generate
```

### TypeScript Errors in Shared Package

```bash
# Ensure shared package is built
cd packages/shared
pnpm db:generate
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Secret for signing auth tokens |
| `BETTER_AUTH_URL` | Yes | Backend URL for auth callbacks |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Public URL for client-side auth |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL for admin app |
| `API_KEY_ENCRYPTION_SECRET` | Yes | 64 hex chars for API key encryption |
| `INNOVATIF_API_KEY` | Yes | Innovatif API key |
| `INNOVATIF_PACKAGE_NAME` | Yes | Innovatif package name |
| `INNOVATIF_MD5_KEY` | Yes | Innovatif MD5 key |
| `INNOVATIF_CIPHERTEXT` | Yes | Innovatif cipher text |
| `INNOVATIF_BASE_URL` | Yes | Innovatif API base URL |
| `AWS_REGION` | No | AWS region for S3 |
| `S3_KYC_BUCKET` | No | S3 bucket for KYC documents |

## IDE Setup

### VS Code / Cursor

Recommended extensions:
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- TypeScript + JavaScript

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

## Next Steps

1. **Set up your IDE** with the recommended extensions
2. **Run the apps** using `pnpm dev`
3. **Explore Prisma Studio** with `pnpm db:studio`
4. **Check the API routes** in `apps/backend/app/api/`
5. **Review the admin dashboard** at http://localhost:3002

For deployment information, see the Terraform configuration in `/terraform`.
