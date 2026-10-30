#!/usr/bin/env bash
###############################################################################
# Deploy DashVolcano on the production server.
#
#   1. Update the code (git pull --ff-only on main)
#   2. Check the backend imports with the production Python
#   3. Build the frontend in frontend/dist.new, then swap it with frontend/dist
#      (the previous build is kept in frontend/dist.prev)
#   4. Restart the API with PM2 and check /health and a database query
#   5. Save the PM2 process list (restored at boot)
#
# If the API check fails, the previous frontend build is restored and the
# command to go back to the previous commit is printed.
#
# Usage: ./deploy.sh            deploy the latest main
#        ./deploy.sh --no-pull  deploy the code already checked out
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="${PYTHON:-/usr/bin/python3}"
BRANCH="${BRANCH:-main}"
API_URL="${API_URL:-http://127.0.0.1:8000}"
ECOSYSTEM="ecosystem.production.config.js"

PULL=1
case "${1:-}" in
  "") ;;
  --no-pull) PULL=0 ;;
  *) echo "Usage: $0 [--no-pull]" >&2; exit 2 ;;
esac

step() { printf '\n==> %s\n' "$*"; }
fail() { printf '\n!! %s\n' "$*" >&2; exit 1; }

cd "$ROOT"

# 1. Code ----------------------------------------------------------------------
step "Code"
current_branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$current_branch" == "$BRANCH" ]] || fail "On branch $current_branch, expected $BRANCH."
git diff --quiet && git diff --cached --quiet || fail "Tracked files have local changes: commit or stash them first."

PREV="$(git rev-parse HEAD)"
if (( PULL )); then
  git pull --ff-only
fi
NEW="$(git rev-parse HEAD)"
echo "Previous: $(git log -1 --format='%h %s' "$PREV")"
echo "Deployed: $(git log -1 --format='%h %s' "$NEW")"

# 2. Backend ---------------------------------------------------------------------
step "Backend"
if [[ "$PREV" != "$NEW" ]] && ! git diff --quiet "$PREV" "$NEW" -- backend/pyproject.toml; then
  echo "Backend dependencies changed since the previous deployment:"
  git diff "$PREV" "$NEW" -- backend/pyproject.toml | grep -E '^[+-] ' || true
fi
# Importing the app loads the settings (.env) and every router, without connecting to MongoDB
if ! PYTHONPATH="$ROOT" "$PYTHON" -c "import backend.main" ; then
  fail "The backend does not import with $PYTHON (missing dependency?). Install it, then run: $0 --no-pull
   To go back instead: git reset --keep $PREV"
fi
echo "Backend imports with $("$PYTHON" -V 2>&1)."

# 3. Frontend --------------------------------------------------------------------
step "Frontend build"
cd "$ROOT/frontend"
if [[ ! -d node_modules ]] || { [[ "$PREV" != "$NEW" ]] && ! git diff --quiet "$PREV" "$NEW" -- package-lock.json; }; then
  npm ci
fi
rm -rf dist.new
NODE_OPTIONS="--max-old-space-size=4096" VITE_API_BASE_URL=/api npx vite build --outDir dist.new --emptyOutDir
[[ -f dist.new/index.html ]] || fail "The build did not produce dist.new/index.html; the site is unchanged."

step "Frontend switch"
rm -rf dist.prev
if [[ -d dist ]]; then mv dist dist.prev; fi
mv dist.new dist
echo "frontend/dist is the new build (previous one in frontend/dist.prev)."
cd "$ROOT"

# 4. API -------------------------------------------------------------------------
step "API restart"
mkdir -p logs
# Restarting from the ecosystem file also applies changes to the PM2 configuration
pm2 startOrRestart "$ECOSYSTEM" --update-env

rollback() {
  printf '\n!! %s\n' "$*" >&2
  if [[ -d frontend/dist.prev ]]; then
    rm -rf frontend/dist.failed
    mv frontend/dist frontend/dist.failed
    mv frontend/dist.prev frontend/dist
    echo "Previous frontend build restored (failed one in frontend/dist.failed)." >&2
  fi
  echo "API logs: pm2 logs dashvolcano-api --lines 50" >&2
  echo "To go back to the previous code: git reset --keep $PREV && $0 --no-pull" >&2
  exit 1
}

step "Checks"
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 "$API_URL/health" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 1
done
(( healthy )) || rollback "The API does not answer on $API_URL/health."
echo "Health: $(curl -fsS --max-time 5 "$API_URL/health")"
curl -fsS --max-time 30 "$API_URL/api/metadata/databases" >/dev/null \
  || rollback "The API answers but cannot query the database ($API_URL/api/metadata/databases)."
echo "Database query: OK"

# 5. PM2 list restored at boot ---------------------------------------------------
pm2 save

step "Deployed $(git log -1 --format='%h %s' "$NEW")"
