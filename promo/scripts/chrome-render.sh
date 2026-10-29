#!/bin/sh
exec "${PROMO_REAL_BROWSER_EXECUTABLE:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}" "$@" --disable-gpu-rasterization
