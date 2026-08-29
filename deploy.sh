#!/bin/bash
# =============================================================================
# ShopAttendance - Deployment Preparation Script
# =============================================================================
# This script prepares each app for independent deployment.
#
# Usage:
#   ./deploy.sh api       → Prepare API for Render deployment
#   ./deploy.sh dashboard → Prepare Dashboard for Vercel deployment
#   ./deploy.sh all       → Prepare both
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
  echo -e "${GREEN}▸ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# ---------------------------------------------------------------------------
# Deploy API (for Render)
# ---------------------------------------------------------------------------
deploy_api() {
  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "  🚀 Preparing API for Render deployment"
  echo "═══════════════════════════════════════════════════════════"
  echo ""

  API_DIR="$ROOT_DIR/apps/api"

  print_step "Ensuring shared packages are available..."

  # Create a temporary deploy directory structure.
  DEPLOY_DIR="$ROOT_DIR/.deploy/api"
  rm -rf "$DEPLOY_DIR"
  mkdir -p "$DEPLOY_DIR"

  # Copy API source
  print_step "Copying API source files..."
  cp -r "$API_DIR/src" "$DEPLOY_DIR/src"
  cp -r "$API_DIR/prisma" "$DEPLOY_DIR/prisma"
  cp "$API_DIR/tsconfig.json" "$DEPLOY_DIR/"
  cp "$API_DIR/tsconfig.build.json" "$DEPLOY_DIR/"
  cp "$API_DIR/nest-cli.json" "$DEPLOY_DIR/"

  # Copy shared packages that API depends on
  print_step "Copying shared packages..."
  mkdir -p "$DEPLOY_DIR/packages/types/src"
  mkdir -p "$DEPLOY_DIR/packages/config/src"
  cp "$ROOT_DIR/packages/types/src/"*.ts "$DEPLOY_DIR/packages/types/src/"
  cp "$ROOT_DIR/packages/types/package.json" "$DEPLOY_DIR/packages/types/"
  cp "$ROOT_DIR/packages/config/src/index.ts" "$DEPLOY_DIR/packages/config/src/"
  cp "$ROOT_DIR/packages/config/package.json" "$DEPLOY_DIR/packages/config/"

  # Create standalone package.json with local paths for shared packages
  print_step "Generating standalone package.json..."
  cat > "$DEPLOY_DIR/package.json" << 'PKGJSON'
{
  "name": "shop-attendance-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:prod": "node dist/main",
    "prisma:generate": "prisma generate",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:seed": "ts-node prisma/seed.ts",
    "postinstall": "npx prisma generate"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/swagger": "^7.4.0",
    "@nestjs/throttler": "^5.2.0",
    "@prisma/client": "^5.19.0",
    "@shop-attendance/config": "file:./packages/config",
    "@shop-attendance/types": "file:./packages/types",
    "@types/bcryptjs": "^2.4.6",
    "argon2": "^0.40.3",
    "bcryptjs": "^3.0.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "helmet": "^7.1.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/schematics": "^10.1.4",
    "@nestjs/testing": "^10.4.0",
    "@types/express": "^4.17.25",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.8",
    "prisma": "^5.19.0",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.5.4"
  }
}
PKGJSON

  print_step "✅ API prepared for deployment at: .deploy/api/"
  echo ""
  echo "  📋 Next steps for Render:"
  echo "     1. Push this repo to GitHub"
  echo "     2. On Render: New > Web Service"
  echo "     3. Set Root Directory to: .deploy/api"
  echo "     4. Build Command: npm install && npm run prisma:generate && npm run build"
  echo "     5. Start Command: npm run start:prod"
  echo "     6. Add environment variables from .env"
  echo ""
}

# ---------------------------------------------------------------------------
# Deploy Dashboard (for Vercel)
# ---------------------------------------------------------------------------
deploy_dashboard() {
  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "  🎨 Preparing Dashboard for Vercel deployment"
  echo "═══════════════════════════════════════════════════════════"
  echo ""

  DASHBOARD_DIR="$ROOT_DIR/apps/admin-dashboard"

  print_step "Copying shared types package..."

  # Copy types package into dashboard for standalone build
  mkdir -p "$DASHBOARD_DIR/packages/types/src"
  cp "$ROOT_DIR/packages/types/src/"*.ts "$DASHBOARD_DIR/packages/types/src/"
  cp "$ROOT_DIR/packages/types/package.json" "$DASHBOARD_DIR/packages/types/"

  # Create a workspace-level package.json for Vercel
  if [ ! -f "$DASHBOARD_DIR/packages/package.json" ]; then
    cat > "$DASHBOARD_DIR/packages/package.json" << 'PKGJSON'
{
  "name": "@shop-attendance/shared",
  "private": true,
  "workspaces": [
    "types"
  ]
}
PKGJSON
  fi

  print_step "✅ Dashboard prepared for deployment"
  echo ""
  echo "  📋 Next steps for Vercel:"
  echo "     1. Push this repo to GitHub"
  echo "     2. On Vercel: New Project > Import Git Repository"
  echo "     3. Set Root Directory to: apps/admin-dashboard"
  echo "     4. Framework: Next.js (auto-detected)"
  echo "     5. Add environment variable: NEXT_PUBLIC_API_URL=https://your-api.onrender.com"
  echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "${1:-}" in
  api)
    deploy_api
    ;;
  dashboard)
    deploy_dashboard
    ;;
  all)
    deploy_api
    deploy_dashboard
    ;;
  *)
    echo "Usage: ./deploy.sh [api|dashboard|all]"
    echo ""
    echo "  api       → Prepare API for Render"
    echo "  dashboard → Prepare Dashboard for Vercel"
    echo "  all       → Prepare both"
    exit 1
    ;;
esac

echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Deployment preparation complete!"
echo "═══════════════════════════════════════════════════════════"
