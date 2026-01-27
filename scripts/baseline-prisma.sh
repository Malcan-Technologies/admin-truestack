#!/bin/bash
# One-time script to baseline Prisma migrations for existing database
# Run this ONCE after switching to Prisma, before the first deploy
#
# Usage: DATABASE_URL="postgresql://..." ./scripts/baseline-prisma.sh

set -e

echo "🔄 Baselining Prisma migrations..."
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is required"
  exit 1
fi

# Mark the initial migration as already applied
echo "Marking 0_init migration as applied..."
npx prisma migrate resolve --applied 0_init

echo ""
echo "✅ Baseline complete!"
echo "   Future migrations will be applied normally with 'prisma migrate deploy'"
