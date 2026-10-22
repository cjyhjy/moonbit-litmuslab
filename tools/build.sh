#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
./tools/moon build --target js --release
mkdir -p dist
cp _build/js/release/build/core/core.js dist/engine.raw.mjs
cp tools/engine-wrapper.mjs dist/engine.mjs
