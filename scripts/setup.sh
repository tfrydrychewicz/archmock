#!/bin/bash
set -e

echo "🏗️  ArchMock — Local Setup"
echo "========================="

# 1. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 2. Start infra
echo "🐳 Starting Docker services..."
docker compose up -d
echo "⏳ Waiting for PostgreSQL..."
sleep 3

# 3. Setup database
echo "🗄️  Running migrations..."
pnpm db:migrate

# 4. Seed problem bank
echo "📝 Seeding problems..."
pnpm db:seed

# 5. Create local storage dir
mkdir -p storage/exports storage/snapshots

# 6. Check env
if [ ! -f .env.local ]; then
  echo ""
  echo "⚠️  .env.local not found. Copy .env.example and fill in:"
  echo "   cp .env.example .env.local"
  echo ""
  echo "   Required: ANTHROPIC_API_KEY, Clerk keys"
  exit 1
fi

echo ""
echo "✅ Setup complete! Run:"
echo "   pnpm dev          # Start frontend + WS server"
echo "   Open http://localhost:3000"
