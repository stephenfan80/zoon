import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Regression guard: src/ui/welcome-card.ts must call buildAgentInviteMessage,
// never maintain its own copy of the invite prompt.
//
// 历史坑：Phase 1.1 只改了 buildAgentInviteMessage + universalSkillPrompt 两个
// 入口，漏了 welcome-card.ts 里一份硬编码的 7 步 Ack Protocol prompt。那份 prompt
// 是用户点"邀请 Agent"按钮实际复制到剪贴板的文本——绕开了 builder，让 agent 被
// 锁在 comment + 拍板 老路径上。统一到 builder 之后，这个测试防止未来又漂出来
// 第二份副本。
//
// 不做运行时等值断言（那需要 DOM 才能 import welcome-card），改成对源码做静态
// 约束：必须 import builder；必须没有老 7 步的招牌字符串。

const SOURCE_PATH = join(__dirname, '..', 'ui', 'welcome-card.ts');
const rawSrc = readFileSync(SOURCE_PATH, 'utf8');

// 去掉整行行注释（"^   //..."），这样"历史上这里硬编码过一份 7 步 Ack
// Protocol prompt..."这种讲故事的注释不会触发下面的文本禁用规则——规则只
// 针对真的代码/字符串里的 prompt 文本。
const src = rawSrc
  .split('\n')
  .filter((line) => !/^\s*\/\//.test(line))
  .join('\n');

// 1) 必须从 shared builder 导入
assert(
  /import\s+\{[^}]*\bbuildAgentInviteMessage\b[^}]*\}\s+from\s+['"][^'"]*shared\/agent-invite-message['"]/.test(src),
  'welcome-card.ts must import buildAgentInviteMessage from shared/agent-invite-message',
);

// 2) 不允许再出现 Phase 0/1 版 Ack Protocol 的招牌字符串
const forbidden: Array<[RegExp, string]> = [
  [/Ack Protocol/i, 'legacy "Ack Protocol" framing'],
  [/follow this exactly/i, 'legacy "follow this exactly" 7-step cue'],
  [/FIRST:\s*announce/i, 'legacy "FIRST: announce presence" step'],
  [/legacy\s+👍\s+emoji/i, 'legacy thumbs-up emoji wording'],
  [/Wait for 「拍板」.*before|before.*Wait for 「拍板」/, 'legacy "wait before editing" wording'],
  [/add a comment first/i, 'legacy "add a comment first" step'],
  [/presence\/disconnect/i, 'legacy presence/disconnect step (builder does not include it)'],
];

for (const [pattern, label] of forbidden) {
  assert(
    !pattern.test(src),
    `welcome-card.ts must not contain ${label}; source matches ${pattern}`,
  );
}

// 3) 不允许再定义一个和 builder 并行的 buildPrompt 本地函数
assert(
  !/function\s+buildPrompt\s*\(/.test(src),
  'welcome-card.ts must not define its own buildPrompt(); call buildAgentInviteMessage instead',
);

console.log('✓ welcome-card.ts uses shared buildAgentInviteMessage (no local Ack Protocol copy)');
