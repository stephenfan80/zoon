type CollabIntroOptions = {
  onInvite: () => void;
  onWriteFirst?: () => void;
};

function hasWelcomeFlag(): boolean {
  try {
    return new URL(window.location.href).searchParams.get('welcome') === '1';
  } catch {
    return false;
  }
}

function clearWelcomeFlag(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('welcome')) return;
    url.searchParams.delete('welcome');
    window.history.replaceState({}, '', url.toString());
  } catch {
    // best-effort only
  }
}

function injectStyles(): void {
  if (document.getElementById('collab-intro-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'collab-intro-card-styles';
  style.textContent = `
    @keyframes collab-intro-in {
      from { opacity: 0; transform: translate(-50%, 16px) scale(0.98); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
    #collab-intro-card {
      position: fixed;
      top: 128px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 850;
      width: min(560px, calc(100vw - 32px));
      border: 1px solid rgba(232, 225, 209, 0.95);
      border-radius: 22px;
      background:
        radial-gradient(circle at 12% 18%, rgba(136, 194, 160, 0.18), transparent 34%),
        radial-gradient(circle at 88% 4%, rgba(185, 165, 232, 0.22), transparent 30%),
        #fcfaf2;
      box-shadow: 0 24px 64px rgba(43, 42, 34, 0.16), 0 5px 18px rgba(74, 93, 58, 0.10);
      color: #2b2a22;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: collab-intro-in 260ms cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    #collab-intro-card::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(rgba(74, 93, 58, 0.035) 1px, transparent 1px);
      background-size: 100% 11px;
      opacity: 0.55;
    }
    .collab-intro-body {
      position: relative;
      padding: 30px 32px 26px;
    }
    .collab-intro-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: #4a5d3a;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .collab-intro-eyebrow::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(90deg, #88c2a0 0 50%, #b9a5e8 50% 100%);
      box-shadow: 0 0 0 4px rgba(136, 194, 160, 0.16);
    }
    #collab-intro-card h2 {
      margin: 0 0 10px;
      color: #2b2a22;
      font-family: 'Fraunces', Georgia, serif;
      font-size: 28px;
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.5px;
    }
    .collab-intro-copy {
      margin: 0 0 18px;
      color: #716c5f;
      font-size: 14.5px;
      line-height: 1.65;
    }
    .collab-intro-points {
      display: grid;
      gap: 10px;
      margin: 0 0 22px;
      padding: 0;
      list-style: none;
    }
    .collab-intro-points li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: #3f3b31;
      font-size: 13.5px;
      line-height: 1.55;
    }
    .collab-intro-chip {
      flex: 0 0 auto;
      min-width: 38px;
      margin-top: 1px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
    }
    .collab-intro-chip.human {
      background: rgba(136, 194, 160, 0.26);
      color: #2f5d3d;
    }
    .collab-intro-chip.ai {
      background: rgba(185, 165, 232, 0.30);
      color: #5b4a91;
    }
    .collab-intro-chip.edit {
      background: rgba(232, 201, 125, 0.32);
      color: #755719;
    }
    .collab-intro-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .collab-intro-primary,
    .collab-intro-secondary {
      min-height: 42px;
      border-radius: 999px;
      border: none;
      padding: 0 18px;
      cursor: pointer;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 700;
    }
    .collab-intro-primary {
      background: #4a5d3a;
      color: #fff;
      box-shadow: 0 4px 0 #2f3d25;
    }
    .collab-intro-primary:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #2f3d25;
    }
    .collab-intro-secondary {
      background: rgba(43, 42, 34, 0.06);
      color: #5f594e;
    }
    .collab-intro-secondary:hover {
      background: rgba(43, 42, 34, 0.10);
      color: #2b2a22;
    }
    @media (max-width: 640px) {
      #collab-intro-card {
        top: 96px;
        width: calc(100vw - 24px);
        border-radius: 18px;
      }
      .collab-intro-body {
        padding: 24px 20px 22px;
      }
      #collab-intro-card h2 {
        font-size: 23px;
      }
      .collab-intro-primary,
      .collab-intro-secondary {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function dismiss(card: HTMLElement, clearFlag: boolean): void {
  card.remove();
  if (clearFlag) clearWelcomeFlag();
}

export function maybeShowCollabIntroCard(options: CollabIntroOptions): boolean {
  if (!hasWelcomeFlag()) return false;
  if (document.getElementById('collab-intro-card')) return true;
  if (document.getElementById('welcome-overlay')) return true;
  injectStyles();

  const card = document.createElement('section');
  card.id = 'collab-intro-card';
  card.setAttribute('aria-label', 'Zoon collaboration introduction');
  card.innerHTML = `
    <div class="collab-intro-body">
      <div class="collab-intro-eyebrow">Human + AI document</div>
      <h2>这是你和 AI 一起写的文档</h2>
      <p class="collab-intro-copy">先在这里建立共同工作区：你负责方向，AI 负责补充内容。每段文字都会保留作者身份，所以协作不会变成一团看不清的改稿。</p>
      <ul class="collab-intro-points">
        <li><span class="collab-intro-chip human">人类</span><span>你写的会保留人类身份。</span></li>
        <li><span class="collab-intro-chip ai">AI</span><span>AI 新写内容会显示为紫色。</span></li>
        <li><span class="collab-intro-chip edit">控制</span><span>不喜欢的 AI 段落可以直接改或删。</span></li>
      </ul>
      <div class="collab-intro-actions">
        <button type="button" class="collab-intro-primary">邀请 Agent</button>
        <button type="button" class="collab-intro-secondary">先自己写</button>
      </div>
    </div>
  `;

  const invite = card.querySelector('.collab-intro-primary') as HTMLButtonElement | null;
  const writeFirst = card.querySelector('.collab-intro-secondary') as HTMLButtonElement | null;
  invite?.addEventListener('click', () => {
    dismiss(card, false);
    options.onInvite();
  });
  writeFirst?.addEventListener('click', () => {
    dismiss(card, true);
    options.onWriteFirst?.();
  });

  document.body.appendChild(card);
  return true;
}
