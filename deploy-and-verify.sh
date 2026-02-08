#!/bin/bash
set -e

echo "Deploying to Vercel..."
vercel --prod --yes --token MCpFtBKy5T3d3ETwzQuZYCYy

echo "Waiting for deployment..."
sleep 90

echo "Verifying deployment..."
openclaw browser --browser-profile openclaw navigate https://nikahplus.com
openclaw browser --browser-profile openclaw snapshot

echo "Loop closed ✅"
