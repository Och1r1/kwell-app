#!/bin/bash

# Setup script for Kwell Backend
# Run this after cloning the repository

echo "Setting up Kwell Backend..."

# Get the absolute path to this directory
BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_PATH="$BACKEND_DIR/prisma/dev.db"

echo "Backend directory: $BACKEND_DIR"

# Create .env file from template
echo "Creating .env file..."
cat > "$BACKEND_DIR/.env" << EOF
# Database - SQLite (absolute path for Next.js compatibility)
DATABASE_URL="file:$DB_PATH"

# JWT Configuration
JWT_SECRET="kwell-super-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="24h"

# Server Configuration
NODE_ENV="development"
EOF

echo ".env file created!"

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

echo ""
echo "Setup complete!"
echo ""
echo "To start the servers:"
echo "  1. API Server (HTTPS):    npm run dev:https"
echo "  2. Socket.IO Server:      npm run socket"
echo ""
echo "Then open https://localhost:3000 to accept the certificate"
echo "And https://localhost:3001 to accept the Socket.IO certificate"
