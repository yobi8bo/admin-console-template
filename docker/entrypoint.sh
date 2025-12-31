#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  node node_modules/.bin/prisma db push
fi

exec node node_modules/next/dist/bin/next start -p "${PORT:-3000}"
