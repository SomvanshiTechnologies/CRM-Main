#!/bin/bash
# Run this every time you deploy code changes to EC2.
# Always brings the full stack down before rebuilding to prevent network mismatches.
set -e

cd "$(dirname "$0")"

echo "=== Stopping all containers and removing network ==="
docker compose down

echo "=== Building and starting all services ==="
docker compose up -d --build

echo "=== Waiting for health checks ==="
sleep 5

docker compose ps
echo "=== Deploy complete ==="
