// 通过 GitHub Git Data API 推送本地 commits（绕过 github.com 直连限制）
// 使用 gh CLI 的 token 走 api.github.com
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'Zayizzy/vshop';
const BRANCH = 'main';
const PARENT_SHA = 'cca7e942d1bdb03bf9713f874c27a0b70a2d7943';
const BASE_TREE = '5553fa4b8c802f7b4cee8afb67db09dae69ab853';

const PROJECT_ROOT = path.resolve(__dirname, '..');

// gh api 封装
function ghApi(endpoint, method = 'GET', body = null) {
  const args = ['api', `repos/${REPO}/${endpoint}`];
  if (method !== 'GET') {
    args.push('-X', method);
  }
  if (body) {
    args.push('--input', '-');
  }
  const input = body ? JSON.stringify(body) : '';
  const result = execSync(`gh ${args.join(' ')}`, {
    input,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(result);
}

// 变更文件列表
const FILES = [
  '.dockerignore',
  'Dockerfile',
  'docs/database/data-dictionary.md',
  'docs/database/er-diagram.md',
  'docs/deploy-wx-cloudrun.md',
  'scripts/generate-db-docs.js',
  'vshop-server/start.sh',
  'miniprogram/api/index.js',
  'miniprogram/pages/order/list.js',
  'miniprogram/pages/order/list.json',
  'miniprogram/pages/order/list.wxml',
  'miniprogram/pages/order/list.wxss',
  'vshop-server/package.json',
  'vshop-server/src/main.ts',
  'vshop-server/src/modules/order/order.controller.ts',
  'vshop-server/src/modules/order/order.service.ts',
];

async function main() {
  console.log('[1/4] Creating blobs for all changed files...');

  const treeEntries = [];
  for (const filePath of FILES) {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    const content = fs.readFileSync(fullPath);
    const b64 = content.toString('base64');

    process.stdout.write(`  - blob: ${filePath} ... `);
    const blob = ghApi('git/blobs', 'POST', {
      content: b64,
      encoding: 'base64',
    });

    if (blob.sha && /^[0-9a-f]{40}$/.test(blob.sha)) {
      console.log(`sha: ${blob.sha.substring(0, 12)}`);
      treeEntries.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    } else {
      console.error(`ERROR: ${JSON.stringify(blob)}`);
      process.exit(1);
    }
  }

  console.log('\n[2/4] Creating tree...');
  const tree = ghApi('git/trees', 'POST', {
    base_tree: BASE_TREE,
    tree: treeEntries,
  });

  if (!tree.sha || !/^[0-9a-f]{40}$/.test(tree.sha)) {
    console.error('ERROR creating tree:', tree);
    process.exit(1);
  }
  console.log(`  tree sha: ${tree.sha}`);

  console.log('\n[3/4] Creating commit...');
  const commit = ghApi('git/commits', 'POST', {
    message:
      'feat: add Dockerfile for WeChat Cloud Run deployment + order date filter & db docs\n\n' +
      '- Add root Dockerfile (build context = project root, copies miniprogram/assets)\n' +
      '- Add .dockerignore\n' +
      '- Add vshop-server/start.sh: runs prisma migrate deploy before app start\n' +
      '- Move prisma to dependencies (needed after npm prune)\n' +
      '- Update main.ts: bind 0.0.0.0 + support PORT env var\n' +
      '- Add deployment guide: docs/deploy-wx-cloudrun.md\n' +
      '- Order list: date range filter & export\n' +
      '- Add database docs & ER diagram',
    tree: tree.sha,
    parents: [PARENT_SHA],
  });

  if (!commit.sha || !/^[0-9a-f]{40}$/.test(commit.sha)) {
    console.error('ERROR creating commit:', commit);
    process.exit(1);
  }
  console.log(`  commit sha: ${commit.sha}`);

  console.log(`\n[4/4] Updating ref refs/heads/${BRANCH}...`);
  const ref = ghApi(`git/refs/heads/${BRANCH}`, 'PATCH', {
    sha: commit.sha,
    force: false,
  });

  console.log(`  ref updated: ${ref.object.sha}`);
  console.log(`\n✅ Push complete! Remote main is now at ${commit.sha}`);
}

main().catch((err) => {
  console.error('\n❌ Push failed:', err.message);
  process.exit(1);
});
