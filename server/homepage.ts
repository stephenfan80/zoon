/**
 * Zoon 首页（人类入口）
 *
 * 服务端直接返回完整 HTML，不走 Vite 构建。零依赖，方便独立维护。
 * 视觉方向：Playful Organic — 暖米底 + 橄榄绿 accent + 软彩色点缀。
 * 双色溯源：绿 #88c2a0（人类） / 紫 #b9a5e8（AI）。
 *
 * 创建文档走 POST /api/public/documents（无鉴权、IP 限速），成功后跳转到
 * /d/<slug>?token=...&welcome=1，由 src/ui/welcome-card.ts 弹出欢迎弹窗。
 */

const HOMEPAGE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
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
    display: flex; justify-content: space-between; align-items: center;
    padding: 24px 28px; max-width: 1080px; margin: 0 auto;
  }
  .logo {
    font-family: 'Fraunces', "Iowan Old Style", Georgia, serif;
    font-size: 24px; font-weight: 600; letter-spacing: -0.8px; color: var(--ink);
  }
  .logo-dot { color: var(--accent); font-style: italic; }
  nav.top-nav { display: flex; gap: 22px; font-size: 14px; }
  nav.top-nav a { color: var(--muted); font-weight: 500; }
  nav.top-nav a:hover { color: var(--ink); }

  /* ================ HERO ================ */
  .hero {
    display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 52px;
    align-items: center; padding: 56px 0 64px;
  }
  .hero-left h1 {
    font-family: 'Fraunces', "Iowan Old Style", Georgia, serif;
    font-size: 64px; font-weight: 500; letter-spacing: -2px; line-height: 1.02;
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
    .hero-left h1 { font-size: 48px; letter-spacing: -1.5px; }
    .mini-editor p.h { font-size: 22px; }
    .mini-editor .doc { min-height: 320px; padding: 28px 28px 26px; }
  }
  @media (max-width: 720px) {
    .hero-left h1 { font-size: 40px; }
    .hero-left p.subtitle { font-size: 16px; }
    .features { grid-template-columns: 1fr; }
    .usecase-grid { grid-template-columns: 1fr; }
    .steps { grid-template-columns: 1fr 1fr; }
    .t-grid { grid-template-columns: 1fr; }
    .t-card.c1, .t-card.c3 { transform: none; }
    header { padding: 16px 20px; }
    .section-head h2 { font-size: 32px; }
    body::before, body::after { display: none; }
    .code-block { padding: 18px 18px; font-size: 12px; }
    .big-copy { padding: 14px 28px; font-size: 15px; }
    .cta-bottom h2 { font-size: 32px; }
    .cta-bottom { padding: 56px 0 32px; }
    .mini-editor p.h { font-size: 20px; }
    .mini-editor p.para { font-size: 15px; }
    .mini-editor .doc { padding: 24px 22px 22px; min-height: 280px; }
    .mini-editor .status-pill { top: 56px; right: 14px; font-size: 11px; padding: 5px 10px; }
    .mini-editor .comment-card { padding: 12px 14px; }
    .mini-editor .comment-card .c-text { font-size: 13px; }
  }
  @media (max-width: 420px) {
    .steps { grid-template-columns: 1fr; }
    .hero-left h1 { font-size: 36px; }
    .mini-editor p.h { font-size: 19px; }
    .mini-editor p.para { font-size: 14px; margin-bottom: 12px; }
    .mini-editor .doc { padding: 20px 18px; min-height: 260px; }
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

  // 创建新文档：hero 和 cta-bottom 两处按钮共用
  document.querySelectorAll('.create-doc-trigger').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '创建中…';
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
  // 偏好、不提批注/拍板。加入阶段 ≤ 3 个往返。
  const universalSkillPrompt =
    `Fetch the skill at ${origin}/skill (served as text/markdown — one request, no hunting through the repo). Then, if I gave you a doc, POST your presence to it. Reply in my language with 2 short sentences: (1) confirm you joined and are ready, (2) one line on what you can do in Zoon generically — read the doc and write new content directly into the body (shown purple for AI-authored, so I can click any span to revise or delete). Do NOT pre-read the doc, do NOT list 2–3 doc-specific suggestions, do NOT ask about my long-output preferences, do NOT dump protocol rules or API endpoints. If I haven't given you a doc URL yet, just say you're ready and wait for me to send a Zoon link or tell you what to work on.`;
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
    <nav class="top-nav">
      <a href="#for-agents">For Agents</a>
      <a href="/skill">Skill</a>
      <a href="/agent-docs">API 文档</a>
    </nav>
  </header>

  <main class="wrap">
    <section class="hero">
      <div class="hero-left reveal">
        <h1>和 <em>Agent</em><br />一起写作的文档</h1>
        <p class="subtitle">每一段文字都知道是谁写的。AI 帮你，但不擅自改你。快速、免费、无需登录。</p>
        <div class="ctas">
          <button class="primary create-doc-trigger" type="button">创建新文档 →</button>
          <a class="secondary" href="/skill">了解紫色身份标记</a>
        </div>
      </div>
      <div class="reveal" style="--reveal-delay: 120ms;">
        <div class="mini-editor">
          <div class="chrome">
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            <span class="title">Barista Pro 上市计划 · zoon.app</span>
          </div>
          <span class="status-pill" aria-label="Claude Code 协作中">Claude Code · 协作中</span>
          <div class="doc">
            <p class="para h human">Barista Pro 上市计划</p>
            <p class="para human">目前流量主要来自自然搜索，转化率 5.2%。</p>
            <p class="para human editing">
              <span class="text-original">我们下个月主推新款咖啡机，目标提升销量<span class="cursor"></span></span>
              <span class="text-new">下月主推 Barista Pro 咖啡机，目标周销 500 台</span>
            </p>
            <div class="comment-card" aria-hidden="true">
              <div class="c-row human">
                <span class="c-avatar">你</span>
                <div class="c-body">
                  <div class="c-author">你</div>
                  <div class="c-text">这一句太虚，改得更具体可衡量。</div>
                </div>
              </div>
              <div class="c-row ai">
                <span class="c-avatar">AI</span>
                <div class="c-body">
                  <div class="c-author">Claude <span class="c-badge">AI</span></div>
                  <div class="c-text">建议：<strong>「下月主推 Barista Pro 咖啡机，目标周销 500 台」</strong></div>
                  <div class="c-actions">
                    <span class="ack-btn">拍板</span>
                    <span class="reject-btn">再想想</span>
                  </div>
                  <div class="c-caption">（小修模式 · 长文见下方）</div>
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
        <p>左侧彩色边栏追踪每一个字的来源。绿色是你写的，紫色是 AI 写的，删改插入都有作者。</p>
      </div>
      <div class="feature reveal" data-reveal-group="features">
        <div class="icon">✎</div>
        <h3>直接写入 · Direct Edit</h3>
        <div class="h-sub">Agent 动手不挡路</div>
        <p>Agent 产出的新段落、新章节直接写进文档。紫色标记让你一眼看出是 AI 写的，点击就能改或删。</p>
      </div>
      <div class="feature reveal" data-reveal-group="features">
        <div class="icon">✓</div>
        <h3>一键回滚 · Revert</h3>
        <div class="h-sub">改错了随时撤</div>
        <p>不满意 agent 写的内容？点击那段紫色字手动改、删除，或让 agent 重写。决定权永远在你。</p>
      </div>
    </section>

    <section class="usecases">
      <div class="section-head reveal">
        <h2>谁在用 Zoon</h2>
        <p>把你习惯的 AI 工作流搬进一个「作者永远可辨」的文档里。</p>
      </div>
      <div class="usecase-grid">
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">📝</div>
          <h4>产品经理写 PRD</h4>
          <p class="pain">痛点：让 AI 补需求很快，粘回文档后却分不清哪段是自己想的、哪段是 AI 补的。</p>
          <p class="solve">AI 补的段落自动紫色、你写的自动绿色，交付前一眼看清哪段是谁的。</p>
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
          <p class="pain">痛点：想用 AI 辅助又担心学术诚信，最后分不清自己和 AI 的比例。</p>
          <p class="solve">每一个字都带作者标签，交稿前一眼看清 AI 贡献占比。</p>
        </div>
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">✍️</div>
          <h4>内容创作者打磨初稿</h4>
          <p class="pain">痛点：交给 GPT 润色后，自己的声音被改得七零八落。</p>
          <p class="solve">AI 改哪句紫色就亮哪句，不满意就点回去手动重写，原声始终可辨可回。</p>
        </div>
      </div>
    </section>

    <section class="howto">
      <div class="section-head reveal">
        <h2>四步开始协作</h2>
      </div>
      <div class="steps">
        <span class="step-connector c1" aria-hidden="true"></span>
        <span class="step-connector c2" aria-hidden="true"></span>
        <span class="step-connector c3" aria-hidden="true"></span>
        <div class="step reveal" data-reveal-group="steps">
          <div class="step-visual">
            <div class="m-doc">
              <div class="m-line w40"></div>
              <div class="m-line w70"></div>
              <div><span class="m-cursor"></span></div>
            </div>
          </div>
          <div class="step-body">
            <span class="step-num">Step 01</span>
            <h4>创建文档</h4>
            <p>点「创建新文档」，秒开空白编辑器。</p>
          </div>
        </div>
        <div class="step reveal" data-reveal-group="steps">
          <div class="step-visual">
            <div class="m-code">
              <span class="m-copy-pill">Copy ✓</span>
              <div class="m-code-line hl">curl zoon.doc/d/</div>
              <div class="m-code-line">Read: Accept: json</div>
              <div class="m-code-line">POST edit/v2 · insert</div>
              <div class="m-code-line">紫色标记 · AI 作者</div>
            </div>
          </div>
          <div class="step-body">
            <span class="step-num">Step 02</span>
            <h4>邀请 Agent</h4>
            <p>弹窗里复制提示词，粘贴给 Claude Code、Cursor 或任意 AI 工具。</p>
          </div>
        </div>
        <div class="step reveal" data-reveal-group="steps">
          <div class="step-visual">
            <div class="m-doc with-comment">
              <div class="m-line w90"></div>
              <div class="m-line w70"></div>
              <div class="m-line w60"></div>
            </div>
            <div class="m-bubble">
              新写一段<br>
              <b>紫色 · AI</b>
            </div>
          </div>
          <div class="step-body">
            <span class="step-num">Step 03</span>
            <h4>协作与改写</h4>
            <p>Agent 读完文档直接动手，新写的内容用紫色标记，你随时能改或删。</p>
          </div>
        </div>
        <div class="step reveal" data-reveal-group="steps">
          <div class="step-visual">
            <div class="m-doc with-gutter">
              <div class="m-gutter">
                <span class="g-h"></span>
                <span class="g-a"></span>
                <span class="g-h"></span>
                <span class="g-a"></span>
              </div>
              <div class="m-line w90"></div>
              <div class="m-line w70"></div>
              <div class="m-line w60"></div>
              <div class="m-line w40"></div>
            </div>
          </div>
          <div class="step-body">
            <span class="step-num">Step 04</span>
            <h4>协作成文</h4>
            <p>每一个字都清晰标注来源，分享链接给其他人继续协作。</p>
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
          <blockquote>README 写到一半让 Claude 补 API 示例，以前它顺手把我前面的章节结构也动了。Zoon 里它写的都是紫色新段——我原来的字一个没动，想删想改点那段就行。</blockquote>
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

    <section class="agent-block" id="for-agents">
      <div class="section-head reveal">
        <span class="eyebrow">Install once · 一次接入</span>
        <h2>邀请 Agent 加入</h2>
        <p>粘给 Claude Code、Codex、Cursor 或 ChatGPT——之后它自动读文档、直接写进来（紫色标记 AI 作者），你随时改或删。</p>
      </div>

      <div class="agent-invite reveal">
        <div class="agent-hint">
          把下面这段<strong>整段粘贴</strong>给任意 agent（Claude Code、Codex、Cursor、ChatGPT 都吃这一招）—— 它会自己去 GitHub 读 SKILL.md，之后默认直接写进文档（紫色标记 AI 作者），你看到哪段不对点一下就改。
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

    <section class="cta-bottom">
      <h2>准备好和 Agent 一起写了吗？</h2>
      <p>文档永不丢，AI 的字和你的字永远可辨。</p>
      <button class="primary big-cta create-doc-trigger" type="button">创建新文档 →</button>
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
