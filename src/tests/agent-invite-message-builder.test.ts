import assert from 'node:assert/strict';
import { buildAgentInviteMessage } from '../shared/agent-invite-message';

// Regression: agent 通过 POST /api/public/documents（或 /documents、/share/markdown）
// 创建完 doc 后，要把邀请文本交给下一个 agent。老路径是 agent 自己拼模板，经常
// 忘了把 <token-from-doc-url> 这种占位符替换成真 token，下一个 agent 拿着字面
// "<token-from-doc-url>" 去做 x-share-token 认证全败、HTTP 401。
//
// 修复：把模板拼装收敛到 src/shared/agent-invite-message.ts 一个纯函数，
// 服务端和浏览器 invite 按钮都调这个 builder，服务端响应里多带一个
// agentInviteMessage 字段 —— 下一个 agent 直接粘贴就能用。
//
// 这个测试锁死 builder 的输入/输出契约。

// 1) token 真值必须直接嵌进 x-share-token 行；不能再留占位符。
{
  const msg = buildAgentInviteMessage({
    origin: 'https://zoon.example.com',
    slug: 'abc12345',
    token: 'secret-token-real-value',
    shareUrl: null,
  });
  assert(
    msg.includes('x-share-token: secret-token-real-value'),
    'Expected real token to be embedded into the x-share-token header line',
  );
  assert(
    !msg.includes('<token-from-doc-url>'),
    'Expected placeholder <token-from-doc-url> NOT to appear when a real token is given',
  );
}

// 2) Doc 链接优先用调用方传进来的 shareUrl（服务端已经拼好带 token 的 URL），
//    确保响应 body 里的 url 和邀请文本里的 Doc: 链接是同一个字符串。
{
  const msg = buildAgentInviteMessage({
    origin: 'https://zoon.example.com',
    slug: 'abc12345',
    token: 'tok',
    shareUrl: 'https://zoon.example.com/d/abc12345?token=tok',
  });
  assert(
    msg.includes('Doc: https://zoon.example.com/d/abc12345?token=tok'),
    'Expected the provided shareUrl to be used verbatim as the Doc: link',
  );
}

// 3) 没给 shareUrl 时 fallback 到 origin + slug + ?token=，保证链接始终带 token。
{
  const msg = buildAgentInviteMessage({
    origin: 'https://zoon.example.com',
    slug: 'abc12345',
    token: 'tok',
    shareUrl: null,
  });
  assert(
    msg.includes('Doc: https://zoon.example.com/d/abc12345?token=tok'),
    'Expected fallback share URL to include ?token=',
  );
}

// 4) Presence / state / skill 三个 URL 要用 encodeURIComponent 处理 slug，
//    下一个 agent 直接 curl 就能用；也顺便把 skill 指向 /skill。
{
  const msg = buildAgentInviteMessage({
    origin: 'https://zoon.example.com',
    slug: 'abc12345',
    token: 'tok',
    shareUrl: null,
  });
  assert(msg.includes('POST https://zoon.example.com/api/agent/abc12345/presence'), 'presence URL missing');
  assert(msg.includes('GET https://zoon.example.com/api/agent/abc12345/state'), 'state URL missing');
  assert(msg.includes('https://zoon.example.com/skill'), 'skill URL missing');
}

// 5) 没有 token 的匿名场景（比如 share 未开启）回退到字面占位符；这时候
//    邀请文本本来就不该被自动粘贴，占位符的存在是"请人工补 token"的信号。
{
  const msg = buildAgentInviteMessage({
    origin: 'https://zoon.example.com',
    slug: 'abc12345',
    token: null,
    shareUrl: null,
  });
  assert(
    msg.includes('x-share-token: <token-from-doc-url>'),
    'Expected placeholder only when no token is provided',
  );
}

// 6) 没有 slug（非常早期 / 异常场景）走最短 fallback，只给 Doc 链接，
//    不暴露 presence/state API —— 那些 URL 没 slug 拼不出来。
{
  const msg = buildAgentInviteMessage({
    origin: 'https://zoon.example.com',
    slug: null,
    token: null,
    shareUrl: null,
  });
  assert(msg.includes('Doc: https://zoon.example.com'), 'slug-less message should still carry a Doc link');
  assert(!msg.includes('/api/agent/'), 'slug-less message should NOT reference presence/state endpoints');
}

// 7) slug 里带特殊字符时要 URL-encode，避免生成出非法 URL。
{
  const msg = buildAgentInviteMessage({
    origin: 'https://zoon.example.com',
    slug: 'weird slug/with+chars',
    token: 'tok',
    shareUrl: null,
  });
  assert(msg.includes('weird%20slug%2Fwith%2Bchars'), 'Expected slug to be URL-encoded in generated URLs');
}

console.log('✓ buildAgentInviteMessage: token embedding + shareUrl passthrough + slug-less fallback');
