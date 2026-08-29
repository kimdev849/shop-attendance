#!/bin/bash
# Prebuild script for Vercel deployment
# Copies shared types package so the dashboard can build standalone

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DASHBOARD_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

echo "📦 Copying shared packages for standalone build..."

# Copy types package
mkdir -p "$DASHBOARD_DIR/packages/types"
cp -r "$ROOT_DIR/packages/types/"* "$DASHBOARD_DIR/packages/types/"

echo "✅ Shared packages copied successfully"
