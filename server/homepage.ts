/**
 * Zoon 首页（人类入口）
 *
 * 服务端直接返回完整 HTML，不走 Vite 构建。零依赖，方便独立维护。
 * 视觉：#f7faf5 浅绿底 + #266854 深绿 accent。
 *
 * 创建文档走 POST /api/public/documents（无鉴权、IP 限速），成功后跳转到
 * /d/<slug>?token=...&welcome=1，由 src/ui/welcome-card.ts 弹出欢迎弹窗。
 */

const HOMEPAGE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: #f7faf5;
    color: #17261d;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: #266854; text-decoration: none; }
  a:hover { color: #1f5444; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 0 24px; }
  header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 24px; max-width: 960px; margin: 0 auto;
  }
  .logo {
    font-family: "Iowan Old Style", "Apple Garamond", Baskerville, Georgia, serif;
    font-size: 22px; font-weight: 600; letter-spacing: -0.5px; color: #17261d;
  }
  .logo-dot { color: #266854; }
  nav.top-nav { display: flex; gap: 20px; font-size: 14px; }
  nav.top-nav a { color: #4b5b52; }

  .hero { padding: 72px 0 56px; text-align: center; }
  .hero h1 {
    font-family: "Iowan Old Style", "Apple Garamond", Baskerville, Georgia, serif;
    font-size: 56px; font-weight: 600; letter-spacing: -1.5px; line-height: 1.1;
    margin-bottom: 20px; color: #17261d;
  }
  .hero h1 em { font-style: italic; color: #266854; font-weight: 500; }
  .hero p.subtitle { font-size: 20px; color: #4b5b52; max-width: 560px; margin: 0 auto 36px; }
  .ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  button.primary, a.primary {
    background: #266854; color: #fff; border: none;
    padding: 14px 28px; font-size: 16px; font-weight: 600;
    border-radius: 10px; cursor: pointer;
    font-family: inherit; letter-spacing: -0.1px;
    transition: background 150ms ease, transform 150ms ease;
    display: inline-flex; align-items: center; gap: 8px;
  }
  button.primary:hover, a.primary:hover { background: #1f5444; color: #fff; }
  button.primary:active, a.primary:active { transform: translateY(1px); }
  button.primary[disabled] { background: #7a9b8a; cursor: wait; }
  a.secondary {
    padding: 14px 24px; font-size: 15px; font-weight: 500;
    border-radius: 10px; border: 1px solid #d4dfd7;
    color: #17261d; background: transparent;
    display: inline-flex; align-items: center; gap: 6px;
  }
  a.secondary:hover { background: #edf2ec; color: #17261d; }

  .features { padding: 56px 0 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .feature {
    background: #fff; border: 1px solid #e5ebe6; border-radius: 14px;
    padding: 28px 24px;
  }
  .feature .icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: #eaf2e6; color: #266854;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 700; margin-bottom: 16px;
  }
  .feature h3 {
    font-size: 17px; font-weight: 600; margin-bottom: 8px; color: #17261d;
    letter-spacing: -0.3px;
  }
  .feature p { font-size: 14px; color: #4b5b52; line-height: 1.6; }

  .howto { padding: 40px 0 56px; }
  .howto h2 {
    font-family: "Iowan Old Style", "Apple Garamond", Baskerville, Georgia, serif;
    font-size: 32px; font-weight: 600; letter-spacing: -0.8px;
    text-align: center; margin-bottom: 36px;
  }
  .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .step {
    text-align: left; padding: 22px 20px;
    background: #fff; border: 1px solid #e5ebe6; border-radius: 12px;
  }
  .step-num {
    font-family: "Iowan Old Style", Georgia, serif;
    font-size: 24px; font-weight: 600; color: #266854; margin-bottom: 10px;
  }
  .step h4 { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: #17261d; }
  .step p { font-size: 13px; color: #6b7a70; line-height: 1.55; }

  .agent-block { padding: 40px 0 64px; }
  .agent-block h2 {
    font-family: "Iowan Old Style", Georgia, serif;
    font-size: 28px; font-weight: 600; letter-spacing: -0.6px;
    text-align: center; margin-bottom: 8px;
  }
  .agent-block p.lead {
    text-align: center; color: #4b5b52; max-width: 580px; margin: 0 auto 24px;
  }
  .code-block {
    position: relative;
    background: #17261d; color: #dde7e0;
    font-family: "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 13px; line-height: 1.65;
    border-radius: 12px; padding: 20px 24px;
    white-space: pre-wrap; word-break: break-word;
    overflow-x: auto;
  }
  .copy-btn {
    position: absolute; top: 12px; right: 12px;
    background: rgba(255,255,255,0.1); color: #dde7e0;
    border: none; border-radius: 6px;
    padding: 6px 10px; font-size: 12px; cursor: pointer;
    font-family: inherit;
  }
  .copy-btn:hover { background: rgba(255,255,255,0.18); }

  footer {
    border-top: 1px solid #e5ebe6; padding: 28px 0 40px;
    font-size: 13px; color: #6b7a70;
    text-align: center;
  }
  footer a { color: #266854; }

  @media (max-width: 720px) {
    .hero { padding: 48px 0 32px; }
    .hero h1 { font-size: 40px; letter-spacing: -1px; }
    .hero p.subtitle { font-size: 17px; }
    .features { grid-template-columns: 1fr; }
    .steps { grid-template-columns: 1fr 1fr; }
    header { padding: 16px 20px; }
  }
  @media (max-width: 420px) {
    .steps { grid-template-columns: 1fr; }
  }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HOMEPAGE_SCRIPT = String.raw`
(function () {
  async function writeClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { await navigator.clipboard.writeText(text); return true; } catch (_e) {}
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_e) { return false; }
  }

  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var block = document.getElementById(btn.getAttribute('data-target'));
      if (!block) return;
      var text = (block.textContent || '').trim();
      var original = btn.textContent;
      var ok = await writeClipboard(text);
      btn.textContent = ok ? '已复制' : '复制失败';
      setTimeout(function () { btn.textContent = original; }, 1500);
    });
  });

  var createBtn = document.getElementById('create-doc');
  if (createBtn) {
    createBtn.addEventListener('click', async function () {
      var originalText = createBtn.textContent;
      createBtn.disabled = true;
      createBtn.textContent = '创建中…';
      try {
        var res = await fetch('/api/public/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!res.ok) {
          var err = await res.json().catch(function () { return {}; });
          var msg = err && err.error ? err.error : '创建失败（' + res.status + '）';
          alert(msg);
          createBtn.disabled = false;
          createBtn.textContent = originalText;
          return;
        }
        var data = await res.json();
        if (data.ownerSecret && data.slug) {
          try { localStorage.setItem('zoon:owner:' + data.slug, data.ownerSecret); } catch (_e) {}
        }
        var target = '/d/' + encodeURIComponent(data.slug)
          + '?token=' + encodeURIComponent(data.accessToken)
          + '&welcome=1';
        window.location.href = target;
      } catch (e) {
        alert('网络异常，请稍后重试');
        createBtn.disabled = false;
        createBtn.textContent = originalText;
      }
    });
  }
})();
`;

export function renderHomepage(origin: string): string {
  // 站内外 agent 拉取 skill 的标准 snippet，放在首页可复制区
  const skillUrl = `${origin}/skill`;
  const agentPromptSnippet =
    `Here's my Zoon doc: <paste your /d/<slug>?token=... link>\n\n` +
    `Before writing anything, fetch the skill at ${skillUrl} and follow it exactly.\n` +
    `Zoon is a human-AI collaborative editor: read my doc first, then leave comment\n` +
    `suggestions. Don't edit until I reply 👍 to your comment.`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zoon — 和 Agent 一起写作的文档</title>
  <meta name="description" content="Zoon 是一个人机协作文档编辑器。绿色边栏标记你写的字，紫色标记 AI 写的字，Agent 通过批注提议，你回 👍 才动手。" />
  <meta property="og:title" content="Zoon — 和 Agent 一起写作的文档" />
  <meta property="og:description" content="快速、免费、无需登录。" />
  <meta property="og:type" content="website" />
  <link rel="icon" type="image/svg+xml" href="/zoon-favicon.svg" />
  <style>${HOMEPAGE_STYLES}</style>
</head>
<body>
  <header>
    <div class="logo">Zoon<span class="logo-dot">.</span></div>
    <nav class="top-nav">
      <a href="/skill">Agent Skill</a>
      <a href="/agent-docs">API 文档</a>
    </nav>
  </header>

  <main class="wrap">
    <section class="hero">
      <h1>和 <em>Agent</em> 一起<br />写作的文档</h1>
      <p class="subtitle">快速、免费、无需登录。每一段文字都知道是谁写的——你，还是 AI。</p>
      <div class="ctas">
        <button id="create-doc" class="primary" type="button">创建新文档 →</button>
        <a class="secondary" href="/skill">了解 Agent 协议</a>
      </div>
    </section>

    <section class="features">
      <div class="feature">
        <div class="icon">◐</div>
        <h3>溯源 · Provenance</h3>
        <p>左侧彩色边栏追踪每一个字的来源。绿色是你写的，紫色是 AI 写的，删改插入都有作者。</p>
      </div>
      <div class="feature">
        <div class="icon">✎</div>
        <h3>批注 · Comments</h3>
        <p>Agent 不会直接改你的文档。它在批注里说明想改什么、为什么改，你看完再拍板。</p>
      </div>
      <div class="feature">
        <div class="icon">👍</div>
        <h3>确认协议 · 👍 Protocol</h3>
        <p>你回 👍，Agent 才动手改。回 👎 或追问，它重新提方案。你始终掌握最终决定权。</p>
      </div>
    </section>

    <section class="howto">
      <h2>四步开始协作</h2>
      <div class="steps">
        <div class="step">
          <div class="step-num">01</div>
          <h4>创建文档</h4>
          <p>点「创建新文档」，秒开空白编辑器。</p>
        </div>
        <div class="step">
          <div class="step-num">02</div>
          <h4>邀请 Agent</h4>
          <p>弹窗里复制一段提示词，粘贴给 Claude Code、Cursor 或任意 AI 工具。</p>
        </div>
        <div class="step">
          <div class="step-num">03</div>
          <h4>对话与批注</h4>
          <p>Agent 读完文档，在批注里提方案，等你回 👍。</p>
        </div>
        <div class="step">
          <div class="step-num">04</div>
          <h4>协作成文</h4>
          <p>每一个字都清晰标注来源，分享链接给其他人继续协作。</p>
        </div>
      </div>
    </section>

    <section class="agent-block">
      <h2>已经有文档链接？直接发给 Agent</h2>
      <p class="lead">把下面这段粘贴给任意支持 HTTP 的 Agent，它就会按 Zoon 的 👍 协议跟你协作：</p>
      <div class="code-block" id="agent-prompt">${escapeHtml(agentPromptSnippet)}<button class="copy-btn" data-target="agent-prompt">复制</button></div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      Zoon · 人机协作文档编辑器 · <a href="https://proofeditor.ai" target="_blank" rel="noopener">Inspired by Proof</a> · MIT 开源
    </div>
  </footer>

  <script>${HOMEPAGE_SCRIPT}</script>
</body>
</html>`;
}
