#!/bin/bash
# Copies shared types package so the tablet app can resolve @shop-attendance/types
# Uses a tablet-friendly index.ts that doesn't depend on @prisma/client
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TABLET_DIR="$(dirname "$SCRIPT_DIR")"
# From apps/tablet-app go up 2 levels to reach repo root
REPO_ROOT="$(cd "$TABLET_DIR/../.." && pwd)"

echo "📦 Copying shared types for tablet app from $REPO_ROOT/packages/types ..."

mkdir -p "$TABLET_DIR/packages/types/src"
cp "$REPO_ROOT/packages/types/package.json" "$TABLET_DIR/packages/types/"
cp "$REPO_ROOT/packages/types/src/"*.ts "$TABLET_DIR/packages/types/src/"

# Replace index.ts with tablet-friendly version (no @prisma/client imports)
cp "$SCRIPT_DIR/tablet-types-index.ts" "$TABLET_DIR/packages/types/src/index.ts"

echo "✅ Shared types copied successfully"
