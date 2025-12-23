#!/bin/bash
# reset-test-env.sh

echo "🗑️ Cleaning database..."
curl -X POST http://localhost:3000/api/admin/cleanup

echo "🎭 Testing Chase character..."
export NEXT_PUBLIC_CHARACTER_KEY=chase
npm run dev &
sleep 5

echo "🔗 Opening test URLs..."
open "http://localhost:3000"
open "http://localhost:3000/dashboard"

echo "✅ Ready for testing!"