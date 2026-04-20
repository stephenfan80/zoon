import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: agent 自己创建的 doc（或 owner 通过 cookie-auth 回访自己 doc）时，
// 地址栏通常是 /d/:slug 形态、不带 ?token=。老代码从 window.location.href 用
// extractShareTokenFromUrl 抽 token，这种场景永远抓空，模板回退到字面占位符
// <token-from-doc-url>，下一个被邀请的 agent 拿这个字符串做 x-share-token 认证
// 全部失败，无法加入。
//
// 修复：getAgentInviteMessage 直接从 shareClient.getShareToken() 读内存里的真值
// （source = proofConfig.shareToken，由服务端注入），Doc 链接也走
// shareClient.getTokenizedWebUrl() 确保 ?token= 一定在。
//
// 这个测试锁 editor 侧的来源选择、以及 shareClient 侧暴露的 getShareToken
// 契约。

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editorSource = readFileSync(path.join(__dirname, '../editor/index.ts'), 'utf8');
const shareClientSource = readFileSync(path.join(__dirname, '../bridge/share-client.ts'), 'utf8');

// 1) share-client 暴露 getShareToken()：editor 需要的单一真值来源。
assert(
  /getShareToken\s*\(\s*\)\s*:\s*string\s*\|\s*null/.test(shareClientSource),
  'Expected ShareClient.getShareToken(): string | null to exist on the share-client API',
);

// 2) getAgentInviteMessage 的函数体必须从 shareClient 拿 token，不能再走
//    URL 参数抽取。
const inviteFnStart = editorSource.indexOf('private getAgentInviteMessage(): string {');
assert(inviteFnStart !== -1, 'Expected getAgentInviteMessage to exist');
const inviteFnEnd = editorSource.indexOf('\n  private ', inviteFnStart + 1);
assert(inviteFnEnd !== -1, 'Expected getAgentInviteMessage to have a successor method');
const inviteFnBody = editorSource.slice(inviteFnStart, inviteFnEnd);

assert(
  inviteFnBody.includes('shareClient.getShareToken()'),
  'Expected getAgentInviteMessage to read token via shareClient.getShareToken()',
);

// 3) 明确禁止再出现"从 URL 查询串抽 token"的旧路径 —— 这是 regression 的
//    核心动因。
assert(
  !inviteFnBody.includes('extractShareTokenFromUrl'),
  'Expected getAgentInviteMessage NOT to read token via URL extraction (extractShareTokenFromUrl is the wrong source of truth)',
);
assert(
  !inviteFnBody.includes("searchParams.get('token')"),
  'Expected getAgentInviteMessage NOT to read token via window.location searchParams',
);

// 4) Doc 链接走 tokenized 版本，让收件人点链接就天然带 token。
assert(
  inviteFnBody.includes('shareClient.getTokenizedWebUrl('),
  'Expected getAgentInviteMessage to build the Doc link via shareClient.getTokenizedWebUrl so the URL carries ?token=',
);

// 5) 旧的 extractShareTokenFromUrl 已经在 editor 里没有任何 caller ——
//    确保它被彻底删掉，避免未来有人误用。
assert(
  !editorSource.includes('extractShareTokenFromUrl'),
  'Expected extractShareTokenFromUrl to be removed from editor (dead code with the wrong-source-of-truth smell)',
);

console.log('✓ getAgentInviteMessage reads token from shareClient instead of URL extraction');
