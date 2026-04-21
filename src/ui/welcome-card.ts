/**
 * Welcome card overlay for new documents / agent invite re-open.
 *
 * 三种 pill 状态（对应用户可见的三态按钮）：
 *   idle     — 默认「邀请 Agent」（可点击），pill 文案提示先复制再粘贴
 *   waiting  — 点击 idle 后：prompt 已静默写进剪贴板，pill 变「邀请中…」旋转态
 *   joined   — 收到 zoon:agents-changed 事件后：整张卡片换成动物头像 + 继续写作
 *
 * 为什么三态：之前默认进来就是 waiting，用户还没点、也没复制，体验像
 * "系统已经替我邀请了"——实际剪贴板是空的，agent 永远不会自己进来。
 *
 * 触发方式：
 *   - URL 带 `?welcome=1`（首页「新建」跳转时）→ 自动弹
 *   - 编辑器 ⋯ 菜单里的「邀请 Agent」→ 手动重开（reopen=true）
 */

import { createAnimalAvatarEl } from './animal-avatar';

type ShowOptions = {
  reopen?: boolean;           // 手动重开时不塞 welcome=1
};

type AgentsChangedDetail = {
  count: number;
  first?: { id: string; name: string };
};

const EVENT_NAME = 'zoon:agents-changed';

function buildDocUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('welcome');
  return url.toString();
}

function buildPrompt(docUrl: string): string {
  return `Here's my Zoon document: ${docUrl}

Zoon is a human-AI collaborative document editor. It tracks authorship: green gutter = human, purple = AI.

Collaboration protocol (the "拍板协议" / Ack Protocol) — follow this exactly:
1. FIRST: announce presence so my invite modal flips to "joined": POST /api/agent/{slug}/presence with Authorization: Bearer {token}, body {"agentId":"<your-id>","name":"<your-name>","status":"active"}. Do this before anything else.
2. Read the document: GET /documents/{slug}/state with Authorization: Bearer {token} (token is in the URL).
3. Reply back in chat with what the doc is about and 2–3 specific things you could help with — DO NOT edit or comment until I pick one.
4. When I ask for a change: add a comment first (POST /documents/{slug}/ops with {"type":"comment.add","by":"ai:{your-name}","quote":"exact text from doc","text":"your suggestion — click 「拍板」 and I'll apply it"}).
5. Wait for 「拍板」 (or the legacy 👍 emoji). Do not make any edits until the human replies with one of those.
6. When you see 「拍板」 or 👍: apply the edit with POST /api/agent/{slug}/edit/v2, then resolve the mark.
7. When you're done, leave cleanly: POST /api/agent/{slug}/presence/disconnect with the same {"agentId":"<your-id>"} body.

Full skill: {skillUrl}`;
}

function buildPromptWithUrls(docUrl: string): string {
  const base = new URL(docUrl).origin;
  return buildPrompt(docUrl).replace('{skillUrl}', `${base}/skill`);
}

function injectStyles(): void {
  if (document.getElementById('welcome-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'welcome-card-styles';
  style.textContent = `
    @keyframes welcome-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes welcome-slide-up { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes welcome-fade-out { from { opacity: 1; } to { opacity: 0; } }
    @keyframes welcome-spin { to { transform: rotate(360deg); } }
    @keyframes welcome-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    #welcome-overlay {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      animation: welcome-fade-in 200ms ease-out;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #welcome-overlay.dismissing { animation: welcome-fade-out 150ms ease-in forwards; }
    .welcome-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      padding: 0;
      max-width: 520px;
      width: 92%;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.06);
      animation: welcome-slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1);
      color: #1a1a1a;
      overflow: hidden;
    }
    .welcome-body { padding: 28px 32px 0; }
    .welcome-eyebrow {
      display: inline-block;
      padding: 5px 10px;
      background: #eef2ff;
      color: #4338ca;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      margin-bottom: 14px;
    }
    .welcome-card h2 {
      margin: 0 0 8px;
      font-family: 'Fraunces', Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #111;
      letter-spacing: -0.4px;
      line-height: 1.2;
    }
    .welcome-subtitle {
      margin: 0 0 18px;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.55;
    }
    .welcome-prompt-box {
      position: relative;
      background: #0f172a;
      border-radius: 10px;
      padding: 16px 18px;
      font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      user-select: all;
      cursor: text;
    }
    .welcome-prompt-copy-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.15);
      color: #e2e8f0;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 120ms, color 120ms;
      font-family: inherit;
    }
    .welcome-prompt-copy-btn:hover { background: rgba(255,255,255,0.18); }
    .welcome-prompt-copy-btn.copied {
      background: rgba(134,239,172,0.20);
      color: #bbf7d0;
      border-color: rgba(134,239,172,0.40);
    }
    .welcome-subhint {
      margin-top: 12px;
      font-size: 12.5px;
      color: #6b7280;
      line-height: 1.5;
    }
    .welcome-primary-pill {
      width: 100%;
      margin-top: 18px;
      padding: 14px 16px;
      border: none;
      border-radius: 10px;
      font-size: 14.5px;
      font-weight: 700;
      cursor: default;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: inherit;
      letter-spacing: -0.1px;
    }
    .welcome-primary-pill.waiting {
      background: #4338ca;
      color: #fff;
    }
    .welcome-primary-pill.idle {
      background: #4338ca;
      color: #fff;
      cursor: pointer;
      transition: background 120ms, transform 120ms;
    }
    .welcome-primary-pill.idle:hover { background: #3730a3; }
    .welcome-primary-pill.idle:active { transform: scale(0.985); }
    .welcome-primary-pill.idle:disabled { cursor: default; opacity: 0.8; }
    .welcome-primary-pill.idle svg {
      width: 16px; height: 16px; flex-shrink: 0;
    }
    .welcome-primary-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: welcome-spin 0.9s linear infinite;
    }
    .welcome-footer { padding: 14px 32px 24px; text-align: center; }
    .welcome-skip-btn {
      padding: 0;
      background: none;
      border: none;
      color: #6b7280;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .welcome-skip-btn:hover { color: #374151; }
    .welcome-hint {
      margin-top: 10px;
      font-size: 11.5px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .welcome-close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 50%;
      background: rgba(17,24,39,0.06);
      color: #6b7280;
      font-size: 16px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 120ms;
      font-family: inherit;
    }
    .welcome-close-btn:hover { background: rgba(17,24,39,0.12); color: #111; }

    /* joined state */
    .welcome-joined-body {
      padding: 42px 32px 12px;
      text-align: center;
    }
    .welcome-joined-avatar-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 86px;
      height: 86px;
      border-radius: 50%;
      background: #ede9fe;
      box-shadow: 0 0 0 6px rgba(167,139,250,0.20);
      margin-bottom: 18px;
      animation: welcome-pop 420ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .welcome-joined-avatar-wrap > span {
      width: 66px !important;
      height: 66px !important;
      font-size: 40px !important;
    }
    .welcome-joined-title {
      margin: 0 0 8px;
      font-family: 'Fraunces', Georgia, serif;
      font-size: 22px;
      font-weight: 600;
      color: #111;
      letter-spacing: -0.3px;
    }
    .welcome-joined-sub {
      margin: 0 0 20px;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.55;
    }
    .welcome-joined-name {
      color: #4338ca;
      font-weight: 600;
    }
    .welcome-continue-btn {
      width: 100%;
      padding: 14px 16px;
      background: #111;
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 120ms;
      font-family: inherit;
      letter-spacing: -0.1px;
    }
    .welcome-continue-btn:hover { background: #333; }

    @media (max-width: 520px) {
      .welcome-body { padding: 22px 20px 0; }
      .welcome-joined-body { padding: 32px 20px 8px; }
      .welcome-footer { padding: 10px 20px 18px; }
      .welcome-card h2 { font-size: 20px; }
      .welcome-joined-title { font-size: 19px; }
    }
  `;
  document.head.appendChild(style);
}

function writeClipboardFallback(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function copyToClipboard(text: string, btn: HTMLButtonElement): void {
  const markCopied = () => {
    const original = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(markCopied).catch(() => {
      if (writeClipboardFallback(text)) markCopied();
    });
    return;
  }
  if (writeClipboardFallback(text)) markCopied();
}

// 静默拷贝：idle pill 点击时用，拷完不改按钮文案（按钮自己会整体切到 waiting 态）
function copyToClipboardSilent(text: string): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      writeClipboardFallback(text);
    });
    return;
  }
  writeClipboardFallback(text);
}

function dismiss(overlay: HTMLElement, cleanup: () => void): void {
  overlay.classList.add('dismissing');
  setTimeout(() => overlay.remove(), 150);
  cleanup();
  // welcome=1 一次性参数，关弹窗时从 URL 去掉
  const url = new URL(window.location.href);
  if (url.searchParams.has('welcome')) {
    url.searchParams.delete('welcome');
    window.history.replaceState({}, '', url.toString());
  }
}

function readCurrentAgentCount(): { count: number; first?: { id: string; name: string } } {
  try {
    const proof = (window as any).proof;
    if (proof?.getConnectedAgentCount && typeof proof.getConnectedAgentCount === 'function') {
      const info = proof.getConnectedAgentCount();
      if (info && typeof info === 'object' && typeof info.count === 'number') {
        return info as { count: number; first?: { id: string; name: string } };
      }
      if (typeof info === 'number') return { count: info };
    }
  } catch {
    // ignore
  }
  return { count: 0 };
}

function renderWaiting(card: HTMLElement, prompt: string, onSkip: () => void, onClose: () => void): void {
  card.innerHTML = '';

  const close = document.createElement('button');
  close.className = 'welcome-close-btn';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', onClose);

  const body = document.createElement('div');
  body.className = 'welcome-body';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'welcome-eyebrow';
  eyebrow.textContent = '和你的 AI 一起写';

  const h2 = document.createElement('h2');
  h2.textContent = '把你的 Agent 请进来';

  const sub = document.createElement('p');
  sub.className = 'welcome-subtitle';
  sub.textContent = '点下面的「邀请 Agent」就把 prompt 复制好。把它粘给 Claude Code / Cursor / ChatGPT 或任何能发 HTTP 的 AI 工具，弹窗会等它加入。';

  const promptBox = document.createElement('div');
  promptBox.className = 'welcome-prompt-box';
  promptBox.textContent = prompt;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'welcome-prompt-copy-btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => copyToClipboard(prompt, copyBtn));
  promptBox.appendChild(copyBtn);

  const subhint = document.createElement('div');
  subhint.className = 'welcome-subhint';
  subhint.textContent = 'Agent 加入后会在聊天里回你一句确认，然后你告诉它要改什么。';

  // pill 状态机：idle（可点，默认）→ waiting（已点，旋转等加入）
  // idle 态故意做成 <button>，既有 cursor:pointer，也能被键盘 focus
  const pill = document.createElement('button');
  pill.className = 'welcome-primary-pill idle';
  pill.type = 'button';
  pill.setAttribute('aria-label', '邀请 Agent — 点击复制 prompt');
  // 简单向下箭头图标，和文案一起，视觉暗示"点这个"
  pill.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="10" height="13" rx="2"/><path d="M9 7h2M9 11h2"/></svg><span>邀请 Agent（复制 prompt）</span>';

  let activated = false;
  const activate = () => {
    if (activated) return;
    activated = true;
    copyToClipboardSilent(prompt);
    // 复用已有 waiting 样式：换 class + 换内容，不重新挂 DOM，避免闪烁
    pill.classList.remove('idle');
    pill.classList.add('waiting');
    pill.disabled = true;
    pill.innerHTML = '';
    const spinner = document.createElement('span');
    spinner.className = 'welcome-primary-spinner';
    const pillText = document.createElement('span');
    pillText.textContent = '已复制 · 邀请中…';
    pill.append(spinner, pillText);
  };
  pill.addEventListener('click', activate);

  body.append(eyebrow, h2, sub, promptBox, subhint, pill);

  const footer = document.createElement('div');
  footer.className = 'welcome-footer';
  const skip = document.createElement('button');
  skip.className = 'welcome-skip-btn';
  skip.type = 'button';
  skip.textContent = 'Skip';
  skip.addEventListener('click', onSkip);
  const hint = document.createElement('div');
  hint.className = 'welcome-hint';
  hint.textContent = '之后可以从顶栏 ⋯ 菜单里的「邀请 Agent」重新打开。';
  footer.append(skip, hint);

  card.append(close, body, footer);
}

function renderJoined(
  card: HTMLElement,
  agent: { id: string; name: string },
  onContinue: () => void,
  onClose: () => void,
): void {
  card.innerHTML = '';

  const close = document.createElement('button');
  close.className = 'welcome-close-btn';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', onClose);

  const body = document.createElement('div');
  body.className = 'welcome-joined-body';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'welcome-joined-avatar-wrap';
  avatarWrap.appendChild(createAnimalAvatarEl(agent.id, 66));

  const h2 = document.createElement('h2');
  h2.className = 'welcome-joined-title';
  h2.textContent = 'AI 协作者已加入';

  const sub = document.createElement('p');
  sub.className = 'welcome-joined-sub';
  const namePart = document.createElement('span');
  namePart.className = 'welcome-joined-name';
  namePart.textContent = agent.name || agent.id;
  sub.append(namePart, document.createTextNode(' 已连上文档。可以开始协作了。'));

  const btn = document.createElement('button');
  btn.className = 'welcome-continue-btn';
  btn.type = 'button';
  btn.textContent = '继续写作';
  btn.addEventListener('click', onContinue);

  body.append(avatarWrap, h2, sub, btn);

  const footer = document.createElement('div');
  footer.className = 'welcome-footer';
  const hint = document.createElement('div');
  hint.className = 'welcome-hint';
  hint.textContent = '之后可以从顶栏 ⋯ 菜单里的「邀请 Agent」重新打开。';
  footer.appendChild(hint);

  card.append(close, body, footer);
}

export function showWelcomeCard(options: ShowOptions = {}): void {
  if (document.getElementById('welcome-overlay')) return;
  injectStyles();

  const docUrl = buildDocUrl();
  const prompt = buildPromptWithUrls(docUrl);

  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';

  const card = document.createElement('div');
  card.className = 'welcome-card';
  card.style.position = 'relative';

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let currentState: 'waiting' | 'joined' = 'waiting';

  const onPresence = (ev: Event) => {
    const detail = (ev as CustomEvent<AgentsChangedDetail>).detail;
    if (!detail) return;
    if (currentState === 'waiting' && detail.count > 0 && detail.first) {
      currentState = 'joined';
      renderJoined(card, detail.first, onContinue, onClose);
    }
  };

  const cleanup = () => {
    window.removeEventListener(EVENT_NAME, onPresence as EventListener);
  };

  const onSkip = () => dismiss(overlay, cleanup);
  const onClose = () => dismiss(overlay, cleanup);
  const onContinue = () => dismiss(overlay, cleanup);

  renderWaiting(card, prompt, onSkip, onClose);

  // 挂载就主动查一次当前 presence —— 手动重开时可能 agent 已经在了
  const initial = readCurrentAgentCount();
  if (initial.count > 0 && initial.first) {
    currentState = 'joined';
    renderJoined(card, initial.first, onContinue, onClose);
  }

  window.addEventListener(EVENT_NAME, onPresence as EventListener);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismiss(overlay, cleanup);
  });

  // 标记 options.reopen 未使用也没关系，保留签名方便未来扩展
  void options.reopen;
}

export function maybeShowWelcomeCard(): void {
  let url: URL | null = null;
  try {
    url = new URL(window.location.href);
  } catch {
    return;
  }
  if (url.searchParams.get('welcome') !== '1') return;
  showWelcomeCard();
}
