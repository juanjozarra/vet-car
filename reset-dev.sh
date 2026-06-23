#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "┌─────────────────────────────────────────┐"
echo "│     vet-car · Development Data Reset    │"
echo "└─────────────────────────────────────────┘"

# ── Check DB container is running ─────────────────────────────────────────────
echo ""
echo "› Checking database container..."
if ! docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T db pg_isready -U vetcar -d vetcar -q 2>/dev/null; then
  echo ""
  echo "  Error: DB container is not running or not ready."
  echo "  Start it with:  docker compose up -d"
  echo ""
  exit 1
fi
echo "  ✓ Database is up"

# ── Truncate all tables (leaf → root, CASCADE handles FK constraints) ─────────
echo ""
echo "› Clearing all data..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T db \
  psql -U vetcar -d vetcar -c '
    TRUNCATE
      "ServiceItem",
      "WorkOrder",
      "Vehicle",
      "Account",
      "Session",
      "VerificationToken",
      "User",
      "Workshop"
    RESTART IDENTITY CASCADE;
  '
echo "  ✓ All tables cleared"

# ── Clear Next.js build cache ─────────────────────────────────────────────────
echo ""
echo "› Removing Next.js cache..."
rm -rf "$SCRIPT_DIR/.next"
echo "  ✓ .next removed"

echo ""
echo "Done. Start the app with:  npm run dev"
echo ""
