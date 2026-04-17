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
    display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px;
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
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(74, 93, 58, .12), 0 4px 12px rgba(74, 93, 58, .06);
    overflow: hidden; position: relative;
    transform: rotate(-1deg);
    transition: transform .3s ease;
  }
  .mini-editor:hover { transform: rotate(-0.2deg) translateY(-2px); }
  .mini-editor .chrome {
    display: flex; align-items: center; gap: 7px;
    padding: 12px 16px; border-bottom: 1px dashed var(--line);
    background: rgba(232, 225, 209, .3);
  }
  .mini-editor .chrome .dot { width: 10px; height: 10px; border-radius: 50%; }
  .mini-editor .chrome .dot:nth-child(1) { background: var(--coral); }
  .mini-editor .chrome .dot:nth-child(2) { background: var(--gold); }
  .mini-editor .chrome .dot:nth-child(3) { background: var(--human); }
  .mini-editor .chrome .title {
    margin-left: 12px; font-size: 12px; color: var(--muted); font-style: italic;
  }
  .mini-editor .doc {
    padding: 24px 26px 30px; min-height: 260px; position: relative;
  }
  .mini-editor p.para {
    position: relative; padding-left: 14px; margin-bottom: 14px;
    font-size: 14px; line-height: 1.65; color: var(--ink);
  }
  .mini-editor p.para::before {
    content: ''; position: absolute; left: 0; top: 3px; bottom: 3px;
    width: 4px; border-radius: 3px;
  }
  .mini-editor p.h { font-weight: 600; font-size: 15px; margin-bottom: 10px; }
  .mini-editor p.h::before { background: var(--human); }
  .mini-editor p.human::before { background: var(--human); }
  .mini-editor p.ai::before { background: var(--ai); }
  .mini-editor .editing { position: relative; }
  .mini-editor .editing .text-original,
  .mini-editor .editing .text-new { display: inline-block; }
  .mini-editor .editing .text-new {
    opacity: 0; position: absolute; top: 0; left: 14px;
  }
  .mini-editor .comment {
    position: absolute; top: 128px; right: 14px;
    background: var(--surface); border: 1.5px solid var(--ai);
    border-radius: 14px; padding: 10px 12px;
    box-shadow: 0 8px 20px rgba(74, 93, 58, .15);
    font-size: 12px; line-height: 1.5; color: var(--ink);
    width: 200px; opacity: 0;
    transform: translateY(8px) scale(.95);
  }
  .mini-editor .comment::before {
    content: ''; position: absolute; left: -7px; top: 16px;
    border: 7px solid transparent; border-right-color: var(--surface);
    filter: drop-shadow(-1.5px 0 0 var(--ai));
  }
  .mini-editor .comment .agent {
    font-size: 11px; color: var(--ai); font-weight: 700; margin-bottom: 4px;
  }
  .mini-editor .ack-btn {
    position: absolute; top: 116px; right: 228px;
    padding: 6px 14px; border-radius: 999px;
    background: var(--accent); color: #fff;
    font-size: 12px; font-weight: 700; letter-spacing: 1px;
    box-shadow: 0 4px 10px rgba(74, 93, 58, .35);
    opacity: 0;
  }
  .mini-editor .cursor {
    display: inline-block; width: 2px; height: 14px; vertical-align: -2px;
    background: var(--accent); margin-left: 2px;
    animation: blink 1s steps(2) infinite, cursor-hide 8s ease-in-out infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes cursor-hide { 0%, 35% { opacity: 1; } 40%, 100% { opacity: 0; } }

  .mini-editor .editing .text-original { animation: fadeout 8s ease-in-out infinite; }
  .mini-editor .editing .text-new { animation: fadein 8s ease-in-out infinite; }
  .mini-editor .editing::before { animation: bar 8s ease-in-out infinite; }
  .mini-editor .comment { animation: comment-pop 8s ease-in-out infinite; }
  .mini-editor .ack-btn { animation: ack-pop 8s ease-in-out infinite; }
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
    0%, 20% { opacity: 0; transform: translateY(8px) scale(.95); }
    25%, 55% { opacity: 1; transform: translateY(0) scale(1); }
    60%, 100% { opacity: 0; transform: translateY(-8px) scale(.95); }
  }
  @keyframes ack-pop {
    0%, 45% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1.15); }
    55%, 62% { opacity: 1; transform: scale(1); }
    67%, 100% { opacity: 0; transform: scale(.6); }
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
    .mini-editor .comment,
    .mini-editor .ack-btn,
    .mini-editor .cursor { animation: none; }
    .mini-editor .editing .text-original { opacity: 1; }
    .mini-editor .editing .text-new { opacity: 0; }
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
  .agent-block { padding: 48px 0 64px; }
  .agent-tabs { max-width: 820px; margin: 0 auto; }
  .tab-list {
    display: inline-flex; gap: 4px; padding: 4px;
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 14px; margin-bottom: 22px;
  }
  .tab-btn {
    background: transparent; border: none;
    padding: 10px 20px; font-size: 14px; font-weight: 500;
    color: var(--muted); cursor: pointer;
    border-radius: 10px; font-family: inherit;
    transition: background .18s ease, color .18s ease, box-shadow .18s ease;
    display: inline-flex; align-items: center; gap: 7px;
  }
  .tab-btn:hover:not(.active) { color: var(--ink); background: rgba(43, 42, 34, .04); }
  .tab-btn.active {
    background: #fff; color: var(--ink); font-weight: 600;
    box-shadow: 0 1px 3px rgba(43, 42, 34, .08), 0 0 0 1px rgba(74, 93, 58, .18);
  }
  .tab-badge {
    display: inline-block; background: var(--accent); color: #fff;
    font-size: 10px; font-weight: 700; padding: 2px 7px;
    border-radius: 999px; letter-spacing: 0.4px;
    line-height: 1.4;
  }

  /* 二级选择器：agent 类型切换 */
  .agent-picker {
    display: inline-flex; gap: 3px; padding: 3px;
    background: var(--bg); border: 1px solid var(--line);
    border-radius: 10px; margin-bottom: 14px;
  }
  .agent-pill {
    background: transparent; border: none;
    padding: 7px 14px; font-size: 13px; font-weight: 500;
    color: var(--muted); cursor: pointer;
    border-radius: 7px; font-family: inherit;
    transition: background .15s ease, color .15s ease;
  }
  .agent-pill:hover:not(.active) { color: var(--ink); }
  .agent-pill.active { background: var(--ink); color: #fcfaf2; }
  .agent-snippet { display: none; }
  .agent-snippet.active { display: block; animation: tab-fade-in 200ms ease-out; }
  .snippet-hint {
    font-size: 13px; color: var(--muted);
    margin-bottom: 8px; line-height: 1.5;
  }
  .snippet-hint strong { color: var(--ink); font-weight: 600; }
  .snippet-hint code {
    font-family: "SF Mono", Menlo, monospace;
    font-size: 12px; background: var(--bg);
    padding: 1px 6px; border-radius: 4px;
    border: 1px solid var(--line); color: var(--accent);
  }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; animation: tab-fade-in 240ms ease-out; }
  @keyframes tab-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .skill-pitch {
    font-size: 14px; color: var(--ink);
    margin-bottom: 14px; line-height: 1.65;
    padding: 14px 18px; background: var(--surface);
    border-left: 3px solid var(--accent); border-radius: 4px;
  }
  .skill-pitch strong { color: var(--accent); font-weight: 600; }
  .skill-repo-link {
    display: inline-block; margin-top: 14px;
    font-size: 13px; color: var(--accent);
    text-decoration: none; font-weight: 500;
    border-bottom: 1px dashed var(--accent);
    padding-bottom: 1px;
  }
  .skill-repo-link:hover { color: var(--accent-dark); border-color: var(--accent-dark); }

  .url-field {
    display: block; font-size: 13px; color: var(--muted);
    margin-bottom: 6px; font-weight: 500;
  }
  .url-input {
    width: 100%; padding: 12px 16px;
    background: var(--surface); border: 1.5px solid var(--line);
    border-radius: 10px; font-size: 14px;
    font-family: "SF Mono", Menlo, monospace;
    color: var(--ink); outline: none;
    transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    margin-bottom: 14px; box-sizing: border-box;
  }
  .url-input::placeholder { color: #b4ac98; }
  .url-input:focus {
    border-color: var(--accent); background: #fff;
    box-shadow: 0 0 0 3px rgba(74, 93, 58, .12);
  }

  .code-block {
    position: relative;
    background: #2b2a22; color: #ede4cd;
    font-family: "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 13px; line-height: 1.65;
    border-radius: 16px; padding: 22px 26px;
    white-space: pre-wrap; word-break: break-word;
    overflow-x: auto;
    box-shadow: 0 10px 30px rgba(74, 93, 58, .15);
  }
  .copy-btn {
    position: absolute; top: 14px; right: 14px;
    background: rgba(255,255,255,0.12); color: #ede4cd;
    border: none; border-radius: 8px;
    padding: 7px 12px; font-size: 12px; cursor: pointer;
    font-family: inherit; font-weight: 500;
    transition: background .15s ease, opacity .15s ease;
  }
  .copy-btn:hover:not([disabled]) { background: rgba(255,255,255,0.2); }
  .copy-btn[disabled] {
    background: rgba(255,255,255,0.06); color: rgba(237,228,205,0.4);
    cursor: not-allowed;
  }
  .code-block.prompt-preview[data-empty="true"] { opacity: 0.78; }
  .token-placeholder {
    background: rgba(185, 165, 232, 0.22);
    color: #d4c0f5;
    padding: 1px 5px; border-radius: 3px;
    font-weight: 500;
    border: 1px dashed rgba(185, 165, 232, 0.5);
  }
  .token-live {
    background: rgba(136, 194, 160, 0.22);
    color: #a8dfbf;
    padding: 1px 5px; border-radius: 3px;
    font-weight: 500;
  }

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
    .mini-editor { transform: rotate(-0.5deg); }
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
    .tab-btn { padding: 10px 12px 12px; font-size: 13px; }
    .code-block { padding: 18px 18px; font-size: 12px; }
    .copy-btn { top: 10px; right: 10px; padding: 6px 10px; font-size: 11px; }
  }
  @media (max-width: 420px) {
    .steps { grid-template-columns: 1fr; }
    .hero-left h1 { font-size: 36px; }
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
      if (btn.disabled) return;
      var block = document.getElementById(btn.getAttribute('data-target'));
      if (!block) return;
      // 克隆并剔除按钮，避免把按钮文字一起复制进去
      var clone = block.cloneNode(true);
      clone.querySelectorAll('button').forEach(function (b) { b.remove(); });
      var text = (clone.textContent || '').trim();
      var original = btn.textContent;
      var ok = await writeClipboard(text);
      btn.textContent = ok ? '已复制' : '复制失败';
      setTimeout(function () { btn.textContent = original; }, 1500);
    });
  });

  // Tab 切换：安装 Skill ↔ Prompt 模板
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(function (p) {
        p.classList.remove('active');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      var panel = document.querySelector('.tab-panel[data-panel="' + tab + '"]');
      if (panel) panel.classList.add('active');
    });
  });

  // Agent 选择器（Claude Code / Codex / 仅链接）
  document.querySelectorAll('.agent-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      var name = pill.getAttribute('data-agent');
      document.querySelectorAll('.agent-pill').forEach(function (p) {
        p.classList.remove('active');
        p.setAttribute('aria-checked', 'false');
      });
      document.querySelectorAll('.agent-snippet').forEach(function (s) {
        s.classList.remove('active');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-checked', 'true');
      var snip = document.querySelector('.agent-snippet[data-snippet="' + name + '"]');
      if (snip) snip.classList.add('active');
    });
  });

  // 文档链接输入框 → 实时替换 Prompt 里的占位符 + 解锁复制按钮
  var urlInput = document.getElementById('zoon-url');
  var urlSlot = document.getElementById('url-slot');
  var previewBlock = document.getElementById('agent-prompt-preview');
  if (urlInput && urlSlot && previewBlock) {
    var previewCopyBtn = previewBlock.querySelector('.copy-btn');
    urlInput.addEventListener('input', function () {
      var v = (urlInput.value || '').trim();
      if (v) {
        urlSlot.textContent = v;
        urlSlot.className = 'token-live';
        previewBlock.setAttribute('data-empty', 'false');
        if (previewCopyBtn) {
          previewCopyBtn.disabled = false;
          previewCopyBtn.textContent = '复制完整 Prompt';
        }
      } else {
        urlSlot.textContent = '<先粘贴你的文档链接>';
        urlSlot.className = 'token-placeholder';
        previewBlock.setAttribute('data-empty', 'true');
        if (previewCopyBtn) {
          previewCopyBtn.disabled = true;
          previewCopyBtn.textContent = '先粘链接';
        }
      }
    });
  }

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
  // 站内外 agent 拉取 skill 的标准 snippet，放在首页可复制区
  const skillUrl = `${origin}/skill`;
  // Claude Code plugin marketplace 两步命令
  const ccInstallCmd =
    `/plugin marketplace add stephenfan80/human-agent-collab\n` +
    `/plugin install zoon@human-agent-collab`;
  // Codex / 其他可读 URL 的 agent — 一句话指令
  const universalSkillPrompt =
    `Load and follow the skill at https://github.com/stephenfan80/human-agent-collab — it's a short SKILL.md that explains how to collaborate with me on Zoon documents via the 拍板 (Ack) protocol. After reading it, wait for my doc URL.`;
  // 最简：只给 repo 链接，让 agent 自己读
  const skillRepoUrl = `https://github.com/stephenfan80/human-agent-collab`;
  // Prompt 模板中"skill URL"是服务端固定值；文档 URL 由用户在浏览器填入，JS 注入
  const promptPreviewTail =
    `Before writing anything, fetch the skill at ${skillUrl} and follow it exactly.\n` +
    `Zoon is a human-AI collaborative editor: read my doc first, then leave comment\n` +
    `suggestions. Don't edit until I click 「拍板」 on your comment (legacy 👍 signal also works).`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zoon — 和 Agent 一起写作的文档</title>
  <meta name="description" content="Zoon 是一个人机协作文档编辑器。绿色边栏标记你写的字，紫色标记 AI 写的字，Agent 通过批注提议，你点「拍板」它才动手。" />
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
          <button id="create-doc" class="primary" type="button">创建新文档 →</button>
          <a class="secondary" href="/skill">了解「拍板协议」</a>
        </div>
      </div>
      <div class="reveal" style="--reveal-delay: 120ms;">
        <div class="mini-editor">
          <div class="chrome">
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            <span class="title">Barista Pro 上市计划 · zoon.app</span>
          </div>
          <div class="doc">
            <p class="para h human">Barista Pro 上市计划</p>
            <p class="para human">目前流量主要来自自然搜索，转化率 5.2%。</p>
            <p class="para human editing">
              <span class="text-original">我们下个月主推新款咖啡机，目标提升销量<span class="cursor"></span></span>
              <span class="text-new">下月主推 Barista Pro 咖啡机，目标周销 500 台</span>
            </p>
            <p class="para human">下周先跑一轮 landing page 的 A/B 实验验证假设。</p>
            <div class="comment">
              <div class="agent">💬 Claude</div>
              建议改得更具体可衡量：<strong>『下月主推 Barista Pro，目标周销 500 台』</strong>
            </div>
            <div class="ack-btn">拍板</div>
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
        <h3>批注 · Comments</h3>
        <div class="h-sub">AI 不会偷偷改你的文档</div>
        <p>Agent 不会直接改你的文档。它在批注里说明想改什么、为什么改，你看完再拍板。</p>
      </div>
      <div class="feature reveal" data-reveal-group="features">
        <div class="icon">✓</div>
        <h3>拍板协议 · Ack</h3>
        <div class="h-sub">你永远是拍板的人</div>
        <p>你点一下「拍板」，Agent 才动手改。追问或拒绝，它重新提方案。你始终掌握最终决定权。</p>
      </div>
    </section>

    <section class="usecases">
      <div class="section-head reveal">
        <h2>谁在用 Zoon</h2>
        <p>把你习惯的 AI 工作流搬进一个「你拍板」的文档里。</p>
      </div>
      <div class="usecase-grid">
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">📝</div>
          <h4>产品经理写 PRD</h4>
          <p class="pain">痛点：让 AI 补需求很快，粘回文档后却分不清哪段是自己想的、哪段是 AI 补的。</p>
          <p class="solve">绿/紫边栏一眼看清作者，AI 建议先进批注，你拍板再落笔。</p>
        </div>
        <div class="usecase reveal" data-reveal-group="usecases">
          <div class="emoji">⚙️</div>
          <h4>工程师写技术文档</h4>
          <p class="pain">痛点：让 Claude Code 帮忙补 README，它一上来就把前面的章节结构也改了。</p>
          <p class="solve">「拍板协议」下 agent 只提不改，你的表达风格和文档结构都保得住。</p>
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
          <p class="solve">AI 的改动逐条进批注，你一条一条拍板或追问，原声不丢。</p>
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
              <div class="m-code-line">POST ops · comment</div>
              <div class="m-code-line">Wait for 「拍板」</div>
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
              建议改得更具体<br>
              <b>「拍板」</b>
            </div>
          </div>
          <div class="step-body">
            <span class="step-num">Step 03</span>
            <h4>对话与批注</h4>
            <p>Agent 读完文档，在批注里提方案，等你点「拍板」。</p>
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

    <section class="testimonials">
      <div class="section-head reveal">
        <h2>早期用户怎么说</h2>
      </div>
      <div class="t-grid">
        <div class="t-card c1 reveal" data-reveal-group="testimonials">
          <div class="quote-mark">"</div>
          <blockquote>之前用 Cursor 写 PRD，AI 改完我要逐字 diff 才敢接受。Zoon 的「拍板协议」让我省掉了这一步——agent 只提建议，我点一下"拍板"它才改，心里踏实。</blockquote>
          <div class="attr">
            <div class="avatar">林</div>
            <div class="attr-text"><strong>林</strong>产品经理</div>
          </div>
        </div>
        <div class="t-card c2 reveal" data-reveal-group="testimonials">
          <div class="quote-mark">"</div>
          <blockquote>README 写到一半让 Claude Code 帮忙补 API 示例，它直接把我前面的章节结构也动了。换到 Zoon 后它只在批注里提建议，我自己决定要不要合。</blockquote>
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
        <h2>把 Zoon 接进你的 Agent</h2>
        <p>支持 HTTP 的 AI 工具都能按「拍板协议」跟你协作。Claude Code 用户一行命令装 Skill；其他工具用 Prompt 模板。</p>
      </div>

      <div class="agent-tabs reveal">
        <div class="tab-list" role="tablist">
          <button class="tab-btn active" data-tab="skill" role="tab" aria-selected="true">
            <span class="tab-badge">推荐</span>
            安装 Agent Skill
          </button>
          <button class="tab-btn" data-tab="prompt" role="tab" aria-selected="false">
            Prompt 模板
          </button>
        </div>

        <div class="tab-panel active" data-panel="skill" role="tabpanel">
          <div class="skill-pitch">
            <strong>一次安装，持续协作。</strong>Agent 按拍板协议读文档、提议批注、等你「拍板」后落笔，不用每次粘贴提示词。
          </div>

          <div class="agent-picker" role="radiogroup" aria-label="选择你使用的 AI 工具">
            <button class="agent-pill active" data-agent="claude" role="radio" aria-checked="true">Claude Code</button>
            <button class="agent-pill" data-agent="codex" role="radio" aria-checked="false">Codex · 其他 Agent</button>
            <button class="agent-pill" data-agent="repo" role="radio" aria-checked="false">只给链接</button>
          </div>

          <div class="agent-snippet active" data-snippet="claude">
            <div class="snippet-hint">在 Claude Code 终端里<strong>逐行输入</strong>这两条命令：</div>
            <div class="code-block" id="snip-claude">${escapeHtml(ccInstallCmd)}<button class="copy-btn" data-target="snip-claude">复制</button></div>
          </div>

          <div class="agent-snippet" data-snippet="codex">
            <div class="snippet-hint">把这段<strong>粘贴给 Codex / Cursor / ChatGPT</strong> 等任意支持读 URL 的 Agent：</div>
            <div class="code-block" id="snip-codex">${escapeHtml(universalSkillPrompt)}<button class="copy-btn" data-target="snip-codex">复制</button></div>
          </div>

          <div class="agent-snippet" data-snippet="repo">
            <div class="snippet-hint">最简做法：<strong>把仓库链接发给 agent</strong>，让它自己去读 <code>SKILL.md</code>：</div>
            <div class="code-block" id="snip-repo">${escapeHtml(skillRepoUrl)}<button class="copy-btn" data-target="snip-repo">复制</button></div>
          </div>

          <a class="skill-repo-link" href="${skillRepoUrl}" target="_blank" rel="noopener noreferrer">
            查看 Skill Repo →
          </a>
        </div>

        <div class="tab-panel" data-panel="prompt" role="tabpanel">
          <label class="url-field" for="zoon-url">1. 粘贴你的 Zoon 文档链接</label>
          <input type="url" id="zoon-url" class="url-input" placeholder="https://zoon.example/d/xxxxx?token=... （没有？先点右上「创建新文档」）" autocomplete="off" spellcheck="false" />
          <label class="url-field" for="agent-prompt-preview" style="margin-top:4px;">2. 复制完整 Prompt，粘贴给你的 AI 工具</label>
          <div class="code-block prompt-preview" id="agent-prompt-preview" data-empty="true">Here's my Zoon doc: <span class="token-placeholder" id="url-slot">&lt;先粘贴你的文档链接&gt;</span>

${escapeHtml(promptPreviewTail)}<button class="copy-btn" data-target="agent-prompt-preview" disabled>先粘链接</button></div>
        </div>
      </div>
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
