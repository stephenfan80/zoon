/**
 * Zoon 首页（人类入口）
 *
 * 服务端直接返回完整 HTML，不走 Vite 构建。零依赖，方便独立维护。
 * 视觉方向：Playful Organic — 暖米底 + 橄榄绿 accent + 软彩色点缀。
 * 双色溯源：绿 #88c2a0（人类） / 紫 #b9a5e8（AI）。
 *
 * 创建文档走 POST /api/public/documents（无鉴权、IP 限速），成功后跳转到
 * /d/<slug>?token=...&welcome=1，由 src/ui/collab-intro-card.ts 先展示协作引导。
 */

export const HOMEPAGE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  html { overflow-x: hidden; }
  :root {
    --bg: #f4f0e7;
    --surface: #fcfaf2;
    --ink: #2b2a22;
    --muted: #716c5f;
    --accent: #4a5d3a;
    --accent-dark: #2f3d25;
    --human: #88c2a0;
    --ai: #b9a5e8;
    --coral: #e8a17d;
    --gold: #e8c97d;
    --line: #e8e1d1;
  }
  body {
    font-family: 'Plus Jakarta Sans', ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    position: relative;
    overflow-x: hidden;
  }
  body::before {
    content: ''; position: absolute; top: -100px; left: -120px;
    width: 360px; height: 360px;
    background: radial-gradient(circle, var(--human) 0%, transparent 70%);
    opacity: .22; border-radius: 50%; pointer-events: none; z-index: 0;
  }
  body::after {
    content: ''; position: absolute; top: 520px; right: -140px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, var(--ai) 0%, transparent 70%);
    opacity: .18; border-radius: 50%; pointer-events: none; z-index: 0;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { color: var(--accent-dark); }
  main, header, footer { position: relative; z-index: 1; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 28px; }

  header {
    z-index: 1300;
    display: flex; justify-content: space-between; align-items: center;
    padding: 24px 28px; max-width: 1080px; margin: 0 auto;
  }
  .logo {
    font-family: 'Fraunces', "Iowan Old Style", Georgia, serif;
    font-size: 24px; font-weight: 600; letter-spacing: -0.8px; color: var(--ink);
  }
  .logo-dot { color: var(--accent); font-style: italic; }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  nav.top-nav { display: flex; gap: 22px; font-size: 14px; }
  nav.top-nav a { color: var(--muted); font-weight: 500; }
  nav.top-nav a:hover { color: var(--ink); }
  .home-account {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .home-account-trigger {
    min-height: 38px;
    padding: 0 16px;
    border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 86%, white);
    color: var(--accent-dark);
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 0 color-mix(in srgb, var(--accent) 18%, transparent);
  }
  .home-account-trigger:hover {
    background: #fff;
    color: var(--ink);
  }
  .home-account-trigger[disabled] {
    opacity: .72;
    cursor: wait;
  }
  .home-account-panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: min(360px, calc(100vw - 32px));
    max-height: min(520px, calc(100vh - 110px));
    overflow-y: auto;
    background: #24231d;
    color: #f4f0e7;
    border: 1px solid rgba(244, 240, 231, .12);
    border-radius: 16px;
    box-shadow: 0 22px 50px rgba(43, 42, 34, .28);
    padding: 10px;
    z-index: 1200;
  }
  .home-account-panel[hidden] { display: none; }
  body.home-auth-open { overflow: hidden; }
  .home-auth-modal {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: start center;
    padding: clamp(72px, 12vh, 128px) 20px 32px;
    z-index: 1600;
  }
  .home-auth-modal[hidden] { display: none; }
  .home-auth-backdrop {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(circle at 78% 18%, rgba(136, 194, 160, .22), transparent 34%),
      rgba(36, 35, 29, .42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .home-auth-card {
    position: relative;
    width: min(430px, calc(100vw - 40px));
    border: 1px solid rgba(36, 35, 29, .10);
    border-radius: 24px;
    background: color-mix(in srgb, var(--surface) 96%, white);
    box-shadow: 0 34px 90px rgba(43, 42, 34, .32);
    padding: 24px;
    color: var(--ink);
  }
  .home-auth-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 34px;
    height: 34px;
    border: 1px solid rgba(36, 35, 29, .10);
    border-radius: 999px;
    background: rgba(255,255,255,.58);
    color: var(--muted);
    cursor: pointer;
    font: inherit;
    font-size: 20px;
    line-height: 1;
  }
  .home-auth-close:hover { color: var(--ink); background: #fff; }
  .home-auth-eyebrow {
    color: var(--accent-dark);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .home-auth-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 34px;
    line-height: 1.05;
    margin: 0 44px 8px 0;
    letter-spacing: 0;
  }
  .home-auth-copy {
    margin: 0 0 18px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.65;
  }
  .home-auth-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px;
    margin-bottom: 16px;
    border: 1px solid rgba(36, 35, 29, .10);
    border-radius: 16px;
    background: rgba(36, 35, 29, .04);
  }
  .home-auth-tab {
    min-height: 38px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }
  .home-auth-tab.is-active {
    background: #fff;
    color: var(--ink);
    box-shadow: 0 2px 10px rgba(43, 42, 34, .08);
  }
  .home-auth-form {
    display: grid;
    gap: 12px;
  }
  .home-auth-field {
    display: grid;
    gap: 6px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }
  .home-auth-field input {
    width: 100%;
    min-height: 46px;
    border: 1px solid rgba(36, 35, 29, .14);
    border-radius: 14px;
    background: #fff;
    color: var(--ink);
    padding: 0 13px;
    font: inherit;
    font-size: 14px;
    outline: none;
    box-shadow: 0 1px 0 rgba(36, 35, 29, .04);
  }
  .home-auth-field input:focus {
    border-color: color-mix(in srgb, var(--accent) 70%, #fff);
    box-shadow: 0 0 0 4px rgba(136, 194, 160, .18);
  }
  .home-auth-status {
    min-height: 18px;
    color: #9b3f2f;
    font-size: 12px;
    line-height: 1.45;
  }
  .home-auth-primary {
    min-height: 48px;
    border: 0;
    border-radius: 16px;
    background: var(--accent-dark);
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-size: 15px;
    font-weight: 900;
    box-shadow: 0 5px 0 rgba(47, 78, 40, .28);
  }
  .home-auth-primary:hover { transform: translateY(-1px); }
  .home-auth-primary[disabled] {
    opacity: .7;
    cursor: wait;
    transform: none;
  }
  .home-auth-foot {
    margin-top: 14px;
    display: flex;
    justify-content: center;
    gap: 6px;
    color: var(--muted);
    font-size: 13px;
  }
  .home-auth-link {
    border: 0;
    background: transparent;
    color: var(--accent-dark);
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    padding: 0;
  }
  .home-account-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 10px 12px;
  }
  .home-account-name {
    font-size: 13px;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .home-account-email {
    color: rgba(244, 240, 231, .56);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .home-account-logout {
    flex-shrink: 0;
    border: 1px solid rgba(244, 240, 231, .18);
    border-radius: 999px;
    background: transparent;
    color: rgba(244, 240, 231, .78);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 10px;
  }
  .home-account-new {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    border-radius: 12px;
    background: rgba(136, 194, 160, .18);
    color: #d7f1df;
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 8px;
  }
  .home-account-new:hover { color: #fff; background: rgba(136, 194, 160, .25); }
  .home-account-label {
    color: rgba(244, 240, 231, .54);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .05em;
    text-transform: uppercase;
    padding: 4px 10px 6px;
  }
  .home-doc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-radius: 12px;
    color: #f4f0e7;
    padding: 10px;
  }
  .home-doc-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    flex: 1 1 auto;
    color: inherit;
    text-decoration: none;
  }
  .home-doc-row:hover {
    color: #fff;
    background: rgba(244, 240, 231, .08);
  }
  .home-doc-action {
    flex-shrink: 0;
    border: 1px solid rgba(244, 240, 231, .16);
    background: rgba(244, 240, 231, .06);
    color: rgba(244, 240, 231, .70);
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 800;
    font-family: inherit;
    cursor: pointer;
  }
  .home-doc-action:hover { background: rgba(244, 240, 231, .12); }
  .home-doc-action.danger {
    border-color: rgba(248, 113, 113, .36);
    background: rgba(127, 29, 29, .22);
    color: rgba(254, 202, 202, .96);
  }
  .home-doc-action.danger:hover { background: rgba(127, 29, 29, .38); }
  .home-doc-title {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
  }
  .home-doc-meta,
  .home-doc-time,
  .home-account-status {
    color: rgba(244, 240, 231, .56);
    font-size: 11px;
    font-weight: 500;
  }
  .home-account-status {
    padding: 10px;
    line-height: 1.5;
  }
  .home-account-login {
    width: 100%;
    min-height: 42px;
    border: 0;
    border-radius: 12px;
    background: #fff;
    color: #24231d;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }
  .home-account-form {
    display: grid;
    gap: 8px;
  }
  .home-account-form input {
    width: 100%;
    min-height: 38px;
    border: 1px solid rgba(244, 240, 231, .14);
    border-radius: 10px;
    background: rgba(244, 240, 231, .08);
    color: #f4f0e7;
    padding: 0 10px;
    font: inherit;
    font-size: 13px;
    outline: none;
  }
  .home-account-form input::placeholder { color: rgba(244, 240, 231, .44); }
  .home-account-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .home-account-secondary {
    min-height: 42px;
    border: 1px solid rgba(244, 240, 231, .16);
    border-radius: 12px;
    background: rgba(244, 240, 231, .10);
    color: #f4f0e7;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }

  /* ================ HERO ================ */
  .hero {
    display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 52px;
    align-items: center; padding: 42px 0 52px;
  }
  .hero > * { min-width: 0; }
  .hero-left h1 {
    font-family: 'Fraunces', "Iowan Old Style", Georgia, serif;
    font-size: 64px; font-weight: 500; letter-spacing: 0; line-height: 1.02;
    margin-bottom: 22px; color: var(--ink);
  }
  .hero-left h1 em {
    font-style: italic; color: var(--accent); font-weight: 500;
    background: linear-gradient(120deg, transparent 0%, transparent 50%, rgba(136, 194, 160, .4) 50%, rgba(136, 194, 160, .4) 95%, transparent 95%);
    padding: 0 4px;
  }
  .hero-left p.subtitle {
    font-size: 17px; color: var(--muted); line-height: 1.6;
    margin-bottom: 30px; max-width: 440px;
  }
  .ctas { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  button.primary, a.primary {
    background: var(--accent); color: #fff; border: none;
    padding: 14px 26px; font-size: 15px; font-weight: 600;
    border-radius: 999px; cursor: pointer;
    font-family: inherit; letter-spacing: -0.1px;
    box-shadow: 0 5px 0 var(--accent-dark);
    transition: transform 120ms ease, box-shadow 120ms ease, background 150ms ease;
    display: inline-flex; align-items: center; gap: 8px;
  }
  button.primary:hover, a.primary:hover { background: var(--accent-dark); color: #fff; }
  button.primary:active, a.primary:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--accent-dark); }
  button.primary[disabled] { background: #8a9b80; cursor: wait; box-shadow: 0 3px 0 #5f6b56; }
  a.secondary {
    color: var(--accent); font-size: 14px; font-weight: 500;
    text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px;
  }
  a.secondary:hover { color: var(--accent-dark); }

  /* ================ MINI EDITOR DEMO ================ */
  .mini-editor {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(74, 93, 58, .18), 0 6px 16px rgba(74, 93, 58, .08);
    overflow: hidden; position: relative;
    transition: transform .25s ease, box-shadow .25s ease;
  }
  .mini-editor:hover {
    transform: translateY(-3px);
    box-shadow: 0 28px 72px rgba(74, 93, 58, .22), 0 8px 20px rgba(74, 93, 58, .1);
  }
  .mini-editor .chrome {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 18px; border-bottom: 1px dashed var(--line);
    background: rgba(232, 225, 209, .35);
  }
  .mini-editor .chrome .dot { width: 11px; height: 11px; border-radius: 50%; }
  .mini-editor .chrome .dot:nth-child(1) { background: var(--coral); }
  .mini-editor .chrome .dot:nth-child(2) { background: var(--gold); }
  .mini-editor .chrome .dot:nth-child(3) { background: var(--human); }
  .mini-editor .chrome .title {
    margin-left: 12px; font-size: 13px; color: var(--muted); font-style: italic;
  }
  .mini-editor .status-pill {
    position: absolute; top: 62px; right: 20px; z-index: 3;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 12px; border-radius: 999px;
    background: rgba(255, 255, 255, .94);
    border: 1px solid var(--line);
    box-shadow: 0 4px 12px rgba(74, 93, 58, .1);
    font-size: 12px; font-weight: 500; color: var(--muted);
  }
  .mini-editor .status-pill::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: var(--human);
    box-shadow: 0 0 0 3px rgba(136, 194, 160, .3);
    animation: pulse-dot 2.2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { box-shadow: 0 0 0 3px rgba(136, 194, 160, .3); }
    50% { box-shadow: 0 0 0 5px rgba(136, 194, 160, .5); }
  }
  .mini-editor .doc {
    padding: 32px 34px 30px; min-height: 360px; position: relative;
  }
  .mini-editor p.para {
    position: relative; padding-left: 16px; margin-bottom: 16px;
    font-size: 17px; line-height: 1.75; color: var(--ink);
  }
  .mini-editor p.para::before {
    content: ''; position: absolute; left: 0; top: 4px; bottom: 4px;
    width: 4px; border-radius: 3px;
  }
  .mini-editor p.h {
    font-family: 'Fraunces', "Iowan Old Style", Georgia, serif;
    font-weight: 600; font-size: 26px; letter-spacing: -0.5px;
    margin-bottom: 18px; line-height: 1.25;
  }
  .mini-editor p.h::before { background: var(--human); top: 6px; bottom: 6px; }
  .mini-editor p.human::before { background: var(--human); }
  .mini-editor p.ai::before { background: var(--ai); }
  .mini-editor .editing { position: relative; }
  .mini-editor .editing .text-original,
  .mini-editor .editing .text-new { display: inline-block; }
  .mini-editor .editing .text-new {
    opacity: 0; position: absolute; top: 0; left: 16px; right: 0;
  }
  .mini-editor .comment-card {
    margin-top: 20px; padding: 14px 16px;
    background: #2b2a22; color: #f4f0e7;
    border-radius: 12px;
    box-shadow: 0 10px 24px rgba(43, 42, 34, .35), 0 2px 6px rgba(43, 42, 34, .2);
    opacity: 0; transform: translateY(8px);
  }
  .mini-editor .comment-card .c-row {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 10px 0;
  }
  .mini-editor .comment-card .c-row + .c-row {
    border-top: 1px solid rgba(244, 240, 231, .08);
  }
  .mini-editor .comment-card .c-avatar {
    flex: 0 0 26px; width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; line-height: 1; letter-spacing: 0.3px;
  }
  .mini-editor .comment-card .c-row.human .c-avatar {
    background: var(--human); color: #1f3526;
  }
  .mini-editor .comment-card .c-row.ai .c-avatar {
    background: var(--ai); color: #3a2d5c;
  }
  .mini-editor .comment-card .c-body { flex: 1; min-width: 0; }
  .mini-editor .comment-card .c-author {
    font-size: 11.5px; font-weight: 600; margin-bottom: 4px;
    color: rgba(244, 240, 231, .65);
    display: inline-flex; align-items: center; gap: 6px;
  }
  .mini-editor .comment-card .c-badge {
    display: inline-block; padding: 1px 6px; border-radius: 4px;
    background: rgba(185, 165, 232, .28); color: #d7c6f7;
    font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  }
  .mini-editor .comment-card .c-text {
    font-size: 13.5px; line-height: 1.6; color: #f4f0e7;
  }
  .mini-editor .comment-card .c-text strong { color: #b7e6c7; font-weight: 600; }
  .mini-editor .comment-card .c-actions {
    margin-top: 10px; display: flex; gap: 8px; align-items: center;
  }
  .mini-editor .comment-card .c-caption {
    margin-top: 8px; font-size: 11px;
    color: rgba(244, 240, 231, .45); letter-spacing: 0.3px;
  }
  .mini-editor .comment-card .ack-btn {
    padding: 6px 16px; border-radius: 999px;
    background: var(--accent); color: #fff;
    font-size: 12px; font-weight: 700; letter-spacing: 0.8px;
    box-shadow: 0 3px 0 var(--accent-dark), 0 4px 12px rgba(74, 93, 58, .4);
    display: inline-block; line-height: 1.4;
  }
  .mini-editor .comment-card .reject-btn {
    padding: 6px 10px; border-radius: 999px;
    background: rgba(244, 240, 231, .08);
    color: rgba(244, 240, 231, .55);
    font-size: 12px; font-weight: 500;
    display: inline-block; line-height: 1.4;
  }
  .mini-editor.first-run-demo {
    overflow: visible;
  }
  .mini-editor.first-run-demo .doc {
    min-height: 0;
    padding: 28px 32px 34px;
    overflow: hidden;
  }
  .mini-editor.first-run-demo::after {
    content: '';
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: -18px;
    height: 28px;
    border-radius: 50%;
    background: rgba(43, 42, 34, .12);
    filter: blur(18px);
    z-index: -1;
  }
  .hero-story-scene {
    position: relative;
    min-height: 0;
    padding: 0;
    overflow: hidden;
    display: block;
  }
  .hero-story-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgba(255, 255, 255, .72);
    padding: 7px 11px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 18px;
  }
  .hero-story-status::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--human);
    box-shadow: 0 0 0 5px rgba(136, 194, 160, .20);
    animation: hero-status-pulse 8s ease-in-out infinite;
  }
  .role-cast {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 42px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }
  .role-card {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: rgba(255,255,255,.74);
    padding: 9px 10px;
    box-shadow: 0 8px 18px rgba(74, 93, 58, .08);
  }
  .role-card.human {
    border-color: rgba(136, 194, 160, .46);
    background: rgba(136, 194, 160, .12);
  }
  .role-card.agent {
    border-color: rgba(185, 165, 232, .48);
    background: rgba(185, 165, 232, .12);
  }
  .role-card b {
    display: block;
    color: var(--ink);
    font-size: 12px;
    line-height: 1.15;
  }
  .role-card span:not(.role-avatar) {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
  }
  .role-avatar {
    position: relative;
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: #fffdf7;
    box-shadow: inset 0 0 0 1px rgba(43, 42, 34, .08);
  }
  .role-avatar.human::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 7px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #f3dcc4;
    box-shadow: 0 0 0 3px rgba(136, 194, 160, .22);
  }
  .role-avatar.human::after {
    content: '';
    position: absolute;
    left: 9px;
    bottom: 7px;
    width: 20px;
    height: 11px;
    border-radius: 12px 12px 7px 7px;
    background: var(--human);
  }
  .role-avatar.agent {
    background: linear-gradient(145deg, rgba(185, 165, 232, .28), #fffdf7 62%);
  }
  .role-avatar.agent::before {
    content: '';
    position: absolute;
    left: 9px;
    top: 10px;
    width: 20px;
    height: 15px;
    border-radius: 6px;
    border: 2px solid #6b5aa8;
    background: rgba(255,255,255,.62);
  }
  .role-avatar.agent::after {
    content: '>_';
    position: absolute;
    left: 12px;
    top: 13px;
    color: #6b5aa8;
    font-family: "SF Mono", SFMono-Regular, Menlo, monospace;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: -.08em;
  }
  .role-connector {
    position: relative;
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--human), var(--ai));
  }
  .role-connector::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #fff;
    border: 2px solid var(--ai);
    transform: translate(-1px, -50%);
    animation: role-dot-travel 8s ease-in-out infinite;
  }
  @keyframes role-dot-travel {
    0%, 24% { left: 0; border-color: var(--human); }
    34%, 60% { left: calc(100% - 6px); border-color: var(--ai); }
    70%, 100% { left: calc(100% - 6px); border-color: var(--ai); }
  }
  .hero-story-doc {
    position: relative;
    border: 1px solid rgba(232, 225, 209, .96);
    border-radius: 22px;
    background:
      linear-gradient(rgba(232, 225, 209, .16) 1px, transparent 1px),
      #fffdf7;
    background-size: 100% 30px;
    height: 360px;
    min-height: 0;
    overflow: hidden;
  }
  .hero-story-content {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 560px;
    z-index: 1;
    transform: translateY(0);
    transform-origin: top left;
    animation: hero-story-scroll 10s cubic-bezier(.45,0,.25,1) infinite;
  }
  .hero-story-doc::before {
    content: '';
    position: absolute;
    left: 13px;
    top: 20px;
    bottom: 20px;
    width: 5px;
    border-radius: 999px;
    background: linear-gradient(var(--human) 0 30%, var(--ai) 30% 62%, var(--human) 62% 76%, var(--ai) 76% 100%);
    box-shadow: 0 0 0 5px rgba(136, 194, 160, .08);
    z-index: 2;
  }
  .hero-story-doc::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255,253,247,0) 0, rgba(255,253,247,0) calc(100% - 58px), rgba(255,253,247,.92) 100%);
    z-index: 3;
  }
  .hero-story-title {
    position: absolute;
    z-index: 1;
    left: 28px;
    right: 18px;
    top: 15px;
    margin: 0;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 21px;
    line-height: 1.12;
    font-weight: 600;
    color: var(--ink);
  }
  .hero-doc-block,
  .hero-story-line {
    position: absolute;
    z-index: 1;
    width: min(410px, 100%);
    border-radius: 12px;
    padding: 10px 12px;
    color: var(--ink);
    font-size: 11.5px;
    line-height: 1.42;
    box-shadow: inset 0 0 0 1px rgba(43, 42, 34, .04);
  }
  .hero-doc-block.human,
  .hero-story-line.human {
    background: rgba(136, 194, 160, .18);
  }
  .hero-doc-block.agent,
  .hero-story-line.agent {
    background: rgba(185, 165, 232, .18);
  }
  .hero-doc-block.agent {
    margin-left: auto;
  }
  .hero-idea-card {
    left: 28px;
    top: 76px;
    width: calc(100% - 48px);
    max-width: 430px;
  }
  .hero-speaker-tag {
    display: inline-block;
    margin-bottom: 4px;
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 9px;
    font-weight: 900;
  }
  .hero-doc-block.human .hero-speaker-tag { background: rgba(136, 194, 160, .28); color: #2f5d3d; }
  .hero-doc-block.agent .hero-speaker-tag { background: rgba(185, 165, 232, .30); color: #5b4a91; }
  .hero-typed-text {
    display: inline-block;
    max-width: 0;
    white-space: nowrap;
    overflow: hidden;
    vertical-align: bottom;
    animation: hero-human-type 10s steps(30, end) infinite;
  }
  .hero-typed-cursor {
    display: inline-block;
    width: 2px;
    height: 14px;
    margin-left: 2px;
    background: var(--accent);
    vertical-align: -2px;
    animation: blink 1s steps(2) infinite, hero-cursor-phase 10s ease-in-out infinite;
  }
  .hero-mini-invite {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 7px;
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font: inherit;
    font-size: 10px;
    font-weight: 900;
    padding: 5px 9px;
    box-shadow: 0 3px 0 var(--accent-dark);
    animation: hero-invite-pulse 10s ease-in-out infinite;
  }
  .hero-prompt-card {
    position: absolute;
    z-index: 1;
    left: 36px;
    top: 168px;
    width: min(370px, calc(100% - 72px));
    margin: 0;
    border-radius: 16px;
    background: #24231d;
    color: #f4f0e7;
    box-shadow: 0 18px 38px rgba(43, 42, 34, .28);
    padding: 10px 13px 11px;
    transform: translateY(18px) scale(.96);
    opacity: 0;
    animation: hero-prompt-in 10s cubic-bezier(.2,.7,.3,1) infinite;
  }
  .hero-prompt-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .hero-prompt-top b {
    flex: 1;
    font-size: 11px;
  }
  .hero-prompt-top span {
    border-radius: 999px;
    background: rgba(185, 165, 232, .24);
    color: #d7c6f7;
    font-size: 9px;
    font-weight: 800;
    padding: 3px 7px;
  }
  .hero-prompt-card code {
    display: block;
    color: #b7e6c7;
    font-family: "SF Mono", SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hero-outline {
    position: absolute;
    z-index: 1;
    right: 18px;
    top: 250px;
    width: min(420px, calc(100% - 54px));
    margin-left: 0;
    border: 1px solid rgba(185, 165, 232, .34);
    border-radius: 18px;
    background: rgba(255, 255, 255, .88);
    box-shadow: 0 16px 36px rgba(43, 42, 34, .14);
    padding: 11px 13px 10px;
    opacity: 0;
    transform: translateX(26px) scale(.96);
    animation: hero-outline-in 10s cubic-bezier(.2,.7,.3,1) infinite;
  }
  .hero-outline strong,
  .hero-final-draft strong {
    display: block;
    color: #6b5aa8;
    font-size: 9px;
    letter-spacing: .10em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .hero-outline p {
    margin: 0 0 3px;
    color: var(--ink);
    font-size: 11px;
    line-height: 1.36;
  }
  .hero-human-add {
    left: 36px;
    top: 386px;
    width: min(390px, calc(100% - 72px));
    margin-top: 0;
    opacity: 0;
    transform: translateY(10px);
    animation: hero-human-add-in 10s cubic-bezier(.2,.7,.3,1) infinite;
  }
  .hero-final-draft {
    position: absolute;
    z-index: 1;
    right: 18px;
    top: 464px;
    bottom: auto;
    width: min(430px, calc(100% - 54px));
    margin: 0;
    border-radius: 18px;
    border: 1px solid rgba(185, 165, 232, .34);
    background:
      linear-gradient(90deg, rgba(185, 165, 232, .20), rgba(255,255,255,.92));
    padding: 11px 13px;
    box-shadow: 0 18px 42px rgba(43, 42, 34, .16);
    opacity: 0;
    transform: translateY(18px) scale(.97);
    animation: hero-final-in 10s cubic-bezier(.2,.7,.3,1) infinite;
  }
  .hero-final-draft p {
    margin: 0;
    color: var(--ink);
    font-size: 11px;
    line-height: 1.42;
  }
  @keyframes hero-status-pulse {
    0%, 24% { background: var(--human); box-shadow: 0 0 0 5px rgba(136, 194, 160, .20); }
    30%, 58% { background: var(--ai); box-shadow: 0 0 0 5px rgba(185, 165, 232, .22); }
    64%, 76% { background: var(--human); box-shadow: 0 0 0 5px rgba(136, 194, 160, .20); }
    82%, 100% { background: var(--ai); box-shadow: 0 0 0 5px rgba(185, 165, 232, .22); }
  }
  @keyframes hero-human-type {
    0%, 8% { max-width: 0; }
    24%, 100% { max-width: 31em; }
  }
  @keyframes hero-cursor-phase {
    0%, 26% { opacity: 1; }
    30%, 100% { opacity: 0; }
  }
  @keyframes hero-invite-pulse {
    0%, 20%, 100% { transform: translateY(0); box-shadow: 0 3px 0 var(--accent-dark); }
    26%, 32% { transform: translateY(-2px); box-shadow: 0 5px 0 var(--accent-dark); }
  }
  @keyframes hero-story-scroll {
    0%, 34% { transform: translateY(0); }
    47%, 58% { transform: translateY(-82px); }
    70%, 82% { transform: translateY(-152px); }
    94%, 100% { transform: translateY(-212px); }
  }
  @keyframes hero-prompt-in {
    0%, 26% { opacity: 0; transform: translateY(18px) scale(.96); }
    34%, 100% { opacity: .92; transform: translateY(0) scale(1); }
  }
  @keyframes hero-outline-in {
    0%, 36% { opacity: 0; transform: translateX(26px) scale(.96); }
    44%, 100% { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes hero-human-add-in {
    0%, 58% { opacity: 0; transform: translateY(10px); }
    66%, 100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes hero-final-in {
    0%, 72% { opacity: 0; transform: translateY(18px) scale(.97); }
    82%, 100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  .mini-editor .cursor {
    display: inline-block; width: 2px; height: 16px; vertical-align: -3px;
    background: var(--accent); margin-left: 2px;
    animation: blink 1s steps(2) infinite, cursor-hide 8s ease-in-out infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes cursor-hide { 0%, 35% { opacity: 1; } 40%, 100% { opacity: 0; } }

  .mini-editor .editing .text-original { animation: fadeout 8s ease-in-out infinite; }
  .mini-editor .editing .text-new { animation: fadein 8s ease-in-out infinite; }
  .mini-editor .editing::before { animation: bar 8s ease-in-out infinite; }
  .mini-editor .comment-card { animation: comment-pop 8s ease-in-out infinite; }
  .mini-editor .comment-card .ack-btn { animation: ack-pulse 8s ease-in-out infinite; transform-origin: center; }
  @keyframes fadeout {
    0%, 60% { opacity: 1; }
    65%, 100% { opacity: 0; }
  }
  @keyframes fadein {
    0%, 60% { opacity: 0; }
    70%, 100% { opacity: 1; }
  }
  @keyframes bar {
    0%, 60% { background: var(--human); }
    70%, 100% { background: var(--ai); }
  }
  @keyframes comment-pop {
    0%, 18% { opacity: 0; transform: translateY(8px); }
    25%, 92% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-6px); }
  }
  @keyframes ack-pulse {
    0%, 42% { transform: scale(1); box-shadow: 0 3px 0 var(--accent-dark), 0 4px 12px rgba(74, 93, 58, .4); }
    48% { transform: scale(1.12); box-shadow: 0 3px 0 var(--accent-dark), 0 6px 20px rgba(74, 93, 58, .6); }
    54%, 100% { transform: scale(1); box-shadow: 0 3px 0 var(--accent-dark), 0 4px 12px rgba(74, 93, 58, .4); }
  }

  /* ================ SCROLL REVEAL ================ */
  .reveal {
    opacity: 0; transform: translateY(24px);
    transition: opacity 600ms cubic-bezier(.2,.7,.3,1), transform 600ms cubic-bezier(.2,.7,.3,1);
    transition-delay: var(--reveal-delay, 0ms);
  }
  .reveal.is-visible { opacity: 1; transform: translateY(0); }
  @media (prefers-reduced-motion: reduce) {
    .reveal { opacity: 1; transform: none; transition: none; }
    .mini-editor .editing .text-original,
    .mini-editor .editing .text-new,
    .mini-editor .editing::before,
    .mini-editor .comment-card,
    .mini-editor .comment-card .ack-btn,
    .mini-editor .status-pill::before,
    .mini-editor .cursor { animation: none; }
    .mini-editor .editing .text-original { opacity: 1; }
    .mini-editor .editing .text-new { opacity: 0; }
    .mini-editor .comment-card { opacity: 1; transform: none; }
  }

  /* ================ SECTION HEADS ================ */
  .section-head {
    text-align: center; margin-bottom: 44px;
  }
  .section-head h2 {
    font-family: 'Fraunces', "Iowan Old Style", Georgia, serif;
    font-size: 38px; font-weight: 500; letter-spacing: -1px;
    color: var(--ink); margin-bottom: 10px;
  }
  .section-head p {
    font-size: 15px; color: var(--muted); max-width: 520px; margin: 0 auto;
  }

  /* ================ FEATURES ================ */
  .features {
    padding: 48px 0 40px;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px;
  }
  .feature {
    background: var(--surface); border: 1.5px solid var(--line);
    border-radius: 18px; padding: 28px 24px;
    transition: transform .2s ease, box-shadow .2s ease;
  }
  .feature:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(74, 93, 58, .12);
  }
  .feature .icon {
    width: 40px; height: 40px; border-radius: 12px;
    background: rgba(136, 194, 160, .2); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700; margin-bottom: 16px;
  }
  .feature:nth-child(2) .icon { background: rgba(185, 165, 232, .22); color: #6b5aa8; }
  .feature:nth-child(3) .icon { background: rgba(232, 161, 125, .22); color: #b5714f; }
  .feature h3 {
    font-size: 17px; font-weight: 600; margin-bottom: 4px; color: var(--ink);
    letter-spacing: -0.3px;
  }
  .feature .h-sub {
    font-size: 13px; color: var(--muted); font-style: italic; margin-bottom: 10px;
  }
  .feature p { font-size: 14px; color: var(--muted); line-height: 1.65; }

  /* ================ USE CASES ================ */
  .usecases { padding: 48px 0 40px; }
  .usecase-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .usecase {
    background: var(--surface); border: 1.5px solid var(--line);
    border-radius: 18px; padding: 26px 24px;
    transition: transform .2s ease, box-shadow .2s ease;
  }
  .usecase:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(74, 93, 58, .1);
  }
  .usecase .emoji { font-size: 30px; margin-bottom: 14px; line-height: 1; }
  .usecase h4 {
    font-size: 17px; font-weight: 600; margin-bottom: 10px; color: var(--ink);
    letter-spacing: -0.3px;
  }
  .usecase p.pain {
    font-size: 13px; color: var(--coral); margin-bottom: 6px; line-height: 1.55;
    font-weight: 500; filter: brightness(.72);
  }
  .usecase p.solve {
    font-size: 14px; color: var(--ink); line-height: 1.65;
  }

  /* ================ SCROLL STORY ================ */
  .story-section {
    padding: 66px 0 54px;
  }
  .story-shell {
    display: grid;
    grid-template-columns: minmax(280px, .78fr) minmax(0, 1.22fr);
    gap: 30px;
    align-items: start;
  }
  .story-steps {
    display: grid;
    gap: 16px;
  }
  .story-step {
    position: relative;
    min-height: 286px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: 1.5px solid var(--line);
    border-radius: 20px;
    background: rgba(252, 250, 242, .78);
    padding: 22px 22px 20px;
    opacity: .58;
    transform: scale(.985);
    transition: opacity .28s ease, transform .28s ease, border-color .28s ease, box-shadow .28s ease, background .28s ease;
  }
  .story-step.is-current {
    opacity: 1;
    transform: scale(1.03);
    border-color: rgba(136, 194, 160, .72);
    background: #fffdf7;
    box-shadow: 0 18px 42px rgba(74, 93, 58, .13);
  }
  .story-step-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--accent);
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 9px;
  }
  .story-step-kicker::before {
    content: attr(data-step-index);
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: rgba(136, 194, 160, .22);
    color: var(--accent-dark);
    font-size: 12px;
  }
  .story-step h3 {
    color: var(--ink);
    font-size: 20px;
    font-weight: 750;
    letter-spacing: 0;
    margin-bottom: 8px;
  }
  .story-step p {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.68;
  }
  .story-stage-wrap {
    position: sticky;
    top: 112px;
  }
  .story-demo {
    position: relative;
    min-height: 682px;
    border: 1px solid var(--line);
    border-radius: 28px;
    background:
      radial-gradient(circle at 20% 10%, rgba(136, 194, 160, .20), transparent 32%),
      radial-gradient(circle at 86% 18%, rgba(185, 165, 232, .22), transparent 34%),
      #fcfaf2;
    box-shadow: 0 28px 70px rgba(43, 42, 34, .16);
    overflow: hidden;
    padding: 18px;
  }
  .story-progress {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 14px;
  }
  .story-demo .role-cast {
    margin-bottom: 14px;
  }
  .story-progress span {
    height: 5px;
    border-radius: 999px;
    background: rgba(43, 42, 34, .10);
    overflow: hidden;
  }
  .story-progress span::before {
    content: '';
    display: block;
    width: 0;
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width .35s ease, background .35s ease;
  }
  .story-demo[data-active-step="idea"] .story-progress span:nth-child(1)::before,
  .story-demo[data-active-step="outline"] .story-progress span:nth-child(-n+2)::before,
  .story-demo[data-active-step="human"] .story-progress span:nth-child(-n+3)::before,
  .story-demo[data-active-step="revise"] .story-progress span:nth-child(-n+4)::before,
  .story-demo[data-active-step="review"] .story-progress span:nth-child(-n+5)::before {
    width: 100%;
  }
  .story-demo[data-active-step="outline"] .story-progress span:nth-child(2)::before,
  .story-demo[data-active-step="revise"] .story-progress span:nth-child(4)::before,
  .story-demo[data-active-step="review"] .story-progress span:nth-child(5)::before {
    background: var(--ai);
  }
  .story-doc {
    position: relative;
    min-height: 548px;
    border: 1px solid rgba(232, 225, 209, .96);
    border-radius: 22px;
    background:
      linear-gradient(rgba(232, 225, 209, .16) 1px, transparent 1px),
      #fffdf7;
    background-size: 100% 31px;
    padding: 26px 30px 26px 42px;
    overflow: hidden;
  }
  .story-doc::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 34px;
    bottom: 34px;
    width: 5px;
    border-radius: 999px;
    background: linear-gradient(var(--human) 0 24%, var(--ai) 24% 52%, var(--human) 52% 70%, var(--ai) 70% 100%);
    opacity: .45;
    transition: opacity .35s ease, box-shadow .35s ease;
  }
  .story-demo[data-active-step="review"] .story-doc::before {
    opacity: 1;
    box-shadow: 0 0 0 6px rgba(136, 194, 160, .08);
  }
  .story-doc-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 31px;
    line-height: 1.08;
    color: var(--ink);
    letter-spacing: 0;
    margin-bottom: 18px;
  }
  .story-block {
    position: relative;
    border-radius: 16px;
    padding: 13px 15px;
    margin-bottom: 12px;
    width: min(470px, 100%);
    max-width: 100%;
    color: var(--ink);
    font-size: 14px;
    line-height: 1.6;
    overflow: hidden;
    transition: opacity .34s ease, transform .34s ease, max-height .34s ease, margin .34s ease, padding .34s ease;
  }
  .story-block.human {
    background: rgba(136, 194, 160, .18);
  }
  .story-block.agent {
    background: rgba(185, 165, 232, .18);
    margin-left: auto;
  }
  .story-label {
    display: inline-block;
    margin-bottom: 7px;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 900;
  }
  .story-block.human .story-label {
    background: rgba(136, 194, 160, .28);
    color: #2f5d3d;
  }
  .story-block.agent .story-label {
    background: rgba(185, 165, 232, .30);
    color: #5b4a91;
  }
  .story-idea-text {
    display: inline-block;
    max-width: 0;
    white-space: nowrap;
    overflow: hidden;
    vertical-align: bottom;
    transition: max-width .65s steps(26, end);
  }
  .story-demo[data-active-step="idea"] .story-idea-text,
  .story-demo[data-active-step="outline"] .story-idea-text,
  .story-demo[data-active-step="human"] .story-idea-text,
  .story-demo[data-active-step="revise"] .story-idea-text,
  .story-demo[data-active-step="review"] .story-idea-text {
    max-width: 32em;
  }
  .story-cursor {
    display: inline-block;
    width: 2px;
    height: 16px;
    margin-left: 2px;
    background: var(--accent);
    vertical-align: -3px;
    animation: blink 1s steps(2) infinite;
  }
  .story-outline-block,
  .story-human-block,
  .story-revise-block,
  .story-review-actions,
  .story-confirm-popover,
  .story-prompt-card {
    opacity: 0;
    transform: translateY(18px);
    pointer-events: none;
  }
  .story-outline-block,
  .story-human-block,
  .story-revise-block {
    max-height: 0;
    overflow: hidden;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
  .story-demo[data-active-step="outline"] .story-outline-block,
  .story-demo[data-active-step="human"] .story-outline-block,
  .story-demo[data-active-step="revise"] .story-outline-block,
  .story-demo[data-active-step="review"] .story-outline-block {
    opacity: 1;
    transform: translateY(0);
    max-height: 220px;
    margin-bottom: 12px;
    padding: 13px 15px;
  }
  .story-demo[data-active-step="human"] .story-human-block,
  .story-demo[data-active-step="revise"] .story-human-block,
  .story-demo[data-active-step="review"] .story-human-block {
    opacity: 1;
    transform: translateY(0);
    max-height: 160px;
    margin-bottom: 12px;
    padding: 13px 15px;
  }
  .story-demo[data-active-step="revise"] .story-revise-block,
  .story-demo[data-active-step="review"] .story-revise-block {
    opacity: 1;
    transform: translateY(0);
    max-height: 190px;
    margin-bottom: 12px;
    padding: 13px 15px;
  }
  .story-prompt-card {
    position: relative;
    z-index: 1;
    width: min(320px, 100%);
    margin: 0 0 12px auto;
    border-radius: 18px;
    background: #24231d;
    color: #f4f0e7;
    box-shadow: 0 22px 48px rgba(43, 42, 34, .25);
    padding: 15px 16px;
    transform: translateX(28px) scale(.96);
    transition: opacity .34s ease, transform .34s ease, margin .34s ease, max-height .34s ease, padding .34s ease;
    max-height: 0;
    overflow: hidden;
    padding-top: 0;
    padding-bottom: 0;
  }
  .story-prompt-card b {
    display: block;
    font-size: 12px;
    margin-bottom: 8px;
  }
  .story-prompt-card code {
    display: block;
    color: #b7e6c7;
    font-family: "SF Mono", SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    line-height: 1.45;
  }
  .story-demo[data-active-step="outline"] .story-prompt-card {
    opacity: 1;
    transform: translateX(0) scale(1);
    max-height: 120px;
    padding: 15px 16px;
    margin-bottom: 12px;
  }
  .story-revise-block {
    width: min(510px, 100%);
  }
  .story-revise-original {
    display: block;
    margin-bottom: 8px;
    color: rgba(43, 42, 34, .45);
    text-decoration: line-through;
  }
  .story-revise-new {
    display: block;
  }
  .story-confirm-popover {
    position: relative;
    z-index: 1;
    width: min(300px, 100%);
    margin: 0 0 12px auto;
    border: 1px solid rgba(185, 165, 232, .34);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 18px 42px rgba(43, 42, 34, .17);
    padding: 13px;
    transition: opacity .34s ease, transform .34s ease, max-height .34s ease, margin .34s ease, padding .34s ease;
    max-height: 0;
    overflow: hidden;
    padding-top: 0;
    padding-bottom: 0;
    margin-bottom: 0;
  }
  .story-confirm-popover b {
    display: block;
    font-size: 13px;
    margin-bottom: 9px;
  }
  .story-confirm-popover span {
    display: inline-block;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 11px;
    font-weight: 900;
    padding: 7px 10px;
  }
  .story-demo[data-active-step="revise"] .story-confirm-popover,
  .story-demo[data-active-step="review"] .story-confirm-popover {
    opacity: 1;
    transform: translateY(0);
    max-height: 120px;
    padding: 13px;
    margin-bottom: 12px;
  }
  .story-review-actions {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    transition: opacity .34s ease, transform .34s ease, max-height .34s ease, margin .34s ease;
    max-height: 0;
    overflow: hidden;
    margin-top: 0;
  }
  .story-review-actions span {
    border-radius: 999px;
    background: rgba(43, 42, 34, .07);
    color: var(--ink);
    font-size: 12px;
    font-weight: 900;
    padding: 9px 12px;
  }
  .story-review-actions span:first-child {
    background: rgba(136, 194, 160, .24);
    color: #2f5d3d;
  }
  .story-demo[data-active-step="review"] .story-review-actions {
    opacity: 1;
    transform: translateY(0);
    max-height: 54px;
    margin-top: 4px;
  }
  .mobile-story-visual {
    display: none;
  }
  .mobile-mini-doc {
    position: relative;
    margin-top: 16px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: #fffdf7;
    padding: 14px 14px 14px 22px;
    overflow: hidden;
  }
  .mobile-mini-doc::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 14px;
    bottom: 14px;
    width: 4px;
    border-radius: 999px;
    background: linear-gradient(var(--human) 0 44%, var(--ai) 44% 100%);
  }
  .mobile-mini-line {
    display: block;
    border-radius: 10px;
    padding: 9px 10px;
    margin-bottom: 8px;
    color: var(--ink);
    font-size: 12px;
    line-height: 1.45;
  }
  .mobile-mini-line::before {
    display: inline-flex;
    margin-right: 6px;
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 10px;
    font-weight: 900;
    vertical-align: 1px;
  }
  .mobile-mini-line.human::before {
    content: '人类';
    background: rgba(136, 194, 160, .30);
    color: #2f5d3d;
  }
  .mobile-mini-line.agent::before {
    content: 'Agent';
    background: rgba(185, 165, 232, .32);
    color: #5b4a91;
  }
  .mobile-mini-line.human { background: rgba(136, 194, 160, .18); }
  .mobile-mini-line.agent { background: rgba(185, 165, 232, .18); }
  .story-step.is-visible .mobile-mini-line.agent {
    animation: mobile-agent-rise .65s cubic-bezier(.2,.7,.3,1) both;
  }
  @keyframes mobile-agent-rise {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-story-status::before,
    .hero-story-content,
    .role-connector::before,
    .hero-typed-text,
    .hero-typed-cursor,
    .hero-mini-invite,
    .hero-prompt-card,
    .hero-outline,
    .hero-human-add,
    .hero-final-draft,
    .story-cursor,
    .story-step.is-visible .mobile-mini-line.agent {
      animation: none;
    }
    .hero-typed-text,
    .story-idea-text {
      max-width: none;
    }
    .hero-story-doc {
      overflow-y: auto;
    }
    .hero-story-content {
      position: relative;
      transform: none;
    }
    .hero-prompt-card,
    .hero-outline,
    .hero-human-add,
    .hero-final-draft,
    .story-outline-block,
    .story-human-block,
    .story-revise-block,
    .story-review-actions,
    .story-confirm-popover,
    .story-prompt-card {
      opacity: 1;
      transform: none;
      max-height: none;
    }
    .story-outline-block,
    .story-human-block,
    .story-revise-block {
      padding: 13px 15px;
      margin-bottom: 12px;
    }
    .story-prompt-card {
      padding: 15px 16px;
      margin-bottom: 12px;
    }
    .story-confirm-popover {
      padding: 13px;
      margin-bottom: 12px;
    }
    .story-review-actions {
      margin-top: 4px;
    }
    .story-progress span::before {
      width: 100%;
    }
  }

  /* ================ HOW TO ================ */
  .howto { padding: 48px 0 40px; }
  .steps {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 20px; position: relative;
  }
  .step {
    text-align: left; padding: 0;
    background: var(--surface); border: 1.5px solid var(--line); border-radius: 18px;
    transition: border-color .25s ease, transform .25s ease, box-shadow .25s ease;
    overflow: hidden; position: relative;
  }
  .step:hover {
    border-color: var(--human);
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(74, 93, 58, .1);
  }
  .step-visual {
    height: 104px; position: relative;
    background: #fdfcf5;
    border-bottom: 1px dashed var(--line);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .step-body { padding: 18px 20px 20px; position: relative; }
  .step-num {
    display: inline-block;
    font-family: 'Fraunces', "Iowan Old Style", Georgia, serif;
    font-size: 13px; font-weight: 500; color: var(--accent);
    font-style: italic; letter-spacing: 0.5px;
    padding: 2px 10px; border: 1px solid var(--accent);
    border-radius: 999px; margin-bottom: 10px;
    background: var(--surface);
  }
  .step h4 { font-size: 15px; font-weight: 600; margin-bottom: 4px; color: var(--ink); }
  .step p { font-size: 13px; color: var(--muted); line-height: 1.55; }

  /* ---- mini-mockups inside .step-visual ---- */
  .m-doc {
    width: 78%; height: 70px; background: #fff;
    border: 1px solid var(--line); border-radius: 6px;
    padding: 8px 9px; position: relative;
    box-shadow: 0 2px 6px rgba(43, 42, 34, .04);
    display: flex; flex-direction: column; gap: 4px;
  }
  .m-line {
    height: 5px; border-radius: 2px;
    background: linear-gradient(90deg, #e8e1d1, #d8d0bc);
  }
  .m-line.w90 { width: 90%; } .m-line.w70 { width: 70%; }
  .m-line.w60 { width: 60%; } .m-line.w40 { width: 40%; }
  .m-cursor {
    display: inline-block; width: 1.5px; height: 9px;
    background: var(--accent); vertical-align: middle;
    margin-left: 2px; animation: m-blink 1s steps(2) infinite;
  }
  @keyframes m-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

  /* step 02: code snippet with copy indicator */
  .m-code {
    width: 82%; height: 76px; background: #2b2a22;
    border-radius: 8px; padding: 8px 10px; position: relative;
    font-family: 'SF Mono', Menlo, monospace; font-size: 9px;
    color: #f4f0e7; line-height: 1.5; overflow: hidden;
    box-shadow: 0 4px 10px rgba(43, 42, 34, .16);
  }
  .m-code-line { opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .m-code-line.hl { color: var(--human); }
  .m-copy-pill {
    position: absolute; top: 7px; right: 8px;
    background: var(--human); color: #2b4a36;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 8px; font-weight: 700; letter-spacing: 0.3px;
    padding: 2px 7px; border-radius: 999px;
    animation: m-copy-pulse 2.4s ease-in-out infinite;
  }
  @keyframes m-copy-pulse {
    0%, 70%, 100% { transform: scale(1); opacity: .95; }
    80% { transform: scale(1.12); opacity: 1; }
  }

  /* step 03: paragraph + comment bubble */
  .m-doc.with-comment { width: 58%; }
  .m-bubble {
    position: absolute; right: -4px; top: 8px;
    width: 44%; background: #fff;
    border: 1.5px solid var(--ai); border-radius: 8px;
    padding: 6px 7px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 8.5px; line-height: 1.35; color: var(--ink);
    box-shadow: 0 4px 10px rgba(185, 165, 232, .22);
    transform: rotate(1deg);
  }
  .m-bubble::before {
    content: ''; position: absolute; left: -6px; top: 10px;
    width: 6px; height: 1.5px; background: var(--ai);
  }
  .m-bubble b {
    display: inline-block; margin-top: 3px;
    background: var(--accent); color: #fff;
    font-weight: 600; font-size: 8px;
    padding: 1px 6px; border-radius: 999px;
  }

  /* step 04: doc with dual provenance gutter */
  .m-doc.with-gutter { padding-left: 14px; }
  .m-gutter {
    position: absolute; left: 4px; top: 8px; bottom: 8px;
    width: 3px; border-radius: 2px;
    display: flex; flex-direction: column; gap: 2px;
  }
  .m-gutter span { flex: 1; border-radius: 2px; }
  .m-gutter .g-h { background: var(--human); }
  .m-gutter .g-a { background: var(--ai); }

  /* ---- dashed connector arrows between cards (desktop only) ---- */
  .step-connector {
    position: absolute; top: 52px;
    width: 20px; height: 1px;
    border-top: 1.5px dashed var(--line);
    z-index: 0; pointer-events: none;
  }
  .step-connector::after {
    content: ''; position: absolute; right: -2px; top: -4px;
    border-left: 6px solid var(--line);
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
  }
  .step-connector.c1 { left: calc(25% - 10px); }
  .step-connector.c2 { left: calc(50% - 10px); }
  .step-connector.c3 { left: calc(75% - 10px); }
  @media (max-width: 900px) { .step-connector { display: none; } }

  /* ================ TESTIMONIALS ================ */
  .testimonials { padding: 48px 0 40px; }
  .t-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .t-card {
    background: var(--surface); border: 1.5px solid var(--line);
    border-radius: 18px; padding: 28px 24px 24px; position: relative;
    transition: transform .25s ease, box-shadow .25s ease;
  }
  .t-card.c1 { transform: rotate(-0.6deg); }
  .t-card.c3 { transform: rotate(0.6deg); }
  .t-card:hover {
    transform: rotate(0deg) translateY(-4px);
    box-shadow: 0 14px 32px rgba(74, 93, 58, .15);
  }
  .t-card .quote-mark {
    position: absolute; top: 10px; left: 20px;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 68px; line-height: 1; font-weight: 500; font-style: italic;
  }
  .t-card.c1 .quote-mark { color: var(--human); }
  .t-card.c2 .quote-mark { color: var(--ai); }
  .t-card.c3 .quote-mark { color: var(--coral); }
  .t-card blockquote {
    font-size: 14px; line-height: 1.7; color: var(--ink);
    margin: 44px 0 20px; font-style: normal;
  }
  .t-card .attr {
    display: flex; align-items: center; gap: 12px;
    padding-top: 16px; border-top: 1px dashed var(--line);
  }
  .avatar {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; color: #fff;
    border: 2px solid var(--surface);
    flex-shrink: 0;
  }
  .t-card.c1 .avatar {
    background: var(--human); color: #2b4a36;
    box-shadow: 0 0 0 1.5px var(--human);
  }
  .t-card.c2 .avatar {
    background: var(--ai); color: #3b2e6b;
    box-shadow: 0 0 0 1.5px var(--ai);
  }
  .t-card.c3 .avatar {
    background: var(--coral); color: #5e341e;
    box-shadow: 0 0 0 1.5px var(--coral);
  }
  .attr-text { font-size: 13px; color: var(--muted); line-height: 1.3; }
  .attr-text strong { color: var(--ink); font-weight: 600; display: block; }

  /* ================ FAQ ================ */
  .faq { padding: 52px 0 28px; }
  .faq-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }
  .faq-item {
    background: rgba(252, 250, 242, .86);
    border: 1.5px solid var(--line);
    border-radius: 18px;
    padding: 22px 22px 20px;
    box-shadow: 0 8px 20px rgba(74, 93, 58, .06);
  }
  .faq-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .faq-kicker::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--ai);
    box-shadow: 0 0 0 4px rgba(185, 165, 232, .18);
  }
  .faq-item h4 {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -.2px;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .faq-item p {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.68;
  }

  /* ================ AGENT BLOCK ================ */
  .agent-block { padding: 56px 0 32px; }
  .eyebrow {
    display: inline-block; font-size: 11px; font-weight: 700;
    color: var(--accent); letter-spacing: 2.4px;
    text-transform: uppercase; margin-bottom: 14px;
  }
  .agent-invite { max-width: 760px; margin: 0 auto; text-align: center; }

  .agent-hint {
    font-size: 14px; color: var(--muted); line-height: 1.65;
    max-width: 560px; margin: 0 auto 22px;
  }
  .agent-hint strong { color: var(--ink); font-weight: 600; }

  /* "高级：装成 Claude Code 插件" 折叠区 —— 99% 用户不需要点开，样式刻意低调 */
  .agent-advanced {
    margin-top: 28px; padding: 18px 22px;
    border: 1px dashed var(--line); border-radius: 12px;
    text-align: left; font-size: 13px;
  }
  .agent-advanced summary {
    cursor: pointer; font-size: 13px; color: var(--muted);
    font-weight: 500; list-style: none; padding: 2px 0;
  }
  .agent-advanced summary::-webkit-details-marker { display: none; }
  .agent-advanced summary::before {
    content: "▸"; display: inline-block; margin-right: 8px;
    transition: transform .15s ease; color: var(--muted);
  }
  .agent-advanced[open] summary::before { transform: rotate(90deg); }
  .agent-advanced summary:hover { color: var(--ink); }
  .advanced-note {
    margin: 14px 0 18px; font-size: 13px; color: var(--muted); line-height: 1.65;
  }
  .advanced-note strong { color: var(--ink); font-weight: 600; }
  .advanced-step { margin-bottom: 14px; }
  .advanced-step:last-child { margin-bottom: 0; }
  .step-head {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 6px; font-size: 13px;
  }
  .step-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--ink); color: #fcfaf2;
    font-size: 12px; font-weight: 600;
  }
  .step-label { flex: 1; color: var(--ink); font-weight: 500; }
  .step-copy {
    background: var(--surface); border: 1px solid var(--line);
    padding: 5px 12px; font-size: 12px; font-weight: 500;
    color: var(--muted); cursor: pointer;
    border-radius: 6px; font-family: inherit;
    transition: background .15s ease, color .15s ease;
  }
  .step-copy:hover { background: var(--ink); color: #fcfaf2; border-color: var(--ink); }
  .step-cmd { padding: 14px 18px; font-size: 12px; border-radius: 10px; }

  .big-copy {
    font-size: 16px; padding: 16px 36px;
    margin-bottom: 24px;
    box-shadow: 0 6px 0 var(--accent-dark), 0 12px 24px rgba(74, 93, 58, .22);
  }
  .big-copy:active { transform: translateY(4px); box-shadow: 0 2px 0 var(--accent-dark); }

  .code-block {
    position: relative; text-align: left;
    background: #2b2a22; color: #ede4cd;
    font-family: "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 13px; line-height: 1.7;
    border-radius: 16px; padding: 24px 28px;
    white-space: pre-wrap; word-break: break-word;
    overflow-x: auto;
    box-shadow: 0 10px 30px rgba(74, 93, 58, .15);
  }
  .agent-content[hidden] { display: none; }

  .agent-footnote {
    margin-top: 22px; font-size: 13px; color: var(--muted);
  }
  .agent-footnote a { color: var(--accent); font-weight: 500; }
  .agent-footnote a:hover { color: var(--accent-dark); border-bottom: 1px dashed currentColor; }
  .agent-footnote .sep { margin: 0 10px; color: var(--line); }

  /* 底部 Repeat CTA */
  .cta-bottom {
    text-align: center; padding: 80px 0 48px;
    border-top: 1px dashed var(--line); margin-top: 48px;
  }
  .cta-bottom h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 40px; font-weight: 500; letter-spacing: -1px;
    color: var(--ink); margin-bottom: 10px;
  }
  .cta-bottom h2 em {
    font-style: italic; color: var(--accent);
  }
  .cta-bottom p {
    font-size: 16px; color: var(--muted);
    margin-bottom: 28px;
  }
  .big-cta {
    font-size: 17px; padding: 18px 40px;
    box-shadow: 0 6px 0 var(--accent-dark), 0 14px 28px rgba(74, 93, 58, .25);
  }
  .big-cta:active { transform: translateY(4px); box-shadow: 0 2px 0 var(--accent-dark); }

  footer {
    border-top: 1px dashed var(--line); padding: 32px 0 40px;
    font-size: 13px; color: var(--muted);
    text-align: center; margin-top: 40px;
  }
  footer a { color: var(--accent); }

  /* ================ RESPONSIVE ================ */
  @media (max-width: 900px) {
    .hero { grid-template-columns: 1fr; gap: 36px; padding: 40px 0 48px; }
    .hero-left h1 { font-size: 48px; letter-spacing: 0; }
    .mini-editor p.h { font-size: 22px; }
    .mini-editor .doc { min-height: 320px; padding: 28px 28px 26px; }
    .mini-editor.first-run-demo .doc { min-height: 420px; }
    .collab-preview-card { right: 22px; }
    .story-shell { grid-template-columns: 1fr; }
    .story-stage-wrap { position: relative; top: auto; }
  }
  @media (max-width: 720px) {
    .hero { gap: 24px; padding: 28px 0 12px; }
    .hero-left h1 { font-size: 40px; }
    .hero-left p.subtitle { font-size: 16px; }
    .features { grid-template-columns: 1fr; }
    .usecase-grid { grid-template-columns: 1fr; }
    .steps { grid-template-columns: 1fr 1fr; }
    .story-section { padding: 42px 0 34px; }
    .story-shell { display: block; }
    .story-steps { gap: 18px; }
    .story-step {
      min-height: 0;
      display: block;
      opacity: 1;
      transform: none;
      padding: 20px 18px;
    }
    .story-step.is-current {
      transform: none;
      box-shadow: 0 12px 30px rgba(74, 93, 58, .10);
    }
    .story-stage-wrap { display: none; }
    .mobile-story-visual { display: block; }
    .mobile-mini-line {
      max-height: none;
      overflow-wrap: anywhere;
    }
    .faq-grid { grid-template-columns: 1fr; }
    .t-grid { grid-template-columns: 1fr; }
    .t-card.c1, .t-card.c3 { transform: none; }
    header { padding: 16px 20px; gap: 14px; flex-wrap: wrap; }
    .header-actions { gap: 12px; }
    nav.top-nav { gap: 14px; font-size: 13px; }
    .home-account-panel { right: 0; left: auto; transform: none; }
    .section-head h2 { font-size: 32px; }
    body::before, body::after { display: none; }
    .code-block { padding: 18px 18px; font-size: 12px; }
    .big-copy { padding: 14px 28px; font-size: 15px; }
    .cta-bottom h2 { font-size: 32px; }
    .cta-bottom { padding: 56px 0 32px; }
    .mini-editor p.h { font-size: 20px; }
    .mini-editor p.para { font-size: 15px; }
    .mini-editor .doc { padding: 24px 22px 22px; min-height: 280px; }
    .mini-editor.first-run-demo .doc { min-height: 0; padding: 18px 14px 18px; }
    .hero-story-scene { min-height: 0; padding: 0 4px 0 10px; }
    .role-cast {
      grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr);
      gap: 7px;
    }
    .role-card {
      padding: 7px 8px;
      gap: 7px;
    }
    .role-card span:not(.role-avatar) {
      display: none;
    }
    .role-avatar {
      flex-basis: 30px;
      width: 30px;
      height: 30px;
      border-radius: 11px;
    }
    .role-avatar.human::before { left: 9px; top: 6px; width: 11px; height: 11px; }
    .role-avatar.human::after { left: 7px; bottom: 6px; width: 16px; height: 9px; }
    .role-avatar.agent::before { left: 7px; top: 8px; width: 16px; height: 12px; }
    .role-avatar.agent::after { left: 9px; top: 10px; font-size: 8px; }
    .role-connector::before { animation: none; }
    .hero-story-title {
      left: 24px;
      right: 14px;
      top: 16px;
      font-size: 22px;
    }
    .hero-story-doc {
      height: min(300px, 40vh);
      min-height: 0;
      padding: 0;
    }
    .hero-story-content {
      width: 100%;
      height: 690px;
      transform: translateY(0);
      animation: hero-story-scroll-mobile 10s cubic-bezier(.45,0,.25,1) infinite;
    }
    .hero-doc-block,
    .hero-story-line {
      position: absolute;
      width: calc(100% - 38px);
      max-width: none;
      margin: 0;
    }
    .hero-idea-card { left: 24px; top: 72px; }
    .hero-outline,
    .hero-prompt-card,
    .hero-final-draft {
      position: absolute;
      width: calc(100% - 38px);
      margin: 0;
      right: auto;
      left: 24px;
      bottom: auto;
      top: auto;
    }
    .hero-prompt-card { top: 204px; }
    .hero-outline { top: 296px; }
    .hero-human-add { left: 24px; top: 448px; width: calc(100% - 38px); }
    .hero-final-draft { top: 540px; bottom: auto; }
    @keyframes hero-story-scroll-mobile {
      0%, 34% { transform: translateY(0); }
      48%, 60% { transform: translateY(-132px); }
      72%, 84% { transform: translateY(-288px); }
      94%, 100% { transform: translateY(-420px); }
    }
    .hero-doc-lines { margin-right: 0; }
    .collab-preview-card,
    .invite-mini-card {
      position: relative;
      top: auto;
      right: auto;
      left: auto;
      bottom: auto;
      width: 100%;
      margin-top: 18px;
    }
    .collab-preview-card { padding: 18px; }
    .mini-editor .status-pill { top: 56px; right: 14px; font-size: 11px; padding: 5px 10px; }
    .mini-editor .comment-card { padding: 12px 14px; }
    .mini-editor .comment-card .c-text { font-size: 13px; }
  }
  @media (max-width: 420px) {
    header { align-items: flex-start; }
    .header-actions { width: 100%; justify-content: space-between; }
    nav.top-nav { max-width: calc(100% - 78px); overflow-x: auto; padding-bottom: 2px; }
    .home-account-trigger { min-height: 34px; padding: 0 12px; font-size: 12px; }
    .home-account-panel { width: calc(100vw - 56px); }
    .steps { grid-template-columns: 1fr; }
    .hero { gap: 14px; }
    .hero-left h1 { font-size: 34px; }
    .mini-editor p.h { font-size: 19px; }
    .mini-editor p.para { font-size: 14px; margin-bottom: 12px; }
    .mini-editor .doc { padding: 20px 18px; min-height: 260px; }
    .mini-editor.first-run-demo .doc { min-height: 0; padding: 16px 12px 18px; }
    .collab-preview-card h3 { font-size: 20px; }
    .invite-code-line { font-size: 10px; }
    .mini-editor .status-pill { display: none; }
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

export const HOMEPAGE_SCRIPT = String.raw`
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

  // 主"复制给 Agent"按钮：clipboard 里就是那段通用 SKILL.md 引导 prompt。
  // 单一内容、单一按钮，不再走 tab 切换 —— 所有主流 agent（Claude Code、
  // Codex、Cursor、ChatGPT）都能吃同一段 prompt。
  var bigCopy = document.getElementById('copy-agent-invite');
  if (bigCopy) {
    bigCopy.addEventListener('click', async function () {
      var node = document.getElementById('agent-invite-content');
      if (!node) return;
      var text = (node.textContent || '').trim();
      var original = bigCopy.textContent;
      var ok = await writeClipboard(text);
      bigCopy.textContent = ok ? '✓ 已复制，粘给 Agent' : '复制失败，请手动选中';
      setTimeout(function () { bigCopy.textContent = original; }, 2000);
    });
  }

  // 高级区：步骤 1 / 步骤 2 各自的"复制"按钮，每次剪贴板只装一条命令，
  // 避免历史上两条命令被 concat 成一条、Claude Code 把第二行当成 repo 名
  // 的尾巴的那个坑。
  document.querySelectorAll('.step-copy').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var targetId = btn.getAttribute('data-copy-target');
      if (!targetId) return;
      var node = document.getElementById(targetId);
      if (!node) return;
      var text = (node.textContent || '').trim();
      var original = btn.textContent;
      var ok = await writeClipboard(text);
      btn.textContent = ok ? '✓ 已复制' : '复制失败';
      setTimeout(function () { btn.textContent = original; }, 1600);
    });
  });

  var accountRoot = document.getElementById('home-account');
  var accountTrigger = document.getElementById('home-account-trigger');
  var accountPanel = document.getElementById('home-account-panel');
  var authModal = document.getElementById('home-auth-modal');
  var accountUser = null;
  var accountBusy = false;
  var authMode = 'login';

  function formatRelativeTime(ts) {
    var diffMs = Date.now() - ts;
    var sec = Math.max(0, Math.round(diffMs / 1000));
    if (sec < 60) return '刚刚';
    var min = Math.round(sec / 60);
    if (min < 60) return min + ' 分钟前';
    var hr = Math.round(min / 60);
    if (hr < 24) return hr + ' 小时前';
    var day = Math.round(hr / 24);
    if (day < 30) return day + ' 天前';
    var mon = Math.round(day / 30);
    if (mon < 12) return mon + ' 个月前';
    return Math.round(mon / 12) + ' 年前';
  }

  function setAccountTrigger() {
    if (!accountTrigger) return;
    accountTrigger.disabled = accountBusy;
    accountTrigger.textContent = accountBusy ? '处理中…' : (accountUser ? '我的文档' : '登录');
    var expanded = (accountPanel && !accountPanel.hidden) || (authModal && !authModal.hidden);
    accountTrigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    accountTrigger.title = accountUser
      ? ((accountUser.name || accountUser.email) + ' · 我的文档')
      : '登录 Zoon 查看我的文档';
  }

  function closeAccountPanel() {
    if (!accountPanel) return;
    accountPanel.hidden = true;
    setAccountTrigger();
  }

  function openAccountPanel() {
    if (!accountPanel) return;
    accountPanel.hidden = false;
    setAccountTrigger();
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.hidden = true;
    document.body.classList.remove('home-auth-open');
    setAccountTrigger();
  }

  function makeAuthField(parent, options) {
    var label = document.createElement('label');
    label.className = 'home-auth-field';
    var text = document.createElement('span');
    text.textContent = options.label;
    var input = document.createElement('input');
    input.type = options.type || 'text';
    input.name = options.name;
    input.placeholder = options.placeholder || '';
    input.autocomplete = options.autocomplete || 'off';
    label.append(text, input);
    parent.appendChild(label);
    return input;
  }

  function appendAccountStatus(parent, message) {
    var status = document.createElement('div');
    status.className = 'home-account-status';
    status.textContent = message;
    parent.appendChild(status);
  }

  function readLocalRecentDocs() {
    try {
      var raw = localStorage.getItem('zoon:recent-docs');
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (entry) {
        return entry && typeof entry.slug === 'string' && typeof entry.href === 'string' && typeof entry.ts === 'number';
      }).sort(function (a, b) { return b.ts - a.ts; });
    } catch (_error) {
      return [];
    }
  }

  function writeLocalRecentDocs(entries) {
    try {
      localStorage.setItem('zoon:recent-docs', JSON.stringify(entries));
    } catch (_error) {}
  }

  function removeLocalRecentDoc(slug) {
    if (!slug) return;
    writeLocalRecentDocs(readLocalRecentDocs().filter(function (entry) {
      return entry.slug !== slug;
    }));
  }

  function getLocalOwnerSecret(slug) {
    if (!slug) return null;
    try {
      var secret = localStorage.getItem('zoon:owner:' + slug);
      return secret && secret.trim() ? secret.trim() : null;
    } catch (_error) {
      return null;
    }
  }

  function removeLocalOwnerSecret(slug) {
    if (!slug) return;
    try { localStorage.removeItem('zoon:owner:' + slug); } catch (_error) {}
  }

  async function readJson(res) {
    try { return await res.json(); } catch (_error) { return null; }
  }

  async function loadAccountMe() {
    try {
      var res = await fetch('/api/account/me', { credentials: 'same-origin' });
      if (!res.ok) return null;
      var payload = await readJson(res);
      var user = payload && payload.user;
      if (!user || typeof user.email !== 'string') return null;
      return user;
    } catch (_error) {
      return null;
    }
  }

  async function loadAccountDocuments() {
    try {
      var res = await fetch('/api/account/documents?limit=50', { credentials: 'same-origin' });
      if (!res.ok) return null;
      var payload = await readJson(res);
      return payload && Array.isArray(payload.documents) ? payload.documents : null;
    } catch (_error) {
      return null;
    }
  }

  async function removeAccountDocumentVisit(slug) {
    try {
      var res = await fetch('/api/account/documents/' + encodeURIComponent(slug) + '/visit', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      return res.ok;
    } catch (_error) {
      return false;
    }
  }

  async function deleteOwnedDocument(slug, ownerSecret) {
    var headers = {};
    if (ownerSecret) headers['x-share-token'] = ownerSecret;
    var res = await fetch('/api/documents/' + encodeURIComponent(slug), {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: headers,
    });
    if (!res.ok) {
      var payload = await readJson(res);
      throw new Error(payload && payload.error ? payload.error : ('删除失败（' + res.status + '）'));
    }
    removeLocalRecentDoc(slug);
    removeLocalOwnerSecret(slug);
  }

  function makeDocAction(label, danger) {
    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'home-doc-action' + (danger ? ' danger' : '');
    action.textContent = label;
    return action;
  }

  function renderLocalRecentFallback(parent, onChanged) {
    var recents = readLocalRecentDocs();
    if (recents.length === 0) {
      appendAccountStatus(parent, '文档库暂时不可用，也没有本机最近文档。');
      return;
    }
    appendAccountStatus(parent, '文档库暂时不可用，先显示本机最近文档。');
    recents.slice(0, 10).forEach(function (doc) {
      var row = document.createElement('div');
      row.className = 'home-doc-row';
      row.setAttribute('role', 'menuitem');
      var link = document.createElement('a');
      link.className = 'home-doc-link';
      link.href = doc.href;
      var title = document.createElement('span');
      title.className = 'home-doc-title';
      title.textContent = doc.title || 'Untitled';
      var time = document.createElement('span');
      time.className = 'home-doc-time';
      time.textContent = formatRelativeTime(doc.ts);
      var ownerSecret = getLocalOwnerSecret(doc.slug);
      var action = makeDocAction(ownerSecret ? '删除' : '移除', Boolean(ownerSecret));
      action.addEventListener('click', async function (event) {
        event.preventDefault();
        event.stopPropagation();
        var confirmed = window.confirm(ownerSecret
          ? '确定删除「' + (doc.title || 'Untitled') + '」吗？删除后分享链接将不可访问。'
          : '从本机最近文档里移除「' + (doc.title || 'Untitled') + '」吗？原文档不会被删除。');
        if (!confirmed || action.disabled) return;
        action.disabled = true;
        action.textContent = ownerSecret ? '删除中…' : '移除中…';
        try {
          if (ownerSecret) await deleteOwnedDocument(doc.slug, ownerSecret);
          else removeLocalRecentDoc(doc.slug);
          if (onChanged) onChanged();
          else row.remove();
        } catch (error) {
          alert(error instanceof Error ? error.message : '操作失败，请稍后重试。');
          action.disabled = false;
          action.textContent = ownerSecret ? '删除' : '移除';
        }
      });
      link.append(title, time);
      row.append(link, action);
      parent.appendChild(row);
    });
  }

  function renderAccountDocs(parent, docs, onChanged) {
    if (!docs || docs.length === 0) {
      appendAccountStatus(parent, '还没有账号文档。新建一篇后会出现在这里。');
      return;
    }
    docs.slice(0, 50).forEach(function (doc) {
      var row = document.createElement('div');
      row.className = 'home-doc-row';
      row.setAttribute('role', 'menuitem');
      var link = document.createElement('a');
      link.className = 'home-doc-link';
      link.href = doc.webUrl;
      var left = document.createElement('span');
      left.style.minWidth = '0';
      var title = document.createElement('span');
      title.className = 'home-doc-title';
      title.textContent = doc.title || 'Untitled';
      var meta = document.createElement('span');
      meta.className = 'home-doc-meta';
      meta.textContent = doc.isOwned ? '我创建的文档' : '最近打开';
      left.append(title, meta);
      var timestamp = doc.lastVisitedAt || doc.updatedAt || doc.createdAt;
      var parsed = Date.parse(timestamp);
      var time = document.createElement('span');
      time.className = 'home-doc-time';
      time.textContent = Number.isFinite(parsed) ? formatRelativeTime(parsed) : '';
      var action = makeDocAction(doc.isOwned ? '删除' : '移除', doc.isOwned);
      action.addEventListener('click', async function (event) {
        event.preventDefault();
        event.stopPropagation();
        var confirmed = window.confirm(doc.isOwned
          ? '确定删除「' + (doc.title || 'Untitled') + '」吗？删除后分享链接将不可访问。'
          : '从我的文档里移除「' + (doc.title || 'Untitled') + '」吗？原文档不会被删除。');
        if (!confirmed || action.disabled) return;
        action.disabled = true;
        action.textContent = doc.isOwned ? '删除中…' : '移除中…';
        try {
          if (doc.isOwned) {
            await deleteOwnedDocument(doc.slug);
          } else {
            var removed = await removeAccountDocumentVisit(doc.slug);
            if (!removed) throw new Error('暂时无法从我的文档移除。');
            removeLocalRecentDoc(doc.slug);
          }
          if (onChanged) onChanged();
        } catch (error) {
          alert(error instanceof Error ? error.message : '操作失败，请稍后重试。');
          action.disabled = false;
          action.textContent = doc.isOwned ? '删除' : '移除';
        }
      });
      link.append(left, time);
      row.append(link, action);
      parent.appendChild(row);
    });
  }

  function renderAuthModal(mode, message) {
    if (!authModal) return;
    authMode = mode || 'login';
    var isRegister = authMode === 'register';
    authModal.replaceChildren();

    var backdrop = document.createElement('div');
    backdrop.className = 'home-auth-backdrop';
    backdrop.addEventListener('click', closeAuthModal);

    var card = document.createElement('div');
    card.className = 'home-auth-card';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'home-auth-close';
    close.setAttribute('aria-label', '关闭登录窗口');
    close.textContent = '×';
    close.addEventListener('click', closeAuthModal);

    var eyebrow = document.createElement('div');
    eyebrow.className = 'home-auth-eyebrow';
    eyebrow.textContent = 'Zoon account';
    var title = document.createElement('h2');
    title.className = 'home-auth-title';
    title.id = 'home-auth-title';
    title.textContent = isRegister ? '创建账号' : '欢迎回来';
    var copy = document.createElement('p');
    copy.className = 'home-auth-copy';
    copy.textContent = isRegister
      ? '创建账号后，你创建和打开过的文档会进入「我的文档」，换浏览器也能找回。'
      : '登录后查看你的账号文档库；没登录时，Zoon 仍会保留本机最近文档。';

    var tabs = document.createElement('div');
    tabs.className = 'home-auth-tabs';
    tabs.setAttribute('role', 'tablist');
    var loginTab = document.createElement('button');
    loginTab.type = 'button';
    loginTab.className = 'home-auth-tab' + (isRegister ? '' : ' is-active');
    loginTab.textContent = '登录';
    var registerTab = document.createElement('button');
    registerTab.type = 'button';
    registerTab.className = 'home-auth-tab' + (isRegister ? ' is-active' : '');
    registerTab.textContent = '注册';
    loginTab.addEventListener('click', function () { renderAuthModal('login'); });
    registerTab.addEventListener('click', function () { renderAuthModal('register'); });
    tabs.append(loginTab, registerTab);

    var form = document.createElement('form');
    form.className = 'home-auth-form';
    var email = makeAuthField(form, {
      label: '邮箱',
      name: 'email',
      type: 'email',
      placeholder: 'you@example.com',
      autocomplete: 'email',
    });
    var password = makeAuthField(form, {
      label: '密码',
      name: 'password',
      type: 'password',
      placeholder: isRegister ? '至少 8 位' : '输入密码',
      autocomplete: isRegister ? 'new-password' : 'current-password',
    });
    var name = null;
    if (isRegister) {
      name = makeAuthField(form, {
        label: '昵称',
        name: 'name',
        placeholder: '显示在我的文档里',
        autocomplete: 'name',
      });
    }
    var status = document.createElement('div');
    status.className = 'home-auth-status';
    status.textContent = message || '';
    var primary = document.createElement('button');
    primary.type = 'submit';
    primary.className = 'home-auth-primary';
    primary.textContent = isRegister ? '创建账号' : '登录';
    form.append(status, primary);

    function setFormBusy(busy) {
      accountBusy = busy;
      setAccountTrigger();
      [email, password, name, primary, loginTab, registerTab].forEach(function (node) {
        if (node) node.disabled = busy;
      });
    }
    function collectAccountForm() {
      return {
        email: email.value.trim(),
        password: password.value,
        name: name ? name.value.trim() : '',
      };
    }
    async function submitAccountForm() {
      if (accountBusy) return;
      var values = collectAccountForm();
      if (!values.email || !values.password) {
        status.textContent = '请输入邮箱和密码。';
        return;
      }
      if (isRegister && values.password.length < 8) {
        status.textContent = '密码至少 8 位。';
        return;
      }
      setFormBusy(true);
      primary.textContent = isRegister ? '创建中…' : '登录中…';
      status.textContent = '';
      try {
        var endpoint = isRegister ? '/api/auth/local/register' : '/api/auth/local/login';
        var res = await fetch(endpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        var payload = await readJson(res);
        if (!res.ok || !payload || payload.success !== true || !payload.user) {
          status.textContent = (payload && payload.error) || '登录失败，请稍后重试。';
          primary.textContent = isRegister ? '创建账号' : '登录';
          return;
        }
        accountUser = payload.user;
        closeAuthModal();
        openAccountPanel();
        await renderSignedInAccount();
      } catch (_error) {
        status.textContent = '网络异常，请稍后重试。';
        primary.textContent = isRegister ? '创建账号' : '登录';
      } finally {
        setFormBusy(false);
      }
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitAccountForm();
    });

    var foot = document.createElement('div');
    foot.className = 'home-auth-foot';
    var footText = document.createElement('span');
    footText.textContent = isRegister ? '已有账号？' : '还没有账号？';
    var switcher = document.createElement('button');
    switcher.type = 'button';
    switcher.className = 'home-auth-link';
    switcher.textContent = isRegister ? '去登录' : '创建账号';
    switcher.addEventListener('click', function () {
      renderAuthModal(isRegister ? 'login' : 'register');
    });
    foot.append(footText, switcher);

    card.append(close, eyebrow, title, copy, tabs, form, foot);
    authModal.append(backdrop, card);
    setTimeout(function () { email.focus(); }, 0);
  }

  function openAuthModal(mode) {
    if (!authModal) return;
    closeAccountPanel();
    renderAuthModal(mode || authMode);
    authModal.hidden = false;
    document.body.classList.add('home-auth-open');
    setAccountTrigger();
  }

  async function renderSignedInAccount() {
    if (!accountPanel || !accountUser) return;
    accountPanel.replaceChildren();
    var head = document.createElement('div');
    head.className = 'home-account-head';
    var identity = document.createElement('div');
    identity.style.minWidth = '0';
    var name = document.createElement('div');
    name.className = 'home-account-name';
    name.textContent = accountUser.name || '我的文档';
    var email = document.createElement('div');
    email.className = 'home-account-email';
    email.textContent = accountUser.email;
    identity.append(name, email);
    var logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'home-account-logout';
    logout.textContent = '退出';
      logout.addEventListener('click', async function () {
        logout.disabled = true;
        logout.textContent = '退出中…';
        try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (_error) {}
        accountUser = null;
        setAccountTrigger();
        closeAccountPanel();
      });
    head.append(identity, logout);
    var newDoc = document.createElement('a');
    newDoc.className = 'home-account-new';
    newDoc.href = '/new';
    newDoc.textContent = '新建文档';
    var label = document.createElement('div');
    label.className = 'home-account-label';
    label.textContent = '我的文档';
    var list = document.createElement('div');
    appendAccountStatus(list, '加载中…');
    accountPanel.append(head, newDoc, label, list);
    var docs = await loadAccountDocuments();
    if (!accountPanel || accountPanel.hidden) return;
    list.replaceChildren();
    if (docs) renderAccountDocs(list, docs, renderSignedInAccount);
    else renderLocalRecentFallback(list, function () {
      list.replaceChildren();
      renderLocalRecentFallback(list);
    });
  }

  if (accountTrigger && accountPanel) {
    setAccountTrigger();
    accountTrigger.addEventListener('click', async function (event) {
      event.stopPropagation();
      if (accountUser) {
        if (accountPanel.hidden) {
          openAccountPanel();
          await renderSignedInAccount();
        } else {
          closeAccountPanel();
        }
        return;
      }
      openAuthModal('login');
    });
    document.addEventListener('click', function (event) {
      if (!accountRoot || accountRoot.contains(event.target)) return;
      closeAccountPanel();
    }, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAccountPanel();
        closeAuthModal();
      }
    }, true);
    loadAccountMe().then(function (user) {
      accountUser = user;
      setAccountTrigger();
    });
  }

  // 创建协作文档：hero 和 cta-bottom 两处按钮共用
  document.querySelectorAll('.create-doc-trigger').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '创建中…';
      try {
        var res = await fetch('/api/public/documents', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!res.ok) {
          var err = await res.json().catch(function () { return {}; });
          var msg = err && err.error ? err.error : '创建失败（' + res.status + '）';
          alert(msg);
          btn.disabled = false;
          btn.textContent = originalText;
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
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });

  // 滚动入场动画：IntersectionObserver，逐块错峰显现
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el, idx) {
      // 同一 section 内的多个卡片错峰 80ms
      var group = el.getAttribute('data-reveal-group');
      if (group) {
        var siblings = document.querySelectorAll('.reveal[data-reveal-group="' + group + '"]');
        var within = Array.prototype.indexOf.call(siblings, el);
        el.style.setProperty('--reveal-delay', (within * 80) + 'ms');
      }
      io.observe(el);
    });
  } else {
    // 不支持 IO 的浏览器：直接全部显现
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // 滚动故事动画：步骤进入视口时同步右侧文档舞台
  var storyDemo = document.querySelector('.story-demo');
  var storySteps = Array.prototype.slice.call(document.querySelectorAll('.story-step[data-story-step]'));
  function setStoryStep(step) {
    if (!step) return;
    if (storyDemo) storyDemo.setAttribute('data-active-step', step);
    storySteps.forEach(function (node) {
      node.classList.toggle('is-current', node.getAttribute('data-story-step') === step);
    });
  }
  if (storySteps.length) {
    setStoryStep(storySteps[0].getAttribute('data-story-step'));
    var storyTicking = false;
    function syncStoryFromScroll() {
      storyTicking = false;
      var targetY = window.innerHeight * 0.46;
      var best = null;
      storySteps.forEach(function (node) {
        var rect = node.getBoundingClientRect();
        var center = rect.top + rect.height * 0.46;
        var distance = Math.abs(center - targetY);
        if (!best || distance < best.distance) best = { node: node, distance: distance };
      });
      if (best && best.node) setStoryStep(best.node.getAttribute('data-story-step'));
    }
    function requestStorySync() {
      if (storyTicking) return;
      storyTicking = true;
      window.requestAnimationFrame(syncStoryFromScroll);
    }
    window.addEventListener('scroll', requestStorySync, { passive: true });
    window.addEventListener('resize', requestStorySync);
    requestStorySync();
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var storyIo = new IntersectionObserver(function (entries) {
        var winner = null;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (!winner || entry.intersectionRatio > winner.intersectionRatio) winner = entry;
        });
        if (winner) setStoryStep(winner.target.getAttribute('data-story-step'));
      }, { threshold: [0.35, 0.55, 0.75], rootMargin: '-24% 0px -38% 0px' });
      storySteps.forEach(function (node) { storyIo.observe(node); });
    }
  }
})();
`;

export function renderHomepage(origin: string): string {
  // Claude Code plugin marketplace 两步命令。历史上是拼成一段放剪贴板的，
  // 但用户一次粘贴给 Claude Code 会被当成一条 `/plugin marketplace add` + 超长
  // repo 名，clone 失败（目录名里出现 "/plugin install zoon"）。所以现在拆成
  // 两个独立字段，每个各自一个复制按钮；同时第一条用完整 HTTPS URL，避免
  // owner/repo 短写走 SSH 被没配 key 的用户挡住。
  const ccMarketplaceAddCmd = `/plugin marketplace add https://github.com/stephenfan80/human-agent-collab`;
  const ccPluginInstallCmd = `/plugin install zoon@human-agent-collab`;
  // Codex / 其他可读 URL 的 agent — 一句话指令。
  //
  // 关键：指向本机 /skill 端点（由 server/public-entry-routes.ts 提供），直
  // 接返回 SKILL.md 原文。上一版指向 GitHub repo 根 URL，agent 得 fetch
  // README → tree API → raw SKILL.md 转好几跳才能读到，安装体验拖沓。
  // /skill 是单次 fetch，自家服务器还能保证 skill 和服务端协议始终一致。
  //
  // Proof 对齐：这里只做"加入 + 说一句通用能力"，不预读文档、不问 A/B/C
  // 偏好、不转成长协议说明。加入阶段 ≤ 3 个往返。
  const universalSkillPrompt =
    `Fetch the skill at ${origin}/skill (served as text/markdown — one request, no hunting through the repo). Then, if I gave you a doc, POST your presence to it. Reply in my language with 2 short sentences: (1) confirm you joined and are ready, (2) one line on what you can do in Zoon generically — read the doc, write directly into the body, leave comments, or make opt-in suggestions. Do NOT pre-read the doc, do NOT list 2–3 doc-specific suggestions, do NOT ask about my long-output preferences, do NOT dump protocol rules or API endpoints. If I haven't given you a doc URL yet, just say you're ready and wait for me to send a Zoon link or tell you what to work on.`;
  // 最简：只给 repo 链接，让 agent 自己读
  const skillRepoUrl = `https://github.com/stephenfan80/human-agent-collab`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zoon — 和 Agent 一起写作的文档</title>
  <meta name="description" content="Zoon 是一个人机协作文档编辑器。AI 的字用紫色标记、你的字用绿色。Agent 直接写进文档，你看到哪段不对点一下就能改或删。" />
  <meta property="og:title" content="Zoon — 和 Agent 一起写作的文档" />
  <meta property="og:description" content="快速、免费、无需登录。" />
  <meta property="og:type" content="website" />
  <link rel="icon" type="image/svg+xml" href="/zoon-favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${HOMEPAGE_STYLES}</style>
</head>
<body>
  <header>
    <div class="logo">Zoon<span class="logo-dot">.</span></div>
    <div class="header-actions">
      <nav class="top-nav">
        <a href="#how-it-works">怎么协作</a>
        <a href="#usecases">适合谁</a>
        <a href="#faq">常见问题</a>
        <a href="#create">创建文档</a>
      </nav>
      <div class="home-account" id="home-account">
        <button class="home-account-trigger" id="home-account-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">登录</button>
        <div class="home-account-panel" id="home-account-panel" role="menu" hidden></div>
      </div>
    </div>
  </header>
  <div class="home-auth-modal" id="home-auth-modal" role="dialog" aria-modal="true" aria-labelledby="home-auth-title" hidden></div>

  <main class="wrap">
    <section class="hero">
      <div class="hero-left reveal">
        <h1>把一个想法，<br />和 <em>Agent</em> 一起写成文档</h1>
        <p class="subtitle">你先写方向，Agent 起草大纲；你补充判断，它再修改润色。Zoon 会保留每段来源：人类是绿色，Agent 是紫色。</p>
        <div class="ctas">
          <button class="primary create-doc-trigger" type="button">免费创建协作文档 →</button>
          <a class="secondary" href="#how-it-works">看一次协作过程</a>
        </div>
      </div>
      <div class="reveal" style="--reveal-delay: 120ms;">
        <div class="mini-editor first-run-demo">
          <div class="chrome">
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            <span class="title">协作文档 · zoon.app</span>
          </div>
          <div class="doc">
            <div class="hero-story-scene" aria-hidden="true">
              <div class="hero-story-doc">
                <div class="hero-story-content">
                  <h3 class="hero-story-title">关于下一代写作工具的想法</h3>
                  <div class="hero-doc-block human hero-idea-card">
                    <span class="hero-speaker-tag">人类写下想法</span><br>
                    <span class="hero-typed-text">我想写一篇关于人类和 Agent 如何共同创作的文章。</span><span class="hero-typed-cursor"></span><br>
                    <span class="hero-mini-invite">邀请 Agent 参加</span>
                  </div>
                  <div class="hero-prompt-card">
                    <div class="hero-prompt-top"><b>复制邀请给 Agent</b><span>Prompt</span></div>
                    <code>请先帮我起草大纲，再等我补充判断。</code>
                  </div>
                  <div class="hero-outline">
                    <strong>Agent 起草大纲并补细节</strong>
                    <p>1. 为什么写作需要协作</p>
                    <p>2. 人类负责方向和判断</p>
                    <p>3. Agent 负责扩展和改写</p>
                  </div>
                  <p class="hero-doc-block human hero-human-add"><span class="hero-speaker-tag">人类直接修改</span><br>把“提高效率”改成“来源透明、修改可控”。</p>
                  <div class="hero-final-draft">
                    <strong>Agent 再次补充</strong>
                    <p>好的协作文档不是让 Agent 代替人类，而是让人类保留判断，让 Agent 把想法扩展成结构清晰的内容。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="feature reveal" data-reveal-group="features">
        <div class="icon">◐</div>
        <h3>溯源 · Provenance</h3>
        <div class="h-sub">你知道哪些字是你的</div>
        <p>左侧彩色边栏追踪每一个字的来源。绿色是你写的，紫色是 Agent 写的，删改插入都有作者。</p>
      </div>
      <div class="feature reveal" data-reveal-group="features">
        <div class="icon">✎</div>
        <h3>直接写入 · Direct Edit</h3>
        <div class="h-sub">Agent 动手不挡路</div>
        <p>Agent 产出的新段落、新章节直接写进文档。紫色标记让你一眼看出是 Agent 写的，点击就能改或删。</p>
      </div>
      <div class="feature reveal" data-reveal-group="features">
        <div class="icon">✓</div>
        <h3>可控修改 · Edit or Delete</h3>
        <div class="h-sub">Agent 写错了你能接住</div>
        <p>不满意 Agent 写的内容？点击那段紫色字手动改、删除，或让 Agent 重写。决定权永远在你。</p>
      </div>
    </section>

    <section class="usecases" id="usecases">
      <div class="section-head reveal">
        <h2>谁在用 Zoon</h2>
        <p>把你习惯的 Agent 工作流搬进一个「作者永远可辨」的文档里。</p>
      </div>
      <div class="usecase-grid">
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">📝</div>
          <h4>产品经理写 PRD</h4>
          <p class="pain">痛点：让 Agent 补需求很快，粘回文档后却分不清哪段是自己想的、哪段是 Agent 补的。</p>
          <p class="solve">Agent 补的段落自动紫色、你写的自动绿色，交付前一眼看清哪段是谁的。</p>
        </div>
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">⚙️</div>
          <h4>工程师写技术文档</h4>
          <p class="pain">痛点：让 Claude Code 帮忙补 README，它一上来就把前面的章节结构也改了。</p>
          <p class="solve">Agent 改哪段紫色就亮哪段，误动了前面章节你立刻看到，撤回只是一步。</p>
        </div>
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">🎓</div>
          <h4>研究者 / 学生写报告</h4>
          <p class="pain">痛点：想用 Agent 辅助又担心学术诚信，最后分不清自己和 Agent 的比例。</p>
          <p class="solve">每一个字都带作者标签，交稿前一眼看清 Agent 贡献占比。</p>
        </div>
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">✍️</div>
          <h4>内容创作者打磨初稿</h4>
          <p class="pain">痛点：交给 Agent 润色后，自己的声音被改得七零八落。</p>
          <p class="solve">Agent 改哪句紫色就亮哪句，不满意就点回去手动重写，原声始终可辨可回。</p>
        </div>
      </div>
    </section>

    <section class="story-section" id="how-it-works" aria-labelledby="story-title">
      <div class="section-head reveal">
        <h2 id="story-title">看一次协作过程</h2>
        <p>不是把一整篇交给 Agent，也不是复制粘贴聊天记录。Zoon 让人类和 Agent 在同一篇文档里轮流推进。</p>
      </div>
      <div class="story-shell">
        <div class="story-steps">
          <article class="story-step reveal is-current" data-story-step="idea">
            <span class="story-step-kicker" data-step-index="1">人类写想法</span>
            <h3>有一个想法</h3>
            <p>先写一个标题或想法，然后点击邀请 Agent 参加。绿色内容代表人类原始判断。</p>
            <div class="mobile-story-visual">
              <div class="mobile-mini-doc">
                <span class="mobile-mini-line human">我想写一篇关于人类和 Agent 如何共同创作的文章。</span>
                <span class="mobile-mini-line human">邀请 Agent 参加</span>
              </div>
            </div>
          </article>
          <article class="story-step reveal" data-story-step="outline">
            <span class="story-step-kicker" data-step-index="2">Agent 起草</span>
            <h3>让 Agent 起草大纲</h3>
            <p>复制邀请给常用 Agent。它读取文档上下文，把大纲和第一轮细节直接写回文档。</p>
            <div class="mobile-story-visual">
              <div class="mobile-mini-doc">
                <span class="mobile-mini-line human">请先帮我起草大纲。</span>
                <span class="mobile-mini-line agent">1. 为什么写作需要协作<br>2. 人类负责方向<br>3. Agent 负责扩展</span>
              </div>
            </div>
          </article>
          <article class="story-step reveal" data-story-step="human">
            <span class="story-step-kicker" data-step-index="3">人类修改</span>
            <h3>人类补充判断</h3>
            <p>你直接修改 Agent 写出的内容，把模糊表达改成自己的判断。绿色修改会留在紫色内容旁边。</p>
            <div class="mobile-story-visual">
              <div class="mobile-mini-doc">
                <span class="mobile-mini-line agent">Agent 起草：人机协作能提高效率。</span>
                <span class="mobile-mini-line human">改成：重点不是速度，而是来源透明和可控。</span>
              </div>
            </div>
          </article>
          <article class="story-step reveal" data-story-step="revise">
            <span class="story-step-kicker" data-step-index="4">Agent 再写</span>
            <h3>Agent 修改润色</h3>
            <p>Agent 根据你的修改继续补充。它可以直接替换正文；需要审阅时，你也可以让它改用评论或建议。</p>
            <div class="mobile-story-visual">
              <div class="mobile-mini-doc">
                <span class="mobile-mini-line human">原句：写作工具应该更聪明。</span>
                <span class="mobile-mini-line agent">Agent 改写：协作文档应该让人类保留判断，让 Agent 扩展表达。</span>
              </div>
            </div>
          </article>
          <article class="story-step reveal" data-story-step="review">
            <span class="story-step-kicker" data-step-index="5">审阅来源</span>
            <h3>审阅并定稿</h3>
            <p>最后看来源栏和紫色段落。任何 Agent 内容都可以直接改、删、重写。</p>
            <div class="mobile-story-visual">
              <div class="mobile-mini-doc">
                <span class="mobile-mini-line human">人类：方向、判断、取舍。</span>
                <span class="mobile-mini-line agent">Agent：大纲、扩展、润色。改 / 删 / 重写</span>
              </div>
            </div>
          </article>
        </div>

        <div class="story-stage-wrap">
          <div class="story-demo" data-active-step="idea" aria-hidden="true">
            <div class="story-progress"><span></span><span></span><span></span><span></span><span></span></div>
            <div class="role-cast">
              <div class="role-card human">
                <span class="role-avatar human"></span>
                <div><b>人类</b><span>标题、判断、确认</span></div>
              </div>
              <span class="role-connector"></span>
              <div class="role-card agent">
                <span class="role-avatar agent"></span>
                <div><b>Agent</b><span>大纲、细节、改写</span></div>
              </div>
            </div>
            <div class="story-doc">
              <h3 class="story-doc-title">下一代写作工具</h3>
              <p class="story-block human story-idea-block">
                <span class="story-label">人类写下想法</span><br>
                <span class="story-idea-text">我想写一篇关于人类和 Agent 如何共同创作的文章。</span><span class="story-cursor"></span><br>
                <span class="hero-mini-invite">邀请 Agent 参加</span>
              </p>
              <div class="story-prompt-card">
                <b>复制邀请给 Agent</b>
                <code>请先帮我起草大纲，并把关键细节写进文档。</code>
              </div>
              <div class="story-block agent story-outline-block">
                <span class="story-label">Agent 起草大纲并完善细节</span>
                <p>1. 为什么写作需要协作</p>
                <p>2. 人类负责方向和判断</p>
                <p>3. Agent 负责扩展、举例和改写</p>
              </div>
              <p class="story-block human story-human-block">
                <span class="story-label">人类直接修改 Agent 内容</span><br>
                把“提高效率”改成“来源透明、修改可控”，让文章观点更准确。
              </p>
              <p class="story-block agent story-revise-block">
                <span class="story-label">Agent 根据人类修改再次补充</span><br>
                <span class="story-revise-original">原句：写作工具应该更聪明。</span>
                <span class="story-revise-new">好的协作文档让人类保留判断，让 Agent 把想法扩展成结构清晰的内容。</span>
              </p>
              <div class="story-confirm-popover">
                <b>来源可见</b>
                <span>评论 / 建议可选</span>
              </div>
              <div class="story-review-actions">
                <span>改</span><span>删</span><span>重写</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="testimonials" hidden style="display:none">
      <div class="section-head reveal">
        <h2>早期用户怎么说</h2>
      </div>
      <div class="t-grid">
        <div class="t-card c1 reveal" data-reveal-group="testimonials">
          <div class="quote-mark">"</div>
          <blockquote>以前让 AI 改 PRD，我得逐字 diff 才敢接受。Zoon 里 agent 直接把新段落写进来，紫色一眼能看出是它加的——我扫一遍就行，哪句不顺点一下那段，改或者删，不用来回点批注。</blockquote>
          <div class="attr">
            <div class="avatar">林</div>
            <div class="attr-text"><strong>林</strong>产品经理</div>
          </div>
        </div>
        <div class="t-card c2 reveal" data-reveal-group="testimonials">
          <div class="quote-mark">"</div>
          <blockquote>README 写到一半让 Claude 补 API 示例，以前只能靠聊天记录猜它改了哪里。Zoon 里它直接写文档，来源和事件都能看见，想删想改点那段就行。</blockquote>
          <div class="attr">
            <div class="avatar">A</div>
            <div class="attr-text"><strong>Alex</strong>后端工程师</div>
          </div>
        </div>
        <div class="t-card c3 reveal" data-reveal-group="testimonials">
          <div class="quote-mark">"</div>
          <blockquote>写论文时最怕的就是分不清哪些是自己想的、哪些是 ChatGPT 润色的。Zoon 左边那条彩色边栏让我导师一眼看清，我也终于睡得着了。</blockquote>
          <div class="attr">
            <div class="avatar">子</div>
            <div class="attr-text"><strong>子琪</strong>研究生</div>
          </div>
        </div>
      </div>
    </section>

    <section class="faq" id="faq">
      <div class="section-head reveal">
        <h2>第一次使用，先回答几个问题</h2>
        <p>Zoon 不是另一个聊天窗口。它是一个 AI 能直接写入、但作者身份始终可见的文档。</p>
      </div>
      <div class="faq-grid">
        <div class="faq-item reveal" data-reveal-group="faq">
          <div class="faq-kicker">Control</div>
          <h4>AI 会自动读我的文档吗？</h4>
          <p>不会。你创建文档后先看到协作引导卡，只有当你复制邀请并给 AI 任务后，它才读取并写入。</p>
        </div>
        <div class="faq-item reveal" data-reveal-group="faq">
          <div class="faq-kicker">Edit</div>
          <h4>不喜欢 AI 写的内容怎么办？</h4>
          <p>AI 新写内容会显示为紫色。你可以直接点击紫色段落修改、删除，或让 agent 重新写。</p>
        </div>
        <div class="faq-item reveal" data-reveal-group="faq">
          <div class="faq-kicker">Start</div>
          <h4>一定要安装 Skill 吗？</h4>
          <p>不一定。新手只要复制邀请提示词给常用 AI 工具就能开始；Skill 和 API 文档是高级入口。</p>
        </div>
        <div class="faq-item reveal" data-reveal-group="faq">
          <div class="faq-kicker">Why</div>
          <h4>和普通 AI 文档有什么不同？</h4>
          <p>Zoon 的重点不是生成更多文字，而是让人类和 AI 在同一篇文档里协作，并且每个字都能看出来源。</p>
        </div>
      </div>
    </section>

    <section class="agent-block" id="for-agents">
      <div class="section-head reveal">
        <span class="eyebrow">Install once · 一次接入</span>
        <h2>邀请 Agent 加入</h2>
        <p>粘给 Claude Code、Codex、Cursor 或 ChatGPT——你给任务后，它再读取文档并直接写进来（紫色标记 AI 作者），你随时改或删。</p>
      </div>

      <div class="agent-invite reveal">
        <div class="agent-hint">
          把下面这段<strong>整段粘贴</strong>给任意 agent（Claude Code、Codex、Cursor、ChatGPT 都吃这一招）—— 它会读取 Zoon 的 skill。等你给任务后，它再读取文档并写入新内容（紫色标记 AI 作者），你看到哪段不对点一下就改。
        </div>

        <button type="button" class="primary big-copy" id="copy-agent-invite">复制给 Agent</button>

        <div class="code-block agent-preview">
<span class="agent-content" id="agent-invite-content">${escapeHtml(universalSkillPrompt)}</span>
        </div>

        <details class="agent-advanced">
          <summary>高级：装成 Claude Code 插件（持久化斜杠命令）</summary>
          <p class="advanced-note">
            只有想让 Claude Code <strong>永久记住</strong>这个 skill 才需要走这条路。上面那段"复制给 Agent"已经覆盖 99% 的使用场景。<br>
            <strong>两条命令必须分两次粘贴、分两次执行</strong>—— 合起来粘会被当成一条命令，clone 目录名会带着第二行一起崩掉。
          </p>
          <div class="advanced-step">
            <div class="step-head">
              <span class="step-num">1</span>
              <span class="step-label">添加 marketplace</span>
              <button type="button" class="step-copy" data-copy-target="advanced-cmd-1">复制</button>
            </div>
            <div class="code-block step-cmd"><span id="advanced-cmd-1">${escapeHtml(ccMarketplaceAddCmd)}</span></div>
          </div>
          <div class="advanced-step">
            <div class="step-head">
              <span class="step-num">2</span>
              <span class="step-label">安装 plugin</span>
              <button type="button" class="step-copy" data-copy-target="advanced-cmd-2">复制</button>
            </div>
            <div class="code-block step-cmd"><span id="advanced-cmd-2">${escapeHtml(ccPluginInstallCmd)}</span></div>
          </div>
        </details>

        <div class="agent-footnote">
          <a href="${skillRepoUrl}" target="_blank" rel="noopener noreferrer">Skill 源代码</a>
          <span class="sep">·</span>
          <a href="/skill" target="_blank" rel="noopener noreferrer">完整 SKILL.md</a>
          <span class="sep">·</span>
          <a href="/agent-docs">API 文档</a>
        </div>
      </div>
    </section>

    <section class="cta-bottom" id="create">
      <h2>准备好和 Agent 一起写了吗？</h2>
      <p>文档永不丢，AI 的字和你的字永远可辨。</p>
      <button class="primary big-cta create-doc-trigger" type="button">免费创建协作文档 →</button>
    </section>
  </main>

  <footer>
    <div class="wrap">
      Zoon · 人机协作文档编辑器 · MIT 开源
    </div>
  </footer>

  <script>${HOMEPAGE_SCRIPT}</script>
</body>
</html>`;
}
