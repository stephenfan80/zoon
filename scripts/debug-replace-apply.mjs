// 临时诊断脚本：headless 复现"整段 replace + 无共同子串"Apply bug
// 用法：cd ~/个人项目/proof-china/proof-sdk && tsx scripts/debug-replace-apply.mjs
// 用完即删（计划文件 fizzy-squishing-diffie.md 的 Step 3 会清理）

import { finalizeSuggestionThroughRehydration } from '../server/proof-mark-rehydration.ts';

// 复用 7ebdf68r 的内容结构 - 干净 markdown，3 段落
const markdown = '# Suggest UX 干净测试\n\n第一段：这是原始段落内容，等待被 agent 建议修改。\n\n第二段：这一段不会被动。\n\n第三段：这一段也不会被动。\n';

const markId = 'test-replace-mark-1';

// 构造一条 pending replace mark：quote = 整段，content = 完全不同的整段（无共享子串）
const marks = {
  [markId]: {
    kind: 'replace',
    by: 'ai:claude-code',
    createdAt: new Date('2026-04-08T00:00:00.000Z').toISOString(),
    quote: '第一段：这是原始段落内容，等待被 agent 建议修改。',
    content: '第一段：这是 agent 建议替换后的新内容，更精炼。',
    status: 'pending',
  },
};

console.log('=== INPUT ===');
console.log('markdown:', JSON.stringify(markdown));
console.log('mark quote:', JSON.stringify(marks[markId].quote));
console.log('mark content:', JSON.stringify(marks[markId].content));
console.log();

const result = await finalizeSuggestionThroughRehydration({
  markdown,
  marks,
  markId,
  action: 'accept',
});

console.log('=== RESULT ===');
console.log('ok:', result.ok);
if (result.ok) {
  console.log('output markdown:', JSON.stringify(result.markdown));
  console.log();
  console.log('--- markdown rendered ---');
  console.log(result.markdown);
  console.log('--- end ---');
  console.log();
  console.log('marks after:');
  for (const [id, m] of Object.entries(result.marks || {})) {
    console.log(`  ${id} | kind=${m.kind} | by=${m.by} | quote=${JSON.stringify(m.quote)}`);
  }
} else {
  console.log('error code:', result.code);
  console.log('error msg:', result.error);
}
