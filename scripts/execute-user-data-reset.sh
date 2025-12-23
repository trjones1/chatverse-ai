#!/bin/bash

# Execute User Data Reset Script
# This script connects to the production database and runs the reset

set -e

echo "🚨 WARNING: This will permanently delete ALL user data!"
echo "This includes:"
echo "  - All user accounts and authentication data"
echo "  - All subscriptions and billing information"
echo "  - All messages and conversation history"
echo "  - All memories and relationship progress"
echo "  - All voice credits and usage data"
echo ""
echo "This action is IRREVERSIBLE!"
echo ""

# Check if we're in the right directory
if [[ ! -f "scripts/reset-all-user-data.sql" ]]; then
    echo "❌ Error: reset-all-user-data.sql not found. Please run from project root."
    exit 1
fi

# Confirm with user
read -p "Type 'RESET_ALL_DATA' to confirm: " confirmation
if [[ "$confirmation" != "RESET_ALL_DATA" ]]; then
    echo "❌ Reset cancelled."
    exit 1
fi

echo ""
echo "🔄 Connecting to database and executing reset..."

# Execute the reset script using Supabase CLI
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI to execute reset script..."
    supabase db reset --db-url "$DATABASE_URL" --linked
    echo "✅ Database reset via Supabase CLI"
elif [[ -n "$DATABASE_URL" ]]; then
    echo "Using Supabase CLI with SQL file..."
    # Use supabase db reset with the SQL file
    echo "Note: This will execute the custom reset script"
    cat scripts/reset-all-user-data.sql | supabase db reset --db-url "$DATABASE_URL" --linked --sql
    echo "✅ User data reset completed"
else
    echo "❌ Error: No database connection available."
    echo "Please set DATABASE_URL environment variable"
    exit 1
fi

echo ""
echo "🎉 Reset completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test user signup flow"
echo "2. Test payment processing"  
echo "3. Test webhook handling"
echo "4. Verify entitlements are working"
echo ""
echo "The application is ready for fresh testing."