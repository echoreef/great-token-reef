#!/bin/sh
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
dir="${TMPDIR:-/tmp}/gtr-demo"
rm -rf "$dir"
pnpm --dir "$root/packages/server" exec tsx "$root/scripts/demo-data.ts" "$dir"
# All three data locations are overridden so nothing from the real machine is read.
export GTR_DATA_DIR="$dir/data" GTR_CC_PROJECTS_DIR="$dir/claude" GTR_CODEX_SESSIONS_DIR="$dir/codex" GTR_PORT="${GTR_PORT:-3034}"
exec pnpm --dir "$root" start
