#!/bin/sh
# Database Admin Script for ECS
# Usage: Set DB_COMMAND environment variable to control behavior
#
# Commands:
#   list-users    - List all users in the database
#   list-products - List all products
#   wipe-users    - Delete all users and accounts (WARNING: destructive!)
#   wipe-all      - Wipe all data except products (WARNING: destructive!)
#   reset-admin   - Delete existing admin and re-run seed

set -e

cd /app/packages/shared

echo "=========================================="
echo "🔧 Database Admin Tool"
echo "=========================================="
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  exit 1
fi

echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:30}..."
echo "📋 Command: ${DB_COMMAND:-list-users}"
echo ""

# Install psql for direct queries
apk add --no-cache postgresql-client > /dev/null 2>&1

case "${DB_COMMAND}" in
  list-users)
    echo "📋 Listing users..."
    psql "$DATABASE_URL" -c "SELECT id, name, email, role, created_at FROM \"user\" ORDER BY created_at;"
    ;;
    
  list-products)
    echo "📋 Listing products..."
    psql "$DATABASE_URL" -c "SELECT * FROM product;"
    ;;
    
  list-accounts)
    echo "📋 Listing accounts..."
    psql "$DATABASE_URL" -c "SELECT a.id, a.user_id, a.provider_id, u.email FROM account a JOIN \"user\" u ON a.user_id = u.id;"
    ;;
    
  wipe-users)
    echo "⚠️  Wiping all users and accounts..."
    psql "$DATABASE_URL" -c "DELETE FROM session; DELETE FROM account; DELETE FROM \"user\";"
    echo "✅ Users wiped!"
    ;;
    
  wipe-all)
    echo "⚠️  Wiping all data (keeping products)..."
    psql "$DATABASE_URL" -c "
      DELETE FROM webhook_log;
      DELETE FROM kyc_session;
      DELETE FROM credit_ledger;
      DELETE FROM client_api_key;
      DELETE FROM client_product_config;
      DELETE FROM client;
      DELETE FROM session;
      DELETE FROM account;
      DELETE FROM \"user\";
    "
    echo "✅ All data wiped (products kept)!"
    ;;
    
  reset-admin)
    echo "🔄 Resetting admin user..."
    psql "$DATABASE_URL" -c "DELETE FROM account WHERE user_id IN (SELECT id FROM \"user\" WHERE role = 'super_admin'); DELETE FROM \"user\" WHERE role = 'super_admin';"
    echo "✅ Admin deleted, running seed..."
    npx prisma db seed
    ;;
    
  *)
    echo "❌ Unknown command: ${DB_COMMAND}"
    echo "Available commands: list-users, list-products, list-accounts, wipe-users, wipe-all, reset-admin"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "✅ Done!"
echo "=========================================="
