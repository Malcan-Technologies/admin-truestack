#!/bin/sh
# Prisma database operations runner for ECS
# Handles migrations and seeding based on environment variables

set -e

# Change to shared package directory
cd /app/packages/shared

echo "=========================================="
echo "🔄 Database Operations Runner"
echo "=========================================="
echo ""

# Debug: Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "Available environment variables:"
  env | grep -v "PASSWORD\|SECRET\|KEY" | sort
  exit 1
fi

# Print masked URL for debugging
echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:30}..."
echo ""

# Run migrations unless SKIP_MIGRATIONS is set
if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "⏭️ Skipping migrations (SKIP_MIGRATIONS=true)"
else
  # Check if _prisma_migrations table exists and has the baseline
  echo "📋 Checking migration status..."
  MIGRATE_STATUS=$(npx prisma migrate status 2>&1 || true)
  echo "$MIGRATE_STATUS"

  BASELINE_APPLIED=$(echo "$MIGRATE_STATUS" | grep -c "0_init" || true)

  if [ "$BASELINE_APPLIED" = "0" ]; then
    echo ""
    echo "📦 First run detected - applying baseline..."
    
    # Check if tables already exist (migrated from raw SQL)
    # The 0_init migration should be marked as applied, not run
    npx prisma migrate resolve --applied 0_init || {
      echo "⚠️  Could not resolve baseline, attempting normal deploy..."
    }
  fi

  echo ""
  echo "🚀 Running migrations..."
  npx prisma migrate deploy

  echo ""
  echo "✅ Migrations complete!"
fi

# Run seed if SEED_DATABASE is set to "true"
if [ "$SEED_DATABASE" = "true" ]; then
  echo ""
  echo "=========================================="
  echo "🌱 Running database seed..."
  echo "=========================================="
  npx prisma db seed
  echo ""
  echo "✅ Seed complete!"
fi

echo ""
echo "=========================================="
echo "✅ Database operations finished!"
echo "=========================================="
