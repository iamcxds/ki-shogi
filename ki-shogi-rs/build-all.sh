#!/bin/bash
set -e

echo "=== Building Ki Shogi ==="

# Clean
cargo clean 2>/dev/null || true
mkdir -p dist

# Linux x86_64
echo "[1/2] Building Linux x86_64..."
cargo build --release --target x86_64-unknown-linux-gnu
cp target/x86_64-unknown-linux-gnu/release/ki-shogi dist/ki-shogi-linux-x86_64
echo "  -> dist/ki-shogi-linux-x86_64"

# Windows x86_64
echo "[2/2] Building Windows x86_64..."
cargo build --release --target x86_64-pc-windows-gnu
cp target/x86_64-pc-windows-gnu/release/ki-shogi.exe dist/ki-shogi-windows-x86_64.exe
echo "  -> dist/ki-shogi-windows-x86_64.exe"

echo ""
echo "=== Done ==="
ls -lh dist/
