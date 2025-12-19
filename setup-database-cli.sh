#!/bin/bash
# Setup database using Supabase CLI
# 
# Usage: ./setup-database-cli.sh
# 
# Prerequisites:
# 1. Install Supabase CLI: npm install -g supabase
# 2. Login: supabase login
# 3. Link your project: supabase link --project-ref your-project-ref

set -e

echo "Bibliotech Database Setup via Supabase CLI"
echo "=========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file with your Supabase credentials"
    exit 1
fi

# Load .env
export $(cat .env | grep -v '^#' | xargs)

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL not found in .env"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')

if [ -z "$PROJECT_REF" ] || [ "$PROJECT_REF" = "$SUPABASE_URL" ]; then
    echo "⚠️  Could not extract project ref from SUPABASE_URL"
    echo "Please link your project manually:"
    echo "  supabase link --project-ref your-project-ref"
    echo ""
    read -p "Do you want to continue with manual linking? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "📦 Project ref: $PROJECT_REF"
    echo ""
    echo "Linking to Supabase project..."
    supabase link --project-ref "$PROJECT_REF" || {
        echo "⚠️  Link failed. You may need to login first:"
        echo "  supabase login"
        exit 1
    }
fi

echo ""
echo "📝 Creating migration from schema..."
echo ""

# Create migrations directory if it doesn't exist
mkdir -p supabase/migrations

# Create migration file
MIGRATION_NAME="$(date +%Y%m%d%H%M%S)_create_bibliotech_tables"
MIGRATION_FILE="supabase/migrations/${MIGRATION_NAME}.sql"

# Copy schema to migration
cp supabase-schema.sql "$MIGRATION_FILE"

echo "✅ Created migration: $MIGRATION_FILE"
echo ""

# Check if we should push
read -p "Push migration to Supabase? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Pushing migration..."
    supabase db push || {
        echo "❌ Push failed"
        echo ""
        echo "You can also run the SQL manually:"
        echo "1. Open Supabase Dashboard"
        echo "2. Go to SQL Editor"
        echo "3. Copy contents of supabase-schema.sql"
        echo "4. Run the SQL"
        exit 1
    }
    echo ""
    echo "✅ Database setup complete!"
else
    echo ""
    echo "Migration file created. To apply it later:"
    echo "  supabase db push"
fi
