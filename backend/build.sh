#!/bin/bash
set -e

echo "📦 Installing Python dependencies..."
python3 -m pip install --break-system-packages yt-dlp

echo "📦 Installing Node dependencies..."
npm install --legacy-peer-deps

echo "✅ Verifying installations..."
yt-dlp --version
node --version
npm --version

echo "✅ Build complete!"