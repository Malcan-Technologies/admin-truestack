#!/bin/sh
# Prisma migration runner for ECS
# Handles both baseline (first run) and normal migrations

set -e

echo "🔄 Starting Prisma migrations..."
echo ""

# Check if _prisma_migrations table exists and has the baseline
# If not, we need to apply the baseline first
BASELINE_APPLIED=$(npx prisma migrate status 2>&1 | grep -c "0_init" || true)

if [ "$BASELINE_APPLIED" = "0" ]; then
  echo "📦 First run detected - applying baseline..."
  
  # Check if tables already exist (migrated from raw SQL)
  # The 0_init migration should be marked as applied, not run
  npx prisma migrate resolve --applied 0_init || {
    echo "⚠️  Could not resolve baseline, attempting normal deploy..."
  }
fi

echo "🚀 Running migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migrations complete!"
