# TrueIdentity - Admin Portal

TrueStack TrueIdentity is a B2B e-KYC verification service integrating with the Innovatif eKYC Gateway.

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm
- Docker (for local development)
- PostgreSQL 16+

### Local Development

1. **Start PostgreSQL with Docker:**

```bash
pnpm docker:up
```

2. **Run database migrations:**

```bash
# Connect to the database and run migrations
docker exec -i trueidentity-postgres psql -U postgres -d trueidentity < db/migrations/001_initial_schema.sql
```

3. **Seed admin user:**

```bash
# Using the seed script
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/trueidentity pnpm seed:admin

# Or manually:
docker exec -i trueidentity-postgres psql -U postgres -d trueidentity < db/migrations/002_seed_admin.sql
```

4. **Configure environment:**

```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

5. **Start the development server:**

```bash
pnpm dev
```

6. **Access the portal:**

- Admin Portal: http://localhost:3000
- Default login: `admin@truestack.my` / `changeme123`

### Docker Compose (Full Stack)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## Project Structure

```
admin-truestack/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   │   ├── auth/          # BetterAuth handler
│   │   ├── admin/         # Admin API (clients, credits)
│   │   ├── v1/            # Client API (KYC sessions)
│   │   └── internal/      # Internal endpoints (webhooks)
│   └── r/                 # Redirect handler
├── components/            # React components
│   ├── ui/                # ShadcnUI components
│   ├── layout/            # Layout components
│   ├── clients/           # Client-specific components
│   └── sessions/          # Session-specific components
├── lib/                   # Utilities and services
│   ├── auth.ts            # BetterAuth configuration
│   ├── db.ts              # Database connection
│   ├── api-keys.ts        # API key generation/encryption
│   ├── innovatif.ts       # Innovatif Gateway integration
│   └── s3.ts              # S3 document storage
├── db/                    # Database
│   └── migrations/        # SQL migration files
├── scripts/               # Utility scripts
├── terraform/             # Infrastructure as Code
│   ├── modules/           # Terraform modules
│   └── main.tf            # Main configuration
├── Dockerfile             # Container image
└── docker-compose.yml     # Local development
```

## API Endpoints

### Client API (`api.truestack.my`)

#### Create KYC Session
```bash
POST /api/v1/kyc/sessions
Authorization: Bearer <API_KEY>

{
  "document_name": "John Doe",
  "document_number": "901234567890",
  "document_type": "1",
  "success_url": "https://example.com/success",
  "fail_url": "https://example.com/fail"
}

# Response
{
  "id": "uuid",
  "onboarding_url": "https://...",
  "expires_at": "ISO timestamp",
  "status": "pending"
}
```

#### Get Session Status
```bash
GET /api/v1/kyc/sessions/:id
Authorization: Bearer <API_KEY>
```

#### Get Session Document
```bash
GET /api/v1/kyc/sessions/:id/documents/:type
Authorization: Bearer <API_KEY>
# type: front_document, back_document, face_image, best_frame
```

### Webhook Receiver

Innovatif sends callbacks to:
```
POST /api/internal/webhooks/innovatif/ekyc
```

## Deployment

### Prerequisites

1. AWS Account (ap-southeast-5 region)
2. AWS CLI configured with appropriate credentials
3. Terraform >= 1.5.0
4. Docker
5. Domain with DNS access

### Initial AWS Setup

Run the setup script to create necessary AWS resources:

```bash
# Set your GitHub organization/repo for OIDC
qexport GITHUB_REPO="admin-truestack"
export AWS_ACCOUNT_ID="491694399426"

# Run setup script
./scripts/setup-aws.sh
```

This script will:
1. Create ECR repository
2. Create S3 bucket for Terraform state
3. Create DynamoDB table for Terraform locks
4. Create IAM role for GitHub Actions OIDC
5. Generate secrets (you'll need to save these)

### Terraform Deployment

```bash
cd terraform

# Copy and configure backend
cp backend.tf.example backend.tf
# Edit backend.tf with your S3 bucket name

# Initialize Terraform
terraform init

# Set required variables (or use .tfvars file)
export TF_VAR_db_password="your-secure-password"
export TF_VAR_better_auth_secret="your-32-char-secret"
export TF_VAR_api_key_encryption_secret="your-64-hex-chars"
export TF_VAR_innovatif_api_key="your-innovatif-key"
export TF_VAR_innovatif_md5_key="your-md5-key"
export TF_VAR_innovatif_ciphertext="MTIzNDU2Nzg5MDEy"
export TF_VAR_ecr_repository_url="491694399426.dkr.ecr.ap-southeast-5.amazonaws.com/trueidentity"

# Plan
terraform plan -var-file=environments/prod.tfvars

# Apply
terraform apply -var-file=environments/prod.tfvars
```

### Post-Terraform Steps

1. **Note ALB DNS name** from Terraform outputs

2. **Create DNS records** (in your DNS provider):
   ```
   admin.truestack.my  CNAME  [ALB DNS name]
   api.truestack.my    CNAME  [ALB DNS name]
   ```

3. **Validate ACM certificate**:
   - Add the DNS validation records shown in Terraform outputs
   - Wait for certificate to be validated (can take 5-30 mins)

4. **Run initial database migrations** (see Migrations section below)

## Database Migrations

Migrations are handled automatically during deployment via a dedicated ECS task.

### How It Works

1. **Build Phase**: A separate migrations Docker image is built (`Dockerfile.migrations`)
2. **Migrate Phase**: Before deploying the app, an ECS task runs migrations
3. **Deploy Phase**: Only after migrations succeed, the new app version is deployed

### Migration Files

Migrations are SQL files in `db/migrations/` named with a numeric prefix:
- `001_initial_schema.sql`
- `002_seed_admin.sql`
- `003_add_feature.sql` (example)

The migration runner:
- Tracks applied migrations in a `_migrations` table
- Runs migrations in order
- Validates file hashes to prevent tampering
- Rolls back on failure

### Running Migrations Locally

```bash
# Using the migration runner
DATABASE_URL=postgresql://... pnpm db:migrate

# Or manually with psql
psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
```

### Running Migrations in AWS (Manual)

Use the Terraform output command:

```bash
# Get the command from Terraform outputs
terraform output run_migrations_command

# Or run directly:
aws ecs run-task \
  --cluster trueidentity-prod \
  --task-definition trueidentity-prod-migrations \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --region ap-southeast-5
```

### Creating New Migrations

1. Create a new SQL file with the next number:
   ```bash
   touch db/migrations/003_add_new_feature.sql
   ```

2. Write your migration SQL (use transactions):
   ```sql
   -- 003_add_new_feature.sql
   BEGIN;
   
   ALTER TABLE client ADD COLUMN new_field TEXT;
   
   COMMIT;
   ```

3. Commit and push - migrations run automatically on deploy

### GitHub Actions Setup

1. **Create environment** in GitHub Settings > Environments:
   - Create `production` environment
   - Optionally add protection rules (require approval)

2. **Add environment secret** in the `production` environment:
   - `AWS_ROLE_ARN`: `arn:aws:iam::491694399426:role/github-actions-trueidentity`

3. **Deploy**:
   - Push to `main` branch → automatically deploys to production
   - Or use manual workflow dispatch

### Manual Docker Build and Push

```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-5 | \
  docker login --username AWS --password-stdin 491694399426.dkr.ecr.ap-southeast-5.amazonaws.com

# Build
docker build -t trueidentity .

# Tag and push
docker tag trueidentity:latest 491694399426.dkr.ecr.ap-southeast-5.amazonaws.com/trueidentity:latest
docker push 491694399426.dkr.ecr.ap-southeast-5.amazonaws.com/trueidentity:latest
```

### DNS Configuration

Create CNAME records pointing to the ALB:
- `admin.truestack.my` -> ALB DNS name
- `api.truestack.my` -> ALB DNS name

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `BETTER_AUTH_SECRET` | BetterAuth secret (32+ chars) | Yes |
| `BETTER_AUTH_URL` | Base URL for auth | Yes |
| `API_KEY_ENCRYPTION_SECRET` | 64 hex chars for API key encryption | Yes |
| `INNOVATIF_API_KEY` | Innovatif API key | Yes |
| `INNOVATIF_PACKAGE_NAME` | Innovatif package name | Yes |
| `INNOVATIF_MD5_KEY` | Innovatif MD5 key | Yes |
| `INNOVATIF_CIPHERTEXT` | Innovatif ciphertext (IV) | Yes |
| `INNOVATIF_BASE_URL` | Innovatif API base URL | Yes |
| `AWS_REGION` | AWS region | Yes |
| `S3_KYC_BUCKET` | S3 bucket for KYC documents | Yes |

## Security Notes

1. **Admin Access**: No public signup. Admin users must be created manually.
2. **API Keys**: Keys are hashed (SHA256) for validation and encrypted (AES-256-GCM) for admin reveal.
3. **Sessions**: 30-day sessions with daily refresh, HttpOnly Secure cookies.
4. **S3**: Private bucket, SSE-S3 encryption, no presigned URLs.
5. **Webhooks**: Signature verification and idempotency checks.

## License

Proprietary - TrueStack Sdn Bhd
