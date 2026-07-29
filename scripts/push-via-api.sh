#!/bin/bash
# 通过 GitHub Git Data API 推送本地 commits（绕过 github.com 直连限制）
# 使用 gh api（走 api.github.com）逐文件创建 blob → tree → commit → update ref

set -e
cd "$(dirname "$0")/.."

REPO="Zayizzy/vshop"
BRANCH="main"
PARENT_SHA="cca7e942d1bdb03bf9713f874c27a0b70a2d7943"
BASE_TREE="5553fa4b8c802f7b4cee8afb67db09dae69ab853"

echo "[1/4] Creating blobs for all changed files..."

# 变更文件列表（path|mode）
FILES=(
  ".dockerignore|100644"
  "Dockerfile|100644"
  "docs/database/data-dictionary.md|100644"
  "docs/database/er-diagram.md|100644"
  "docs/deploy-wx-cloudrun.md|100644"
  "scripts/generate-db-docs.js|100644"
  "vshop-server/start.sh|100644"
  "miniprogram/api/index.js|100644"
  "miniprogram/pages/order/list.js|100644"
  "miniprogram/pages/order/list.json|100644"
  "miniprogram/pages/order/list.wxml|100644"
  "miniprogram/pages/order/list.wxss|100644"
  "vshop-server/package.json|100644"
  "vshop-server/src/main.ts|100644"
  "vshop-server/src/modules/order/order.controller.ts|100644"
  "vshop-server/src/modules/order/order.service.ts|100644"
)

TREE_ENTRIES="[]"

for entry in "${FILES[@]}"; do
  FILE_PATH="${entry%%|*}"
  MODE="${entry##*|}"

  echo "  - blob: $FILE_PATH"

  # Base64 encode file content
  B64=$(base64 -w 0 "$FILE_PATH")

  # Create blob via gh api
  BLOB_SHA=$(gh api "repos/$REPO/git/blobs" \
    -f content="$B64" \
    -f encoding="base64" \
    --jq '.sha' 2>&1)

  if [[ "$BLOB_SHA" =~ ^[0-9a-f]{40}$ ]]; then
    echo "    sha: $BLOB_SHA"
  else
    echo "    ERROR: $BLOB_SHA"
    exit 1
  fi

  # Build tree entry JSON
  ENTRY=$(cat <<EOF
{"path":"$FILE_PATH","mode":"$MODE","type":"blob","sha":"$BLOB_SHA"}
EOF
)
  TREE_ENTRIES=$(echo "$TREE_ENTRIES" | jq --argjson entry "$ENTRY" '. + [$entry]')
done

echo "[2/4] Creating tree..."
TREE_RESULT=$(echo "$TREE_ENTRIES" | jq -n --arg base "$BASE_TREE" '{base_tree: $base, tree: inputs}')
TREE_SHA=$(echo "$TREE_RESULT" | gh api "repos/$REPO/git/trees" --input - --jq '.sha' 2>&1)

if [[ "$TREE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "  tree sha: $TREE_SHA"
else
  echo "  ERROR creating tree: $TREE_SHA"
  exit 1
fi

echo "[3/4] Creating commit..."
COMMIT_SHA=$(gh api "repos/$REPO/git/commits" \
  -f message="feat: add Dockerfile for WeChat Cloud Run deployment + order date filter & db docs

- Add root Dockerfile (build context = project root, copies miniprogram/assets)
- Add .dockerignore
- Add vshop-server/start.sh: runs prisma migrate deploy before app start
- Move prisma to dependencies (needed after npm prune)
- Update main.ts: bind 0.0.0.0 + support PORT env var
- Add deployment guide: docs/deploy-wx-cloudrun.md
- Order list: date range filter & export
- Add database docs & ER diagram" \
  -f "tree=$TREE_SHA" \
  -f "parents[]=$PARENT_SHA" \
  --jq '.sha' 2>&1)

if [[ "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "  commit sha: $COMMIT_SHA"
else
  echo "  ERROR creating commit: $COMMIT_SHA"
  exit 1
fi

echo "[4/4] Updating ref refs/heads/$BRANCH..."
REF_RESULT=$(gh api "repos/$REPO/git/refs/heads/$BRANCH" \
  -X PATCH \
  -f sha="$COMMIT_SHA" \
  -f force="false" \
  --jq '.object.sha' 2>&1)

echo "  ref updated: $REF_RESULT"
echo ""
echo "✅ Push complete! Remote main is now at $COMMIT_SHA"
