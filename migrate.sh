#!/bin/bash
# Run migrations via Supabase CLI
# Usage: ./migrate.sh [database-password]

set -e

echo "🚀 Bibliotech Migration Runner"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# Get database password
if [ -z "$1" ]; then
    echo "⚠️  Database password required"
    echo ""
    echo "Get it from: https://supabase.com/dashboard/project/xougqdomkoisrxdnagcj/settings/database"
    echo ""
    echo "Usage: ./migrate.sh YOUR_DATABASE_PASSWORD"
    echo "   Or: SUPABASE_DB_PASSWORD=your_password ./migrate.sh"
    echo ""
    read -sp "Enter database password: " DB_PASSWORD
    echo ""
else
    DB_PASSWORD="$1"
fi

export SUPABASE_DB_PASSWORD="$DB_PASSWORD"

echo "📦 Pushing migrations to remote database..."
echo ""

# Push migrations
supabase db push --linked --include-all --yes --password "$DB_PASSWORD"

echo ""
echo "✅ Migrations completed!"
echo ""
echo "Next steps:"
echo "  npm run populate-wikibooks"
