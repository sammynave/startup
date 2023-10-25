#!/bin/sh

echo "forcing new pnpm"
npm install -g pnpm@latest

echo "node: $(node --version)"
echo "pnpm: $(pnpm --version)"

pnpm i
pnpm db:migrate
pnpm build
