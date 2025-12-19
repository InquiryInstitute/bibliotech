#!/bin/bash
# Setup marginalia table and create example with screenshot

set -e

echo "Setting up marginalia table and creating example..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please run 'npm run setup' first."
    exit 1
fi

# Source .env to get Supabase URL
source .env
export SUPABASE_URL
export SUPABASE_SERVICE_ROLE_KEY

echo "Step 1: Creating marginalia table..."
echo "Please run the SQL from create-marginalia-table.sql in Supabase SQL Editor"
echo "Press Enter after running the SQL to continue..."
read

echo ""
echo "Step 2: Creating example marginalia..."
node screenshot-marginalia.js

echo ""
echo "Done! Check marginalia-screenshot.png"
