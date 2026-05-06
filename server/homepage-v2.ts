/**
 * Zoon 首页 V2 — Editorial × Brutalist Redesign
 *
 * 挂载在 `GET /v2`，旧版 `GET /` 完全不动。两版可同时访问对比。
 *
 * 设计核心：
 * - Hero 大字 serif + 不规则 marker 高亮（绿/紫）
 * - 「对话流 vs 文档流」对比 section 作为核心说服锚
 * - 国内对比表（ChatGPT / 豆包 / Kimi vs Zoon）
 * - 角色 tab 切换（PM / 工程师 / 学者 / 创作者）
 * - 工具接入 picker（Claude Code / Codex / ChatGPT / curl）
 *
 * 复用现有运行时：
 * - import HOMEPAGE_SCRIPT 处理 home-account 登录、create-doc-trigger 创建文档
 * - 必要 DOM hooks：home-account, home-account-trigger, home-account-panel,
 *   home-auth-modal, .create-doc-trigger（≥ 1 处）
 * - copy-agent-invite / agent-invite-content 在 v2 不复用（旧 script 有
 *   null check，缺失 silent skip）
 *
 * 创建文档仍走 POST /api/public/documents（与旧版一致）。
 */

import { HOMEPAGE_SCRIPT, AUTH_PANEL_STYLES } from './homepage.js';

const REDESIGN_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
html, body { overflow-x: hidden; max-width: 100vw; }

:root {
  --bg: #f4f0e7;
  --bg-deep: #ece4d0;
  --paper: #fcfaf2;
  /* AUTH_PANEL_STYLES 引用 var(--surface)；v2 没用此名，alias 一下兼容 */
  --surface: #fcfaf2;
  --ink: #1a1913;
  --ink-soft: #2b2a22;
  --muted: #716c5f;
  --muted-2: #95907f;
  --line: #d8cfb8;
  --line-soft: #e8e1d1;
  --accent: #4a5d3a;
  --accent-dark: #2f3d25;
  --accent-deep: #1f2a17;
  --human: #6fb892;
  --human-strong: #4ea273;
  --human-soft: #cee9d8;
  --ai: #a991e3;
  --ai-strong: #8a6dd1;
  --ai-soft: #e2d6f5;
  --coral: #e8a17d;
  --gold: #e8c97d;
  --warning: #c8543c;
  --warning-soft: #f1d5cd;
  --display: 'Fraunces', 'Iowan Old Style', Georgia, serif;
  --body: 'Plus Jakarta Sans', ui-sans-serif, system-ui, "PingFang SC",
           "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}

body {
  font-family: var(--body);
  background: var(--bg);
  color: var(--ink);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  position: relative;
  font-feature-settings: "ss01","cv11";
}
body::before {
  content: '';
  position: fixed; inset: 0;
  background-image:
    radial-gradient(circle at 12% 18%, rgba(111,184,146,.16), transparent 38%),
    radial-gradient(circle at 88% 62%, rgba(169,145,227,.14), transparent 42%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.16  0 0 0 0 0.10  0 0 0 0.045 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  pointer-events: none;
  z-index: 0;
  opacity: .9;
  mix-blend-mode: multiply;
}

.shell { position: relative; z-index: 1; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 0 32px; }
@media (max-width: 720px) { .wrap { padding: 0 20px; } }

/* TOP NAV */
.nav-v2 {
  position: sticky; top: 0; z-index: 80;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: color-mix(in srgb, var(--bg) 78%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
}
.nav-inner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 0;
}
.logo {
  font-family: var(--display);
  font-weight: 600;
  font-size: 26px;
  letter-spacing: -0.6px;
  color: var(--ink);
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  text-decoration: none;
}
.logo .dot {
  font-style: italic;
  color: var(--accent);
  font-feature-settings: "ss01" on;
}
.nav-links {
  display: flex; gap: 26px; font-size: 14px;
}
@media (max-width: 820px) { .nav-links { display: none; } }
.nav-links a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  position: relative;
  padding: 4px 0;
}
.nav-links a:hover { color: var(--ink); }
.nav-links a::after {
  content: ''; position: absolute; left: 0; bottom: -2px;
  width: 0; height: 2px; background: var(--accent);
  transition: width .25s ease;
}
.nav-links a:hover::after { width: 100%; }

/* override default home-account-trigger for v2 — pill style matching new aesthetic */
.nav-v2 .home-account {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  position: relative;
}
.nav-v2 .home-account-trigger {
  font-family: var(--body);
  font-size: 13px;
  font-weight: 700;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1.5px solid var(--ink);
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--accent);
  transition: transform .15s ease, box-shadow .2s ease;
  min-height: 0;
}
.nav-v2 .home-account-trigger:hover {
  background: var(--ink);
  color: var(--bg);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--accent);
}
.home-account-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: min(360px, calc(100vw - 24px));
  max-height: min(560px, calc(100vh - 96px));
  overflow: auto;
  padding: 10px;
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  background: rgba(26, 25, 19, .96);
  color: var(--paper);
  box-shadow: 6px 6px 0 rgba(74, 93, 58, .38);
  z-index: 40;
}
.home-account-panel[hidden],
.home-auth-modal[hidden] { display: none; }
.home-account-head,
.home-doc-row,
.home-doc-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.home-account-head { padding: 4px 8px 10px; }
.home-account-name,
.home-doc-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 800;
}
.home-account-email,
.home-doc-meta,
.home-doc-time,
.home-account-status {
  color: rgba(252, 250, 242, .58);
  font-size: 11px;
  font-weight: 600;
}
.home-account-logout,
.home-doc-action {
  flex-shrink: 0;
  border: 1px solid rgba(252, 250, 242, .18);
  background: rgba(252, 250, 242, .06);
  color: rgba(252, 250, 242, .76);
  border-radius: 999px;
  padding: 5px 9px;
  font-family: var(--body);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.home-doc-action.danger {
  border-color: rgba(248, 113, 113, .38);
  background: rgba(127, 29, 29, .24);
  color: rgba(254, 202, 202, .96);
}
.home-account-new {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(252, 250, 242, .10);
  color: var(--paper);
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
}
.home-account-label {
  padding: 4px 8px 6px;
  color: rgba(252, 250, 242, .56);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.home-doc-row {
  padding: 10px;
  border-radius: 10px;
}
.home-doc-row:hover { background: rgba(252, 250, 242, .08); }
.home-doc-link {
  min-width: 0;
  flex: 1 1 auto;
  color: inherit;
  text-decoration: none;
}
.home-account-status {
  padding: 10px;
  line-height: 1.5;
}

/* HERO */
.hero-v2 {
  padding: 24px 0 56px;
  position: relative;
}
.hero-grid {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 48px;
  align-items: center;
}
@media (max-width: 1040px) {
  .hero-grid { grid-template-columns: 1fr; gap: 40px; }
}

.hero-title {
  font-family: var(--display);
  font-weight: 500;
  font-size: clamp(44px, 5.8vw, 84px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 22px;
  animation: fadeUp .8s .05s both;
  font-feature-settings: "ss01" on, "cv11" on;
  text-wrap: balance;
}
.hero-title .line {
  display: inline-block;
  white-space: nowrap;
}
.hero-title em {
  font-style: italic;
  font-weight: 400;
  font-variation-settings: "opsz" 144;
}

/* marker highlights — irregular brush stroke via clip-path */
.mark {
  position: relative;
  display: inline-block;
  padding: 0 .14em .04em .12em;
  margin: 0 -.04em;
  font-style: italic;
  font-weight: 500;
}
.mark::before {
  content: '';
  position: absolute;
  inset: 0.08em -0.04em 0.08em -0.04em;
  z-index: -1;
  border-radius: 2px;
  transform: skew(-2deg) rotate(-0.6deg);
}
.mark-green { color: var(--accent-deep); }
.mark-green::before {
  background: var(--human);
  clip-path: polygon(0% 18%, 4% 4%, 22% 0%, 60% 6%, 88% 0%, 100% 14%, 98% 80%, 92% 100%, 60% 96%, 18% 100%, 2% 92%);
}
.mark-purple { color: #2c1d4a; }
.mark-purple::before {
  background: var(--ai);
  clip-path: polygon(2% 12%, 28% 2%, 56% 8%, 94% 0%, 100% 28%, 96% 86%, 78% 100%, 38% 94%, 8% 100%, 0% 64%);
}

.hero-sub {
  font-size: clamp(15.5px, 1.4vw, 18px);
  line-height: 1.55;
  color: var(--ink-soft);
  max-width: 540px;
  margin-bottom: 26px;
  animation: fadeUp .8s .18s both;
}
.hero-sub strong {
  font-weight: 700;
  color: var(--ink);
  background: linear-gradient(180deg, transparent 64%, color-mix(in srgb, var(--gold) 65%, transparent) 64%);
}

.hero-ctas {
  display: flex; flex-wrap: wrap; gap: 14px;
  margin-bottom: 26px;
  animation: fadeUp .8s .28s both;
}
.btn-primary {
  position: relative;
  display: inline-flex; align-items: center; gap: 14px;
  padding: 18px 28px;
  font-family: var(--body);
  font-size: 16px; font-weight: 700;
  background: var(--ink);
  color: var(--bg);
  border-radius: 14px;
  text-decoration: none;
  border: 2px solid var(--ink);
  box-shadow: 4px 4px 0 var(--accent), 4px 4px 0 1.5px var(--ink);
  transition: transform .14s ease, box-shadow .2s ease;
  cursor: pointer;
}
.btn-primary small {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  opacity: .68;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 18%, transparent);
  letter-spacing: 0.02em;
}
.btn-primary svg { transition: transform .25s ease; }
.btn-primary:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--accent), 6px 6px 0 1.5px var(--ink);
}
.btn-primary:hover svg { transform: translateX(4px); }
.btn-primary[disabled] { cursor: wait; opacity: .76; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 18px 22px;
  font-size: 15px; font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
  border-radius: 14px;
  border: 1.5px dashed color-mix(in srgb, var(--ink) 30%, transparent);
  background: transparent;
  transition: background .2s, border-color .2s;
  cursor: pointer;
}
.btn-ghost:hover {
  background: color-mix(in srgb, var(--paper) 70%, transparent);
  border-color: var(--ink);
}

.trust-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  animation: fadeUp .8s .4s both;
}
.trust-bar .label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted-2);
  font-weight: 600;
}
.trust-bar .pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--paper) 70%, transparent);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  font-weight: 600;
}

/* HERO DEMO CARD */
.hero-demo {
  position: relative;
  animation: fadeUp .9s .4s both;
}
.demo-card {
  position: relative;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 18px;
  box-shadow: 8px 8px 0 var(--ink), 8px 8px 0 1.5px var(--ai-strong);
  overflow: hidden;
  transform: rotate(-1.2deg);
  transition: transform .4s cubic-bezier(.2,.8,.2,1);
}
.demo-card:hover { transform: rotate(0); }

.demo-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-deep) 60%, var(--paper));
}
.demo-bar .dot { width: 11px; height: 11px; border-radius: 50%; background: var(--line); }
.demo-bar .dot:nth-child(1) { background: #e8a17d; }
.demo-bar .dot:nth-child(2) { background: #e8c97d; }
.demo-bar .dot:nth-child(3) { background: var(--human); }
.demo-bar .title {
  margin-left: 10px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.02em;
}
.demo-bar .rev {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted-2);
}
.demo-body {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 14px;
  padding: 22px 22px 26px;
  position: relative;
}
.prov-rail {
  display: flex; flex-direction: column; gap: 4px;
  border-radius: 4px;
  overflow: hidden;
}
.prov-seg { width: 100%; }
.prov-seg.h { background: var(--human); }
.prov-seg.a { background: var(--ai); }
.demo-content {
  font-family: var(--display);
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--ink-soft);
}
.demo-content h4 {
  font-family: var(--display);
  font-weight: 700;
  font-size: 16px;
  color: var(--ink);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}
.demo-content h4 .hash { color: var(--muted-2); margin-right: 6px; }
.seg {
  display: block;
  padding: 2px 6px;
  margin: 0 -6px 8px;
  border-radius: 4px;
  position: relative;
}
.seg.human { color: var(--ink); }
.seg.ai {
  background: color-mix(in srgb, var(--ai-soft) 65%, transparent);
  color: #2d1c5a;
  border-left: 2px solid var(--ai-strong);
  padding-left: 10px;
}
.seg.ai .auth-tag {
  position: absolute;
  top: 50%; right: -6px;
  transform: translate(100%, -50%);
  font-family: var(--mono);
  font-size: 10px;
  background: var(--ai-strong);
  color: white;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity .25s;
  pointer-events: none;
}
.seg.ai:hover .auth-tag { opacity: 1; }
.seg.edited {
  background: color-mix(in srgb, var(--human-soft) 70%, transparent);
  color: var(--ink);
  border-left: 2px solid var(--human-strong);
  padding-left: 10px;
  position: relative;
}
.seg.edited::before {
  content: '↻ 你刚改了这句';
  position: absolute;
  top: -10px; left: 8px;
  font-family: var(--mono);
  font-size: 10px;
  background: var(--human-strong);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.cursor {
  display: inline-block;
  width: 2px; height: 1.05em;
  background: var(--ai-strong);
  margin-left: 1px;
  vertical-align: -0.18em;
  animation: blink 1s steps(2) infinite;
}
@keyframes blink { 50% { opacity: 0; } }
.presence-chip {
  position: absolute;
  bottom: -16px; right: 18px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: var(--ink);
  color: white;
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 12px;
  border: 1.5px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ai-strong);
}
.presence-chip .pdot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--ai);
  animation: pulse-soft 1.6s ease-in-out infinite;
}
@keyframes pulse-soft {
  0%, 100% { transform: scale(1); opacity: .9; }
  50% { transform: scale(1.4); opacity: 1; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

/* SECTION SCAFFOLD */
.eyebrow-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent-dark);
  font-weight: 700;
  margin-bottom: 20px;
}
.eyebrow-tag::before {
  content: ''; width: 24px; height: 2px; background: var(--accent);
}
.section-title {
  font-family: var(--display);
  font-weight: 500;
  font-size: clamp(32px, 4.6vw, 64px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 20px;
  max-width: 900px;
}
.section-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--accent-dark);
}
.section-sub {
  font-size: 18px;
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 640px;
  margin-bottom: 56px;
}

/* COMPARE: 对话流 vs 文档流 */
.compare {
  background: var(--bg-deep);
  border-top: 1.5px solid var(--ink);
  border-bottom: 1.5px solid var(--ink);
  padding: 100px 0;
  position: relative;
}
.compare-head { text-align: left; max-width: 980px; }
.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 16px;
  align-items: stretch;
}
@media (max-width: 920px) { .compare-grid { grid-template-columns: 1fr; } }
.col-card {
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  padding: 28px 26px 32px;
  position: relative;
  display: flex;
  flex-direction: column;
}
.col-card.bad {
  background: color-mix(in srgb, var(--warning-soft) 50%, var(--paper));
  box-shadow: 5px 5px 0 var(--warning);
}
.col-card.good { box-shadow: 5px 5px 0 var(--ai-strong); }
.col-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 14px;
  width: fit-content;
}
.col-tag.bad { background: var(--warning); color: white; }
.col-tag.good { background: var(--accent); color: var(--bg); }
.col-title {
  font-family: var(--display);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
  color: var(--ink);
  margin-bottom: 22px;
}
.chat-stream {
  display: flex; flex-direction: column; gap: 10px;
  flex: 1;
}
.bubble {
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.5;
  max-width: 92%;
  position: relative;
}
.bubble.user {
  align-self: flex-end;
  background: var(--ink);
  color: var(--bg);
  border-bottom-right-radius: 4px;
}
.bubble.ai {
  align-self: flex-start;
  background: white;
  border: 1px solid var(--line);
  border-bottom-left-radius: 4px;
  color: var(--ink-soft);
}
.bubble.ai.huge {
  max-width: 100%;
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--muted);
}
.bubble.ai.huge::after {
  content: '… 又生成了 800 字';
  display: block;
  margin-top: 6px;
  font-style: italic;
  color: var(--warning);
  font-weight: 600;
}
.bubble .turn-tag {
  position: absolute;
  top: -8px; left: 10px;
  font-family: var(--mono);
  font-size: 10px;
  background: var(--bg-deep);
  border: 1px solid var(--line);
  padding: 1px 6px;
  border-radius: 3px;
  color: var(--muted);
}
.bubble.user .turn-tag { left: auto; right: 10px; }
.chat-foot {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--mono);
  font-size: 12px;
}
.chat-foot .label { color: var(--muted); }
.chat-foot .stat {
  color: var(--warning);
  font-weight: 700;
  font-size: 14px;
}
.doc-demo {
  flex: 1;
  background: linear-gradient(180deg, var(--bg) 0%, var(--paper) 100%);
  border: 1px dashed var(--line);
  border-radius: 12px;
  padding: 18px;
  font-family: var(--display);
  font-size: 15px;
  line-height: 1.7;
  color: var(--ink-soft);
  position: relative;
}
.doc-demo .doc-line {
  display: block;
  padding: 3px 6px;
  margin: 0 -6px;
  border-radius: 3px;
}
.doc-demo .doc-line.ai-text {
  background: color-mix(in srgb, var(--ai-soft) 60%, transparent);
  color: #2d1c5a;
  border-left: 2px solid var(--ai-strong);
  padding-left: 10px;
  cursor: text;
  position: relative;
}
.doc-demo .doc-line.ai-text:hover {
  background: color-mix(in srgb, var(--ai-soft) 90%, transparent);
}
.doc-demo .doc-line.ai-text.editing {
  background: white;
  outline: 2px solid var(--human-strong);
  border-left-color: var(--human-strong);
}
.doc-demo .doc-line.ai-text.editing::after {
  content: '|';
  color: var(--human-strong);
  font-weight: 700;
  margin-left: 1px;
  animation: blink 1s steps(2) infinite;
}
.doc-demo .step-pill {
  position: absolute;
  font-family: var(--mono);
  font-size: 10.5px;
  background: var(--ink);
  color: var(--bg);
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: 0.04em;
}
.action-row {
  margin-top: 14px;
  display: flex; gap: 8px; flex-wrap: wrap;
}
.action-pill {
  font-family: var(--mono);
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  background: white;
  border: 1px solid var(--line);
  color: var(--muted);
}
.action-pill.active {
  background: var(--human);
  color: var(--accent-deep);
  border-color: var(--human-strong);
}
.compare-stat-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 24px;
}
@media (max-width: 920px) { .compare-stat-row { grid-template-columns: 1fr; } }
.compare-stat {
  display: flex; align-items: baseline; gap: 12px;
  font-family: var(--mono);
  font-size: 13px;
}
.compare-stat .num {
  font-family: var(--display);
  font-weight: 700;
  font-size: 32px;
  letter-spacing: -0.02em;
}
.compare-stat.bad .num { color: var(--warning); }
.compare-stat.good .num { color: var(--accent); }
.compare-stat .desc { color: var(--muted); }

/* PROVENANCE / FEATURES */
.prov-section {
  padding: 100px 0;
  background: var(--bg);
  border-bottom: 1.5px solid var(--ink);
}
.prov-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}
@media (max-width: 920px) { .prov-grid { grid-template-columns: 1fr; gap: 40px; } }
.prov-bigtext .section-title { margin-bottom: 24px; }
.prov-bigtext p {
  font-size: 17px;
  line-height: 1.65;
  color: var(--ink-soft);
  margin-bottom: 16px;
  max-width: 480px;
}
.prov-bigtext code {
  font-family: var(--mono);
  font-size: 13px;
  background: var(--bg-deep);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent-dark);
}
.features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 56px;
}
@media (max-width: 720px) { .features { grid-template-columns: 1fr; } }
.feat {
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  padding: 28px 24px;
  position: relative;
  transition: transform .25s ease, box-shadow .25s ease;
}
.feat:hover { transform: translate(-3px, -3px); }
.feat-num {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--muted-2);
  margin-bottom: 12px;
  display: flex; justify-content: space-between; align-items: center;
}
.feat-num .glyph {
  width: 28px; height: 28px;
  border-radius: 6px;
  display: grid; place-items: center;
  font-family: var(--mono);
  font-size: 13px;
}
.feat:nth-child(1) { box-shadow: 4px 4px 0 var(--human-strong); }
.feat:nth-child(1) .glyph { background: var(--human); color: var(--accent-deep); }
.feat:nth-child(2) { box-shadow: 4px 4px 0 var(--ai-strong); }
.feat:nth-child(2) .glyph { background: var(--ai); color: white; }
.feat:nth-child(3) { box-shadow: 4px 4px 0 var(--coral); }
.feat:nth-child(3) .glyph { background: var(--coral); color: var(--ink); }
.feat:hover:nth-child(1) { box-shadow: 7px 7px 0 var(--human-strong); }
.feat:hover:nth-child(2) { box-shadow: 7px 7px 0 var(--ai-strong); }
.feat:hover:nth-child(3) { box-shadow: 7px 7px 0 var(--coral); }
.feat-title {
  font-family: var(--display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin-bottom: 12px;
  color: var(--ink);
}
.feat-desc {
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--ink-soft);
  margin-bottom: 16px;
}
.feat-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono);
  font-size: 11.5px;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--bg-deep);
  color: var(--muted);
  font-weight: 600;
}

/* TABLE COMPARE */
.table-section {
  padding: 100px 0;
  background: var(--ink);
  color: var(--bg);
  border-bottom: 1.5px solid var(--ink);
  position: relative;
}
.table-section .section-title { color: var(--bg); }
.table-section .eyebrow-tag { color: var(--human); }
.table-section .eyebrow-tag::before { background: var(--human); }
.table-section .section-sub { color: color-mix(in srgb, var(--bg) 80%, transparent); }
.compare-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14.5px;
  margin-top: 24px;
  background: color-mix(in srgb, var(--ink) 70%, var(--bg-deep) 30%);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--bg) 12%, transparent);
}
.compare-table th, .compare-table td {
  padding: 18px 20px;
  text-align: left;
  border-bottom: 1px solid color-mix(in srgb, var(--bg) 10%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--bg) 10%, transparent);
}
.compare-table th {
  background: color-mix(in srgb, var(--ink) 50%, black);
  color: var(--bg);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.compare-table th.zoon-col {
  background: var(--accent-dark);
  color: var(--human);
  font-weight: 800;
}
.compare-table tr:last-child td { border-bottom: none; }
.compare-table td:last-child, .compare-table th:last-child { border-right: none; }
.compare-table td.row-label { font-weight: 600; color: var(--bg); }
.compare-table td.zoon-cell {
  background: color-mix(in srgb, var(--accent-dark) 70%, var(--ink));
  color: var(--human);
  font-weight: 700;
}
.compare-table .check { color: var(--human); font-size: 18px; font-weight: 700; }
.compare-table .cross { color: var(--warning); font-size: 18px; }
.table-wrap { position: relative; }
.table-hint {
  display: none;
  text-align: center;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--bg) 55%, transparent);
  margin-top: 14px;
}

/* ROLES TABS */
.roles-section { padding: 100px 0; }
.role-tabs {
  display: flex; flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 36px;
  border-bottom: 1.5px solid var(--line);
  padding-bottom: 0;
}
.role-tab {
  padding: 14px 22px;
  font-family: var(--body);
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  border-bottom: 3px solid transparent;
  margin-bottom: -1.5px;
  transition: color .2s;
}
.role-tab:hover { color: var(--ink); }
.role-tab.active {
  color: var(--ink);
  border-bottom-color: var(--accent);
}
.role-tab .label-en {
  display: block;
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 500;
  color: var(--muted-2);
  letter-spacing: 0.06em;
  margin-top: 2px;
}
.role-panel {
  display: none;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: center;
}
@media (max-width: 920px) { .role-panel { grid-template-columns: 1fr; } }
.role-panel.active { display: grid; }
.role-text h3 {
  font-family: var(--display);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
  margin-bottom: 18px;
}
.role-text .scenario {
  font-size: 16px;
  line-height: 1.6;
  color: var(--ink-soft);
  margin-bottom: 22px;
}
.role-quote {
  border-left: 3px solid var(--accent);
  padding: 12px 0 12px 18px;
  font-family: var(--display);
  font-style: italic;
  font-size: 17px;
  line-height: 1.55;
  color: var(--ink-soft);
  margin-bottom: 14px;
}
.role-byline {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}
.role-byline strong { color: var(--ink); font-weight: 700; }
.role-mock {
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 14px;
  padding: 20px;
  font-family: var(--display);
  font-size: 14.5px;
  line-height: 1.7;
  box-shadow: 5px 5px 0 var(--ink);
  transform: rotate(.8deg);
}

/* CONNECT / TOOL PICKER */
.connect-section {
  padding: 100px 0;
  background: var(--bg-deep);
  border-top: 1.5px solid var(--ink);
}
.tool-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 36px 0 28px;
}
@media (max-width: 720px) { .tool-picker { grid-template-columns: repeat(2, 1fr); } }
.tool-card {
  padding: 20px 18px;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 12px;
  cursor: pointer;
  transition: all .2s;
  text-align: left;
  font-family: var(--body);
  color: var(--ink);
}
.tool-card:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 var(--ink); }
.tool-card.active {
  background: var(--ink);
  color: var(--bg);
  box-shadow: 4px 4px 0 var(--accent);
  transform: translate(-2px, -2px);
}
.tool-card .name {
  font-family: var(--display);
  font-size: 19px;
  font-weight: 600;
  margin-bottom: 4px;
}
.tool-card .meta {
  font-family: var(--mono);
  font-size: 11px;
  opacity: .6;
}
.code-card {
  background: var(--ink);
  color: var(--bg);
  border-radius: 14px;
  padding: 20px 24px;
  font-family: var(--mono);
  font-size: 13.5px;
  line-height: 1.7;
  position: relative;
  border: 1.5px solid var(--ink);
  box-shadow: 6px 6px 0 var(--accent);
}
.code-card .lang {
  position: absolute;
  top: 14px; right: 16px;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-2);
}
.code-card .copy-btn {
  position: absolute;
  bottom: 14px; right: 16px;
  font-size: 11px;
  background: color-mix(in srgb, var(--bg) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--bg) 22%, transparent);
  color: var(--bg);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--mono);
}
.code-card .comment { color: var(--muted-2); }
.code-card .kw { color: var(--ai); }
.code-card .str { color: var(--gold); }

/* FAQ */
.faq-section { padding: 100px 0; }
.faq-grid {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 64px;
}
@media (max-width: 920px) { .faq-grid { grid-template-columns: 1fr; gap: 32px; } }
.faq-list { display: flex; flex-direction: column; gap: 4px; }
.faq-item {
  border-top: 1px solid var(--line);
  padding: 20px 0;
}
.faq-item:last-child { border-bottom: 1px solid var(--line); }
.faq-q {
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer;
  font-family: var(--display);
  font-size: 19px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.faq-q .toggle {
  width: 28px; height: 28px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--bg);
  display: grid; place-items: center;
  font-family: var(--mono);
  font-size: 16px;
  transition: transform .25s ease;
  flex-shrink: 0;
  margin-left: 12px;
}
.faq-item.open .toggle { transform: rotate(45deg); }
.faq-a {
  max-height: 0;
  overflow: hidden;
  transition: max-height .35s ease, padding-top .25s ease;
  font-size: 15px;
  line-height: 1.65;
  color: var(--ink-soft);
}
.faq-item.open .faq-a {
  max-height: 320px;
  padding-top: 14px;
}

/* FINAL CTA */
.final-cta {
  padding: 110px 0 60px;
  text-align: center;
  position: relative;
}
.final-cta .section-title { margin: 0 auto 24px; text-align: center; }
.final-cta .section-sub { margin: 0 auto 36px; text-align: center; }
.final-cta .hero-ctas { justify-content: center; }
.final-flair {
  font-family: var(--display);
  font-style: italic;
  font-size: 14px;
  color: var(--muted);
  margin-top: 28px;
}

/* FOOTER */
footer.foot-v2 {
  padding: 56px 0 40px;
  border-top: 1px solid var(--line);
  background: var(--bg);
}
.foot-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 32px;
}
@media (max-width: 720px) { .foot-grid { grid-template-columns: 1fr 1fr; gap: 28px; } }
.foot-blurb {
  font-family: var(--display);
  font-style: italic;
  font-size: 18px;
  line-height: 1.5;
  color: var(--ink-soft);
  margin-top: 16px;
  max-width: 320px;
}
.foot-col h5 {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted-2);
  font-weight: 700;
  margin-bottom: 12px;
}
.foot-col a {
  display: block;
  font-size: 14px;
  color: var(--ink-soft);
  text-decoration: none;
  padding: 4px 0;
  font-weight: 500;
}
.foot-col a:hover { color: var(--accent); }
.foot-base {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px dashed var(--line);
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}
@media (max-width: 720px) { .foot-base { flex-direction: column; gap: 12px; align-items: flex-start; } }

.watermark {
  font-family: var(--display);
  font-style: italic;
  font-size: clamp(120px, 22vw, 300px);
  font-weight: 400;
  color: color-mix(in srgb, var(--accent) 10%, transparent);
  position: absolute;
  bottom: -38px; left: 4%;
  line-height: 1;
  letter-spacing: -0.04em;
  z-index: 0;
  pointer-events: none;
  user-select: none;
}
.prov-divider {
  height: 32px;
  background:
    repeating-linear-gradient(90deg,
      var(--human) 0 14px,
      var(--ai) 14px 28px,
      var(--human) 28px 36px,
      var(--ai) 36px 56px,
      var(--human) 56px 80px,
      var(--ai) 80px 96px);
  border-top: 1.5px solid var(--ink);
  border-bottom: 1.5px solid var(--ink);
  position: relative;
}
.kbd {
  font-family: var(--mono);
  font-size: 11.5px;
  padding: 2px 7px;
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 4px;
  background: var(--paper);
  color: var(--ink-soft);
}

/* MOBILE */
@media (max-width: 1040px) {
  .hero-v2 { padding: 28px 0 64px; }
  .hero-grid { gap: 40px; }
  .demo-card { transform: rotate(-0.5deg); }
}
@media (max-width: 920px) {
  .compare, .prov-section, .table-section, .roles-section,
  .connect-section, .faq-section { padding: 76px 0; }
  .final-cta { padding: 84px 0 52px; }
  .section-title { font-size: clamp(28px, 5.6vw, 46px); margin-bottom: 16px; }
  .section-sub { font-size: 16px; margin-bottom: 40px; }
  .role-mock { transform: rotate(0); }
  .prov-grid { gap: 36px; }
  .features { margin-top: 36px; gap: 18px; }
  .feat { padding: 24px 22px; }
  .feat-title { font-size: 22px; }
  .compare-grid { gap: 22px; }
  .col-card { padding: 24px 22px 26px; }
  .compare-table { font-size: 13px; }
  .compare-table th, .compare-table td { padding: 14px 12px; }
}
@media (max-width: 720px) {
  .nav-inner { padding: 14px 0; }
  .logo { font-size: 22px; }
  .hero-v2 { padding: 16px 0 56px; }
  .hero-title {
    font-size: clamp(40px, 11vw, 60px);
    line-height: 1.06;
    letter-spacing: -0.02em;
    margin-bottom: 22px;
  }
  .hero-title .line { white-space: normal; display: inline; }
  .hero-sub { font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
  .hero-sub br { display: none; }
  .hero-ctas { gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
  .btn-primary {
    padding: 14px 20px;
    font-size: 14.5px;
    gap: 10px;
    flex: 1 1 100%;
    justify-content: center;
    box-shadow: 3px 3px 0 var(--accent), 3px 3px 0 1.5px var(--ink);
  }
  .btn-primary:hover { box-shadow: 4px 4px 0 var(--accent), 4px 4px 0 1.5px var(--ink); }
  .btn-primary small { font-size: 10.5px; padding: 2px 7px; }
  .btn-ghost {
    padding: 14px 18px;
    font-size: 14px;
    flex: 1 1 100%;
    justify-content: center;
  }
  .trust-bar { font-size: 11px; gap: 6px 10px; }
  .trust-bar .pill { padding: 3px 8px; font-size: 10.5px; }
  .demo-card {
    transform: rotate(0);
    box-shadow: 5px 5px 0 var(--ink), 5px 5px 0 1.5px var(--ai-strong);
  }
  .demo-bar { padding: 10px 14px; }
  .demo-bar .title { font-size: 11px; margin-left: 8px; }
  .demo-bar .rev { display: none; }
  .demo-body { padding: 18px 16px 22px; gap: 10px; grid-template-columns: 10px 1fr; }
  .demo-content { font-size: 13.5px; line-height: 1.65; }
  .demo-content h4 { font-size: 14px; }
  .seg.ai .auth-tag { display: none; }
  .seg.edited::before { font-size: 9px; padding: 1px 6px; top: -8px; }
  .presence-chip {
    bottom: -14px; right: 12px;
    padding: 6px 12px;
    font-size: 11px;
    box-shadow: 2px 2px 0 var(--ai-strong);
  }
  .prov-divider { height: 22px; }
  .compare { padding: 64px 0; }
  .compare-grid { gap: 18px; margin-top: 8px; }
  .col-card { padding: 22px 20px 24px; box-shadow: 4px 4px 0 var(--ai-strong); }
  .col-card.bad { box-shadow: 4px 4px 0 var(--warning); }
  .col-title { font-size: 22px; margin-bottom: 18px; line-height: 1.18; }
  .col-tag { font-size: 11px; padding: 3px 8px; }
  .bubble { font-size: 13px; padding: 10px 12px; }
  .bubble.ai.huge { font-size: 11px; line-height: 1.4; }
  .bubble .turn-tag { font-size: 9.5px; padding: 1px 5px; top: -7px; }
  .doc-demo { padding: 14px 12px; font-size: 13.5px; line-height: 1.7; }
  .doc-demo .step-pill {
    position: static;
    display: inline-block;
    margin: 4px 0 0;
    font-size: 10px;
    padding: 2px 7px;
  }
  .doc-demo .doc-line.ai-text.editing { padding: 4px 8px; }
  .action-row { gap: 6px; margin-top: 12px; }
  .action-pill { font-size: 10.5px; padding: 3px 8px; }
  .compare-stat-row { gap: 14px; margin-top: 18px; padding-top: 16px; }
  .compare-stat .num { font-size: 28px; }
  .compare-stat .desc { font-size: 11px; line-height: 1.35; }
  .chat-foot { font-size: 11px; }
  .chat-foot .stat { font-size: 12.5px; }
  .prov-section { padding: 64px 0; }
  .prov-bigtext p { font-size: 15px; }
  .features { gap: 16px; margin-top: 32px; }
  .feat { padding: 22px 20px; }
  .feat:nth-child(1) { box-shadow: 3px 3px 0 var(--human-strong); }
  .feat:nth-child(2) { box-shadow: 3px 3px 0 var(--ai-strong); }
  .feat:nth-child(3) { box-shadow: 3px 3px 0 var(--coral); }
  .feat:hover { transform: none; }
  .feat-title { font-size: 20px; margin-bottom: 10px; }
  .feat-desc { font-size: 14px; }
  .feat-num { font-size: 12px; }
  .feat-num .glyph { width: 24px; height: 24px; font-size: 11px; }
  .table-section { padding: 64px 0; }
  .table-wrap {
    margin: 0 -20px;
    padding: 0 20px 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
            mask-image: linear-gradient(90deg, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
  }
  .compare-table { min-width: 640px; font-size: 12.5px; }
  .compare-table th, .compare-table td { padding: 12px 12px; }
  .compare-table th { font-size: 10.5px; letter-spacing: 0.04em; }
  .compare-table .check, .compare-table .cross { font-size: 16px; }
  .table-hint { display: block; }
  .roles-section { padding: 64px 0; }
  .role-tabs {
    gap: 4px;
    overflow-x: auto;
    flex-wrap: nowrap;
    margin: 0 -20px 28px;
    padding: 0 20px;
    -webkit-overflow-scrolling: touch;
    border-bottom: 1.5px solid var(--line);
    scrollbar-width: none;
  }
  .role-tabs::-webkit-scrollbar { display: none; }
  .role-tab { padding: 12px 14px; font-size: 13.5px; white-space: nowrap; flex-shrink: 0; }
  .role-tab .label-en { font-size: 9.5px; margin-top: 1px; }
  .role-panel { gap: 28px; }
  .role-text h3 { font-size: 24px; line-height: 1.2; }
  .role-text .scenario { font-size: 14.5px; }
  .role-quote { font-size: 14.5px; padding: 10px 0 10px 14px; }
  .role-byline { font-size: 11.5px; }
  .role-mock {
    padding: 16px;
    font-size: 13px;
    line-height: 1.65;
    box-shadow: 4px 4px 0 var(--ink);
  }
  .connect-section { padding: 64px 0; }
  .tool-picker { gap: 8px; margin: 28px 0 22px; }
  .tool-card { padding: 14px 12px; }
  .tool-card .name { font-size: 15px; margin-bottom: 2px; }
  .tool-card .meta { font-size: 10px; }
  .code-card {
    padding: 16px 14px 38px;
    font-size: 11.5px;
    line-height: 1.65;
    box-shadow: 4px 4px 0 var(--accent);
    overflow-x: auto;
  }
  .code-card pre { white-space: pre; }
  .code-card .lang { font-size: 9.5px; top: 10px; right: 12px; }
  .code-card .copy-btn { font-size: 10px; bottom: 10px; right: 12px; padding: 3px 8px; }
  .faq-section { padding: 64px 0; }
  .faq-grid { gap: 28px; }
  .faq-q { font-size: 16px; line-height: 1.4; gap: 10px; }
  .faq-q .toggle { width: 24px; height: 24px; font-size: 14px; margin-left: 8px; }
  .faq-a { font-size: 14px; line-height: 1.65; }
  .faq-item { padding: 16px 0; }
  .final-cta { padding: 72px 0 40px; }
  .final-cta .section-title { font-size: clamp(26px, 7.5vw, 40px); }
  .final-cta .section-sub { font-size: 15px; }
  .final-flair { font-size: 12.5px; margin-top: 22px; }
  .watermark { font-size: 110px; bottom: -20px; left: -4%; opacity: .7; }
  footer.foot-v2 { padding: 44px 0 28px; }
  .foot-grid { grid-template-columns: 1fr 1fr; gap: 26px 20px; }
  .foot-grid > div:first-child { grid-column: 1 / -1; }
  .foot-blurb { font-size: 16px; max-width: none; }
  .foot-base { flex-direction: column; align-items: flex-start; gap: 8px; font-size: 11px; }
  .eyebrow-tag { font-size: 11px; letter-spacing: 0.1em; margin-bottom: 14px; }
}
@media (max-width: 480px) {
  .hero-title { font-size: clamp(36px, 11vw, 50px); line-height: 1.05; }
  .col-title { font-size: 20px; }
  .role-text h3 { font-size: 22px; }
  .compare-table { min-width: 560px; font-size: 12px; }
  .tool-picker { grid-template-columns: 1fr 1fr; }
  .faq-q { font-size: 15px; }
  .nav-links { display: none !important; }
  .logo { font-size: 21px; }
}
@media (hover: none) and (pointer: coarse) {
  .demo-card:hover { transform: rotate(0); }
  .feat:hover { transform: none; }
  .btn-primary:hover { transform: none; }
  .seg.ai .auth-tag { opacity: 1; position: static; transform: none; display: inline-block; margin-left: 6px; padding: 1px 6px; font-size: 9.5px; vertical-align: middle; }
  .seg.ai { padding-right: 10px; }
  @media (max-width: 720px) { .seg.ai .auth-tag { display: none; } }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
`;

export function renderHomepageV2(origin: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zoon — 让 Agent 把 plan 写进文档，你点哪改哪</title>
  <meta name="description" content="Agent 输出的每个字都是紫色的。你不满意的那一句——点紫色字直接改、删、让它重写。不污染对话上下文，不丢历史，不开新会话。" />
  <meta property="og:title" content="Zoon — 让 Agent 把 plan 写进文档，你点哪改哪" />
  <meta property="og:description" content="字符级溯源 · 人机协作文档编辑器" />
  <meta property="og:type" content="website" />
  <link rel="icon" type="image/svg+xml" href="/zoon-favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" />
  <style>${REDESIGN_STYLES}${AUTH_PANEL_STYLES}</style>
</head>
<body>
<div class="shell">

<header class="nav-v2">
  <div class="wrap nav-inner">
    <a href="/" class="logo">Zoon<span class="dot">.</span></a>
    <nav class="nav-links">
      <a href="#why">为什么用</a>
      <a href="#features">怎么协作</a>
      <a href="#roles">谁在用</a>
      <a href="#connect">接入</a>
      <a href="#faq">FAQ</a>
    </nav>
    <div class="home-account" id="home-account">
      <button class="home-account-trigger" id="home-account-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">登录</button>
      <div class="home-account-panel" id="home-account-panel" role="menu" hidden></div>
    </div>
  </div>
</header>

<div class="home-auth-modal" id="home-auth-modal" role="dialog" aria-modal="true" aria-labelledby="home-auth-title" hidden></div>

<main>
<section class="hero-v2">
  <div class="wrap">
    <div class="hero-grid">
      <div class="hero-text">
        <h1 class="hero-title">
          <span class="line">让 Agent</span><br>
          <span class="line">把 <span class="mark mark-green">plan</span> 写进文档，</span><br>
          <span class="line">你 <span class="mark mark-purple">点哪改哪</span>。</span>
        </h1>
        <p class="hero-sub">
          Agent 输出的每个字都是<strong>紫色</strong>的。<br>
          你不满意的那一句——点紫色字直接改、删、让它重写。<br>
          不污染对话上下文，不丢历史，不开新会话。
        </p>
        <div class="hero-ctas">
          <button class="btn-primary create-doc-trigger" type="button">
            <span>10 秒创建文档</span>
            <small>无需注册</small>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <path d="M1 7H18M18 7L12 1M18 7L12 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <a href="#demo-card" class="btn-ghost">先看示例文档 →</a>
        </div>
        <div class="trust-bar">
          <span class="label">支持</span>
          <span class="pill">Claude Code</span>
          <span class="pill">Codex</span>
          <span class="pill">Cursor</span>
          <span class="pill">ChatGPT</span>
          <span class="pill">+ 任何 HTTP agent</span>
        </div>
      </div>

      <div class="hero-demo" id="demo-card">
        <div class="demo-card">
          <div class="demo-bar">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="title">PRD — Q2 留资增长实验</span>
            <span class="rev">rev 12 · live</span>
          </div>
          <div class="demo-body">
            <div class="prov-rail" aria-hidden="true">
              <span class="prov-seg h" style="height: 22%"></span>
              <span class="prov-seg a" style="height: 30%"></span>
              <span class="prov-seg h" style="height: 12%"></span>
              <span class="prov-seg a" style="height: 24%"></span>
              <span class="prov-seg h" style="height: 12%"></span>
            </div>
            <div class="demo-content">
              <h4><span class="hash">##</span> 目标</h4>
              <span class="seg human">把试驾留资率从 18% 提升到 24%。</span>
              <span class="seg ai">
                核心抓手是改首页留资位的 copy，降低用户决策成本。
                <span class="auth-tag">ai:claude · 12:34</span>
              </span>
              <h4 style="margin-top:8px"><span class="hash">##</span> 假设</h4>
              <span class="seg ai">
                当前 copy「立即试驾」过于功能化，
                没有给出「这之后会发生什么」的预期，
                因此用户会犹豫。<span class="cursor"></span>
                <span class="auth-tag">ai:claude · 12:35</span>
              </span>
              <span class="seg edited">
                改为「30 秒预约，4S 店主动联系你」，
                给出明确的下一步预期。
              </span>
            </div>
          </div>
          <div class="presence-chip">
            <span class="pdot"></span>
            <span>claude is writing…</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="prov-divider" aria-hidden="true"></div>

<section class="compare" id="why">
  <div class="wrap">
    <div class="compare-head">
      <p class="eyebrow-tag">为什么不是 ChatGPT</p>
      <h2 class="section-title">
        你只想改 <em>一个字</em>。<br>
        试试两种姿势。
      </h2>
      <p class="section-sub">
        让 AI 在对话里改文档，每一次小修都得整段重新输出。<br>
        来回 4 轮，对话窗口 14000 tokens，你已经忘了最初想改的是什么。
      </p>
    </div>
    <div class="compare-grid">
      <div class="col-card bad">
        <span class="col-tag bad">老路 · 在对话里改</span>
        <h3 class="col-title">让 Agent 重写整段，<br>一段比一段长。</h3>
        <div class="chat-stream">
          <div class="bubble user">
            <span class="turn-tag">turn 1</span>
            把第 3 段第 2 句的措辞改一下，太硬了。
          </div>
          <div class="bubble ai huge">
            ## 假设<br>当前 copy「立即试驾」对用户来说较为生硬，可能会让他们感到压力，因此我们建议调整……
          </div>
          <div class="bubble user">
            <span class="turn-tag">turn 2</span>
            不是这一段，是上面那段「目标」下面的那句。
          </div>
          <div class="bubble ai huge">
            ## 目标<br>我们希望把试驾留资率从 18% 提升到 24%。为此我们计划……
          </div>
          <div class="bubble user">
            <span class="turn-tag">turn 3</span>
            …算了我自己改。
          </div>
        </div>
        <div class="chat-foot">
          <span class="label">对话上下文</span>
          <span class="stat">+14,200 tokens · 3 次重写</span>
        </div>
        <div class="compare-stat-row" style="margin-top: auto; padding-top: 20px">
          <div class="compare-stat bad"><span class="num">3</span><span class="desc">轮对话<br>来回</span></div>
          <div class="compare-stat bad"><span class="num">14k</span><span class="desc">tokens<br>被吃掉</span></div>
        </div>
      </div>

      <div class="col-card good">
        <span class="col-tag good">Zoon · 在文档里改</span>
        <h3 class="col-title">直接点紫色字，<br>改的是什么一目了然。</h3>
        <div class="doc-demo">
          <span class="doc-line">## 目标</span>
          <span class="doc-line ai-text editing">
            把试驾留资率从 18% 提升到 24%。
            <span class="step-pill" style="top: 30px; right: -10px;">① 鼠标悬停</span>
          </span>
          <span class="doc-line">## 假设</span>
          <span class="doc-line ai-text">
            当前 copy「立即试驾」过于功能化。
          </span>
          <span class="doc-line ai-text" style="background: color-mix(in srgb, var(--human-soft) 70%, transparent); border-left-color: var(--human-strong); color: var(--ink);">
            改为「30 秒预约，4S 店主动联系你」。
            <span class="step-pill" style="bottom: -8px; left: 8px; background: var(--human-strong); color: var(--accent-deep);">② 改完，自动绿</span>
          </span>
        </div>
        <div class="action-row">
          <span class="action-pill">点击 → 编辑</span>
          <span class="action-pill"><span class="kbd">⌫</span> 删除</span>
          <span class="action-pill">右键 → 让 AI 重写这一句</span>
          <span class="action-pill active">✓ 不打开对话</span>
        </div>
        <div class="compare-stat-row" style="margin-top: auto; padding-top: 20px">
          <div class="compare-stat good"><span class="num">0</span><span class="desc">轮对话<br>不污染</span></div>
          <div class="compare-stat good"><span class="num">~30s</span><span class="desc">从看到错<br>到改完</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="prov-section" id="features">
  <div class="wrap">
    <div class="prov-grid">
      <div class="prov-bigtext">
        <p class="eyebrow-tag">怎么做到的</p>
        <h2 class="section-title">
          字符级<em>溯源</em>，<br>
          + Agent 通过 <em>HTTP</em> 直接读写。
        </h2>
        <p>每个字符都带作者标签：你写的进绿色 buffer，Agent 写的进紫色 buffer。删改、插入，每一次操作都留痕。</p>
        <p>Agent 不需要模拟浏览器，也不需要先走审批流。一行 <code>POST /documents/&lt;slug&gt;/edit/v2</code>，它就能像你一样把 markdown 写进去。</p>
      </div>
      <div class="features" style="margin-top:0; grid-template-columns: 1fr;">
        <div class="feat">
          <div class="feat-num"><span>01 / Provenance</span><span class="glyph">●</span></div>
          <h3 class="feat-title">字符级溯源</h3>
          <p class="feat-desc">左侧色条标记每一行的作者。绿色 = 你，紫色 = AI。悬停看时间戳和 agent 身份。</p>
          <span class="feat-tag">绿 · 紫 双 buffer</span>
        </div>
      </div>
    </div>
    <div class="features">
      <div class="feat">
        <div class="feat-num"><span>02 / Direct Edit</span><span class="glyph">↳</span></div>
        <h3 class="feat-title">Agent 直写文档</h3>
        <p class="feat-desc">一个 URL 同时是人类编辑页 + agent 读写入口。Agent 用 HTTP 改文档，不用浏览器自动化、不用 SDK。</p>
        <span class="feat-tag">POST /edit/v2</span>
      </div>
      <div class="feat">
        <div class="feat-num"><span>03 / Optional Review</span><span class="glyph">⌥</span></div>
        <h3 class="feat-title">评论 / 建议是<br>主动选择</h3>
        <p class="feat-desc">默认直写。当你想先讨论再改，明确让 Agent 用 comment 或 suggestion。Zoon 不强制把改字变成审批流。</p>
        <span class="feat-tag">type: suggestion.add</span>
      </div>
    </div>
  </div>
</section>

<section class="table-section">
  <div class="wrap">
    <p class="eyebrow-tag">直说差异</p>
    <h2 class="section-title">AI 工具不少。<br><em>让你直接编辑 AI 输出</em>的只有一个。</h2>
    <p class="section-sub">
      ChatGPT、豆包、Kimi 都能帮你写——但它们的输出是聊天气泡，
      你想改一句就得回到对话说「把第 3 段重写」。
      Zoon 把 AI 输出直接落进文档，你点哪改哪。
    </p>
    <div class="table-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th style="width: 36%">能力</th>
          <th>ChatGPT</th>
          <th>豆包</th>
          <th>Kimi</th>
          <th class="zoon-col">Zoon</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-label">AI 帮你起草内容</td>
          <td><span class="check">✓</span></td>
          <td><span class="check">✓</span></td>
          <td><span class="check">✓</span></td>
          <td class="zoon-cell"><span class="check">✓</span></td>
        </tr>
        <tr>
          <td class="row-label">字符级看清哪句是 AI 写的</td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td class="zoon-cell"><span class="check">✓</span> 逐字符</td>
        </tr>
        <tr>
          <td class="row-label">改 AI 输出的一句话，不用重新生成整段</td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td class="zoon-cell"><span class="check">✓</span></td>
        </tr>
        <tr>
          <td class="row-label">直接点 AI 写的字面修改，不打开对话</td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td class="zoon-cell"><span class="check">✓</span></td>
        </tr>
        <tr>
          <td class="row-label">多个 AI Agent 同时协作同一份文档</td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td class="zoon-cell"><span class="check">✓</span></td>
        </tr>
        <tr>
          <td class="row-label">真人和 Agent 在同一个 URL 实时同步</td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td><span class="cross">✕</span></td>
          <td class="zoon-cell"><span class="check">✓</span></td>
        </tr>
      </tbody>
    </table>
    <div class="table-hint" aria-hidden="true">← 左右滑动看完整对比 →</div>
    </div>
  </div>
</section>

<section class="roles-section" id="roles">
  <div class="wrap">
    <p class="eyebrow-tag">谁在用</p>
    <h2 class="section-title">每个角色都有自己的<em>紫色困境</em>。</h2>
    <p class="section-sub">只要你的工作是「写一份要交付的文档 + 让 AI 帮你改其中几句」，Zoon 就比对话窗口快。</p>

    <div class="role-tabs" role="tablist">
      <button class="role-tab active" data-target="role-pm" type="button">产品经理<span class="label-en">PRD · 需求文档</span></button>
      <button class="role-tab" data-target="role-eng" type="button">工程师<span class="label-en">README · 技术设计</span></button>
      <button class="role-tab" data-target="role-research" type="button">研究 / 学生<span class="label-en">论文 · 笔记</span></button>
      <button class="role-tab" data-target="role-creator" type="button">内容创作者<span class="label-en">长文 · 公众号 · 博客</span></button>
    </div>

    <div class="role-panel active" id="role-pm">
      <div class="role-text">
        <h3>把 PRD 交给 Agent 写大纲，自己保留判断权。</h3>
        <p class="scenario">你写下"做一个 Q2 留资增长实验"——Agent 自动展开 7 段大纲，全紫色。你看一眼，第 2 段的假设不对，点一下改成自己的判断（变绿色）。最后导出 PRD，每个字属于谁清清楚楚。</p>
        <p class="role-quote">"以前让 AI 改 PRD，我得逐字 diff 才敢接受。Zoon 里 agent 直接把新段落写进来，紫色一眼能看出是它加的——我只点不满意的那一句，对话保持干净。"</p>
        <p class="role-byline"><strong>林</strong> · 互联网汽车垂媒 · 增长产品经理</p>
      </div>
      <div class="role-mock">
        <strong style="font-family: var(--display); font-size: 18px;"># PRD: Q2 留资增长</strong><br>
        <span style="color: var(--ink); display: block; padding: 4px 0;">## 背景</span>
        <span style="color: #2d1c5a; background: var(--ai-soft); border-left: 2px solid var(--ai-strong); padding: 4px 10px; display: block; margin: 4px 0;">当前留资率 18%，距离 KPI 24% 仍有 6 个百分点缺口。</span>
        <span style="color: var(--ink); display: block; padding: 4px 0;">## 核心假设</span>
        <span style="color: #2d1c5a; background: var(--ai-soft); border-left: 2px solid var(--ai-strong); padding: 4px 10px; display: block; margin: 4px 0;">首页 CTA 措辞影响转化率最高 5pp。</span>
        <span style="color: var(--ink); background: var(--human-soft); border-left: 2px solid var(--human-strong); padding: 4px 10px; display: block; margin: 4px 0;">↻ 经验上是 2-3pp，5pp 太乐观，改用 A/B 实测。</span>
      </div>
    </div>
    <div class="role-panel" id="role-eng">
      <div class="role-text">
        <h3>README、设计文档、API 描述——让 Agent 起稿，你做技术校对。</h3>
        <p class="scenario">技术文档天然适合双 buffer：架构那段是你写的（绿色，权威），快速上手那段是 Agent 写的（紫色，可被替换）。改 endpoint 名字时，Agent 自动把例子也改了，你只需要确认那段紫色是不是你想要的。</p>
        <p class="role-quote">"Codex 直接 PR 改 README，紫色段落让我一眼看到 agent 改了哪——再也不用打开 git blame 来回比对。"</p>
        <p class="role-byline"><strong>Alex</strong> · Backend Engineer · 独立开发者</p>
      </div>
      <div class="role-mock">
        <code style="font-family: var(--mono); font-size: 12px; color: var(--muted); display: block; margin-bottom: 8px;">README.md · rev 27</code>
        <strong style="font-family: var(--display); font-size: 18px;"># Auth Service</strong><br>
        <span style="color: var(--ink); display: block; padding: 4px 0;">## Architecture</span>
        <span style="color: var(--ink); padding: 4px 0; display: block;">JWT + refresh token，Redis 存 session。</span>
        <span style="color: var(--ink); display: block; padding: 4px 0;">## Quick Start</span>
        <span style="color: #2d1c5a; background: var(--ai-soft); border-left: 2px solid var(--ai-strong); padding: 4px 10px; display: block; margin: 4px 0; font-family: var(--mono); font-size: 12px;">$ npm install<br>$ npm run migrate<br>$ npm run dev</span>
      </div>
    </div>
    <div class="role-panel" id="role-research">
      <div class="role-text">
        <h3>每段引用、每个观点——清楚标记是你的还是 AI 推理出来的。</h3>
        <p class="scenario">写综述时让 Agent 整理某个分支的研究脉络，但你必须知道哪些段落是它综合的、哪些是你结论。Zoon 帮你天然分开：紫色段落要更严的引用核查，绿色段落是你已经判断过的。</p>
        <p class="role-quote">"学术诚信第一位。Zoon 让我导师能一眼看出哪段是 AI 写的——这反而让我用 AI 用得更放心。"</p>
        <p class="role-byline"><strong>子琪</strong> · 计算机科学研究生</p>
      </div>
      <div class="role-mock">
        <code style="font-family: var(--mono); font-size: 12px; color: var(--muted); display: block; margin-bottom: 8px;">综述 § 3.2 · rev 14</code>
        <span style="color: var(--ink); padding: 4px 0; display: block; font-size: 14px;">多智能体协议的早期工作可追溯至 1990 年代的 KQML。</span>
        <span style="color: #2d1c5a; background: var(--ai-soft); border-left: 2px solid var(--ai-strong); padding: 4px 10px; display: block; margin: 4px 0; font-size: 14px;">近期 MCP 与 ACP 的兴起代表了第三代尝试。<sup>[需引用]</sup></span>
      </div>
    </div>
    <div class="role-panel" id="role-creator">
      <div class="role-text">
        <h3>初稿 AI 写，你只改打动不到自己的那几句。</h3>
        <p class="scenario">长文创作里 80% 的痛苦是"AI 写得还行但我能挑出 10 处别扭"——以前你得回到对话说"重写第 3 段"，现在直接点那 10 处，每一处独立修。风格保持稳定，对话不污染。</p>
        <p class="role-quote">"我用 AI 写公众号草稿，但 voice 必须是我的。在 Zoon 里我看到紫色字就改成绿色——别人看不出 AI 痕迹，但我心里清楚那 30% 是我自己的句子。"</p>
        <p class="role-byline"><strong>Yan</strong> · 内容创作者 · 12k 公众号</p>
      </div>
      <div class="role-mock">
        <code style="font-family: var(--mono); font-size: 12px; color: var(--muted); display: block; margin-bottom: 8px;">公众号草稿 · 2900 字</code>
        <span style="color: #2d1c5a; background: var(--ai-soft); border-left: 2px solid var(--ai-strong); padding: 4px 10px; display: block; margin: 4px 0;">这是一个关于专注的故事。在信息爆炸的时代……</span>
        <span style="color: var(--ink); background: var(--human-soft); border-left: 2px solid var(--human-strong); padding: 4px 10px; display: block; margin: 4px 0;">上周三晚上 11 点，我盯着同一段视频回放看了 17 遍。</span>
      </div>
    </div>
  </div>
</section>

<div class="prov-divider" aria-hidden="true"></div>

<section class="connect-section" id="connect">
  <div class="wrap">
    <p class="eyebrow-tag">2 步接入</p>
    <h2 class="section-title">你用什么 AI 工具？<em>对应一行命令。</em></h2>
    <p class="section-sub">Zoon 是一个 HTTP 协议，所有能发请求的 agent 都能加入。选你用的那个：</p>

    <div class="tool-picker" role="tablist">
      <button class="tool-card active" data-code="claude" type="button">
        <div class="name">Claude Code</div><div class="meta">Plugin · 一行命令</div>
      </button>
      <button class="tool-card" data-code="codex" type="button">
        <div class="name">Codex / Cursor</div><div class="meta">SKILL.md 文件</div>
      </button>
      <button class="tool-card" data-code="chatgpt" type="button">
        <div class="name">ChatGPT / 其他</div><div class="meta">复制 prompt</div>
      </button>
      <button class="tool-card" data-code="curl" type="button">
        <div class="name">原生 HTTP</div><div class="meta">curl 直接调</div>
      </button>
    </div>

    <div class="code-card">
      <span class="lang">bash</span>
      <pre id="v2-code-content" style="margin:0; white-space: pre-wrap;"><span class="comment"># 1. 装入 Claude Code 插件市场</span>
<span class="kw">/plugin marketplace add</span> <span class="str">https://github.com/stephenfan80/human-agent-collab</span>

<span class="comment"># 2. 安装 zoon skill</span>
<span class="kw">/plugin install</span> <span class="str">zoon@human-agent-collab</span>

<span class="comment"># 现在把任意 Zoon 文档 URL 发给 Claude，它就能直接读写。</span></pre>
      <button class="copy-btn" id="v2-code-copy" type="button">copy</button>
    </div>
  </div>
</section>

<section class="faq-section" id="faq">
  <div class="wrap">
    <div class="faq-grid">
      <div>
        <p class="eyebrow-tag">常见问题</p>
        <h2 class="section-title">你大概想问<br>这些。</h2>
        <p class="section-sub">其它问题在 <a href="/agent-docs" style="color: var(--accent); text-decoration: underline;">/agent-docs</a> 里都有答案。</p>
      </div>
      <div class="faq-list">
        <div class="faq-item open">
          <div class="faq-q">和 Notion AI / Google Docs Gemini 到底差在哪？<span class="toggle">+</span></div>
          <div class="faq-a">它们的 AI 是「在文档里给你回答」，但不会让 agent 通过 HTTP 直接读写。最关键的是——它们不做字符级溯源，AI 改了就改了，看不出来。Zoon 是反过来的：每个字都标作者，agent 是一等公民。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">我的文档存在哪？私密性如何？<span class="toggle">+</span></div>
          <div class="faq-a">托管版存在 Railway 实例（SQLite，加密备份）。想要完全私有？一份 Dockerfile，部署到你自己的服务器，文档不出公司网络。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">现在免费，以后会收费吗？<span class="toggle">+</span></div>
          <div class="faq-a">核心代码 MIT 永久开源，self-host 永远免费。托管版会保留个人/小团队免费档，未来对企业级（团队空间、SSO、审计日志）收费——但你已经创建的文档不会被锁死。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Agent 会不会偷偷读我的文档？<span class="toggle">+</span></div>
          <div class="faq-a">不会。Agent 只在你把 URL 复制给它、且它发 presence 加入后，才能读写。所有写操作必须带 <code style="font-family: var(--mono); background: var(--bg-deep); padding: 1px 5px; border-radius: 3px;">by: "ai:&lt;name&gt;"</code> 才会被接受。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">如果 AI 写错了，怎么撤销？<span class="toggle">+</span></div>
          <div class="faq-a">紫色段落点一下就能改、删、或让 agent 重写这一段。完整的 revision 历史也在 <code style="font-family: var(--mono); background: var(--bg-deep); padding: 1px 5px; border-radius: 3px;">/snapshot</code> 里，任何改动都能回滚。</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">我能 self-host 吗？<span class="toggle">+</span></div>
          <div class="faq-a">可以。clone 仓库，跑 <code style="font-family: var(--mono); background: var(--bg-deep); padding: 1px 5px; border-radius: 3px;">npm run serve</code>，或者用 Dockerfile + Railway 一键部署。详见 <code style="font-family: var(--mono); background: var(--bg-deep); padding: 1px 5px; border-radius: 3px;">DEPLOY.md</code>。</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="final-cta" id="cta">
  <div class="wrap" style="position: relative; z-index: 2">
    <p class="eyebrow-tag" style="justify-content: center; display: inline-flex">现在试试</p>
    <h2 class="section-title" style="text-align: center; margin: 0 auto 24px">
      下次让 Agent 写文档时，<br>
      把 URL 而不是 <em>整段输出</em> 发给它。
    </h2>
    <p class="section-sub">10 秒创建一份空文档，把链接复制给你的 AI 工具，让它写。<br>你点紫色字改，它写紫色字回应。</p>
    <div class="hero-ctas" style="justify-content: center">
      <button class="btn-primary create-doc-trigger" type="button">
        <span>10 秒创建协作文档</span>
        <small>无需注册</small>
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
          <path d="M1 7H18M18 7L12 1M18 7L12 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <a href="/agent-docs" class="btn-ghost">读 Agent 协议 →</a>
    </div>
    <p class="final-flair">— Zoon, 一份给 agent 也给人类的草稿纸 —</p>
  </div>
  <div class="watermark">Zoon.</div>
</section>
</main>

<footer class="foot-v2">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a href="/" class="logo" style="font-size: 32px;">Zoon<span class="dot">.</span></a>
        <p class="foot-blurb">人和 agent 写在同一张纸上。<br>每个字都知道是谁写的。</p>
      </div>
      <div class="foot-col">
        <h5>产品</h5>
        <a href="#why">怎么协作</a>
        <a href="#roles">谁在用</a>
        <a href="#faq">FAQ</a>
      </div>
      <div class="foot-col">
        <h5>给 Agent</h5>
        <a href="/skill">/skill</a>
        <a href="/agent-docs">/agent-docs</a>
        <a href="https://github.com/stephenfan80/human-agent-collab">SKILL.md</a>
      </div>
    </div>
    <div class="foot-base">
      <span>© 2026 Zoon · MIT</span>
      <span style="font-style: italic; font-family: var(--display);">"草稿纸应该让所有写字的人留下痕迹。"</span>
    </div>
  </div>
</footer>

</div>

<script>${HOMEPAGE_SCRIPT}</script>
<script>
  (function () {
    // role tabs
    var roleTabs = document.querySelectorAll('.role-tab');
    var rolePanels = document.querySelectorAll('.role-panel');
    roleTabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-target');
        roleTabs.forEach(function (b) { b.classList.remove('active'); });
        rolePanels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.getElementById(target);
        if (panel) panel.classList.add('active');
      });
    });

    // tool picker — code blocks indexed by data-code
    var codeBlocks = {
      claude: [
        '<span class="comment"># 1. 装入 Claude Code 插件市场</span>',
        '<span class="kw">/plugin marketplace add</span> <span class="str">https://github.com/stephenfan80/human-agent-collab</span>',
        '',
        '<span class="comment"># 2. 安装 zoon skill</span>',
        '<span class="kw">/plugin install</span> <span class="str">zoon@human-agent-collab</span>',
        '',
        '<span class="comment"># 现在把任意 Zoon 文档 URL 发给 Claude，它就能直接读写。</span>'
      ].join('\\n'),
      codex: [
        '<span class="comment"># 把 SKILL.md 装到 Codex / Cursor 的 skills 目录</span>',
        '<span class="kw">mkdir</span> -p ~/.codex/skills/zoon',
        '<span class="kw">curl</span> -fsSL <span class="str">${origin}/skill</span> \\\\',
        '  -o ~/.codex/skills/zoon/SKILL.md',
        '',
        '<span class="comment"># 然后让 agent: "用 zoon skill 协作这份文档 &lt;URL&gt;"</span>'
      ].join('\\n'),
      chatgpt: [
        '<span class="comment"># 把这段贴进 ChatGPT 的对话开头：</span>',
        '',
        '<span class="str">"接下来我们要协作一份 Zoon 文档。',
        '请从 ${origin}/skill',
        '读取 skill 指引，然后告诉我你准备好了。"</span>',
        '',
        '<span class="comment"># ChatGPT 会自动 fetch 协议，然后等你给任务。</span>'
      ].join('\\n'),
      curl: [
        '<span class="comment"># 创建文档</span>',
        '<span class="kw">curl</span> -X POST <span class="str">${origin}/documents</span> \\\\',
        '  -H <span class="str">"Content-Type: application/json"</span> \\\\',
        '  -d <span class="str">\\'{"markdown":"# Draft\\\\n\\\\nStart here.","title":"Draft"}\\'</span>',
        '',
        '<span class="comment"># 写入一段（紫色 AI 段落）</span>',
        '<span class="kw">curl</span> -X POST <span class="str">$URL/edit/v2</span> \\\\',
        '  -H <span class="str">"x-share-token: $TOKEN"</span> \\\\',
        '  -d <span class="str">\\'{"by":"ai:claude","operations":[',
        '    {"op":"insert_at_end","markdown":"New paragraph"}',
        '  ]}\\'</span>'
      ].join('\\n')
    };
    var codeContent = document.getElementById('v2-code-content');
    document.querySelectorAll('.tool-card').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('.tool-card').forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
        var key = card.getAttribute('data-code');
        if (codeContent && codeBlocks[key]) codeContent.innerHTML = codeBlocks[key];
      });
    });
    var copyBtn = document.getElementById('v2-code-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async function () {
        var text = (codeContent && codeContent.innerText) || '';
        try {
          await navigator.clipboard.writeText(text.trim());
          var orig = copyBtn.textContent;
          copyBtn.textContent = '✓ copied';
          setTimeout(function () { copyBtn.textContent = orig; }, 1600);
        } catch (e) {}
      });
    }

    // FAQ accordion
    document.querySelectorAll('.faq-q').forEach(function (q) {
      q.addEventListener('click', function () {
        q.parentElement.classList.toggle('open');
      });
    });
  })();
</script>
</body>
</html>`;
}
