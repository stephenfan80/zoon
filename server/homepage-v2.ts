/**
 * Zoon 首页 V2 — Claude design implementation
 *
 * Source design: /Users/stephenfan/Downloads/Zoon Homepage.html
 *
 * Runtime hooks intentionally stay shared with the original homepage:
 * - HOMEPAGE_SCRIPT owns login/account state and .create-doc-trigger creation.
 * - .create-doc-trigger still POSTs /api/public/documents and redirects to /d/<slug>?token=...&welcome=1.
 */

import { HOMEPAGE_SCRIPT } from './homepage.js';

const REDESIGN_STYLES = String.raw`/* ─── RESET & BASE ─────────────────────────────────── */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; overflow-x: hidden; }
body { overflow-x: hidden; }

:root {
  --bg:          #f4f0e7;
  --bg-deep:     #ece4d0;
  --paper:       #fcfaf2;
  --surface:     #fcfaf2;
  --ink:         #1a1913;
  --ink-soft:    #2b2a22;
  --muted:       #716c5f;
  --muted-2:     #95907f;
  --line:        #d8cfb8;
  --line-soft:   #e8e1d1;
  --accent:      #4a5d3a;
  --accent-dark: #2f3d25;
  --accent-deep: #1f2a17;
  --human:       #6fb892;
  --human-str:   #4ea273;
  --human-soft:  #cee9d8;
  --ai:          #a991e3;
  --ai-str:      #8a6dd1;
  --ai-soft:     #e2d6f5;
  --coral:       #e8a17d;
  --gold:        #e8c97d;
  --warn:        #c8543c;
  --warn-soft:   #f1d5cd;
  --ff-display:  'Fraunces', 'Iowan Old Style', Georgia, serif;
  --ff-body:     'Plus Jakarta Sans', ui-sans-serif, system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --ff-mono:     'JetBrains Mono', ui-monospace, Menlo, monospace;
  --r-nav:       64px;   /* nav height */
}

body {
  font-family: var(--ff-body);
  background: var(--bg);
  color: var(--ink);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

/* subtle texture bg */
body::before {
  content: '';
  position: fixed; inset: 0;
  background-image:
    radial-gradient(circle at 12% 18%, rgba(111,184,146,.14), transparent 36%),
    radial-gradient(circle at 88% 62%, rgba(169,145,227,.12), transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.shell { position: relative; z-index: 1; }
.wrap  { max-width: 1240px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 40px); }

/* ─── NAV ──────────────────────────────────────────── */
.nav {
  position: sticky; top: 0; z-index: 200;
  height: var(--r-nav);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
}
.nav-inner {
  display: flex; align-items: center;
  height: 100%;
  gap: 24px;
}
.logo {
  font-family: var(--ff-display);
  font-weight: 600; font-size: 26px;
  letter-spacing: -0.5px;
  color: var(--ink); text-decoration: none;
  flex-shrink: 0;
  display: inline-flex; align-items: baseline; gap: 1px;
}
.logo .dot { font-style: italic; color: var(--accent); }

.nav-links {
  display: flex; gap: 22px;
  margin-left: auto;
  font-size: 14px; font-weight: 500;
}
.nav-links a {
  color: var(--muted); text-decoration: none;
  padding: 4px 0; position: relative;
  transition: color .2s;
}
.nav-links a:hover { color: var(--ink); }
.nav-links a::after {
  content: ''; position: absolute; left: 0; bottom: -2px;
  width: 0; height: 2px; background: var(--accent);
  transition: width .22s ease;
}
.nav-links a:hover::after { width: 100%; }

/* hamburger (mobile) */
.nav-hamburger {
  display: none;
  margin-left: auto;
  width: 44px; height: 44px;
  align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  border-radius: 10px;
  color: var(--ink);
  flex-direction: column; gap: 5px;
  transition: background .15s;
}
.nav-hamburger:hover { background: color-mix(in srgb, var(--ink) 8%, transparent); }
.nav-hamburger span {
  display: block; width: 22px; height: 2px;
  background: currentColor; border-radius: 2px;
  transition: transform .25s ease, opacity .2s;
}
.nav-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.nav-hamburger.open span:nth-child(2) { opacity: 0; }
.nav-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* mobile drawer */
.nav-drawer {
  display: none;
  position: fixed;
  top: var(--r-nav); left: 0; right: 0;
  background: var(--paper);
  border-bottom: 1.5px solid var(--ink);
  padding: 20px clamp(20px, 5vw, 40px) 24px;
  flex-direction: column; gap: 4px;
  z-index: 199;
  box-shadow: 0 12px 32px rgba(26,25,19,.12);
}
.nav-drawer.open { display: flex; }
.nav-drawer a {
  display: block; padding: 12px 0;
  font-size: 17px; font-weight: 600;
  color: var(--ink); text-decoration: none;
  border-bottom: 1px solid var(--line-soft);
}
.nav-drawer a:last-child { border-bottom: none; }

/* account button */
.home-account { position: relative; display: inline-flex; align-items: center; }
.home-account-trigger {
  font-family: var(--ff-body);
  font-size: 13px; font-weight: 700;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1.5px solid var(--ink);
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--accent);
  transition: transform .15s, box-shadow .18s, background .15s;
  white-space: nowrap;
}
.home-account-trigger:hover {
  background: var(--ink); color: var(--bg);
  transform: translate(-1px,-1px);
  box-shadow: 3px 3px 0 var(--accent);
}
.home-account-panel {
  position: absolute; top: calc(100% + 12px); right: 0;
  width: min(360px, calc(100vw - 24px));
  max-height: min(560px, calc(100vh - 96px));
  overflow: auto; padding: 10px;
  border: 1.5px solid var(--ink); border-radius: 10px;
  background: rgba(26,25,19,.96); color: var(--paper);
  box-shadow: 6px 6px 0 rgba(74,93,58,.36);
  z-index: 400;
}
.home-account-panel[hidden],
.home-auth-modal[hidden] { display: none; }
.home-account-head, .home-doc-row, .home-doc-link {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.home-account-head { padding: 4px 8px 10px; }
.home-account-name, .home-doc-title {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 13px; font-weight: 800;
}
.home-account-email, .home-doc-meta, .home-doc-time, .home-account-status {
  color: rgba(252,250,242,.56); font-size: 11px; font-weight: 600;
}
.home-account-logout, .home-doc-action {
  flex-shrink: 0;
  border: 1px solid rgba(252,250,242,.18); background: rgba(252,250,242,.06);
  color: rgba(252,250,242,.76); border-radius: 999px;
  padding: 5px 9px; font-family: var(--ff-body); font-size: 11px; font-weight: 800; cursor: pointer;
}
.home-doc-action.danger { border-color: rgba(248,113,113,.36); background: rgba(127,29,29,.22); color: rgba(254,202,202,.96); }
.home-account-new {
  display: flex; justify-content: center; margin-bottom: 8px; padding: 10px;
  border-radius: 10px; background: rgba(252,250,242,.10); color: var(--paper);
  text-decoration: none; font-size: 13px; font-weight: 800;
}
.home-account-label {
  padding: 4px 8px 6px; color: rgba(252,250,242,.54); font-size: 11px;
  font-weight: 900; letter-spacing: .05em; text-transform: uppercase;
}
.home-doc-row { padding: 10px; border-radius: 10px; }
.home-doc-row:hover { background: rgba(252,250,242,.08); }
.home-doc-link { min-width: 0; flex: 1 1 auto; color: inherit; text-decoration: none; }
.home-account-status { padding: 10px; line-height: 1.5; }

/* auth modal */
body.home-auth-open { overflow: hidden; }
.home-auth-modal {
  position: fixed; inset: 0;
  display: grid; place-items: start center;
  padding: clamp(72px,12vh,128px) 20px 32px;
  z-index: 1600;
}
.home-auth-backdrop {
  position: fixed; inset: 0;
  background: radial-gradient(circle at 78% 18%, rgba(136,194,160,.22), transparent 34%), rgba(36,35,29,.44);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.home-auth-card {
  position: relative; width: min(430px, calc(100vw - 40px));
  border: 1px solid rgba(36,35,29,.10); border-radius: 24px;
  background: color-mix(in srgb, var(--surface) 96%, white);
  box-shadow: 0 34px 90px rgba(43,42,34,.32); padding: 24px; color: var(--ink);
}
.home-auth-close {
  position: absolute; top: 16px; right: 16px;
  width: 34px; height: 34px; border: 1px solid rgba(36,35,29,.10);
  border-radius: 999px; background: rgba(255,255,255,.58); color: var(--muted);
  cursor: pointer; font: inherit; font-size: 20px; line-height: 1;
}
.home-auth-close:hover { color: var(--ink); background: #fff; }
.home-auth-eyebrow { color: var(--accent-dark); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; }
.home-auth-title { font-family: var(--ff-display); font-size: 34px; line-height: 1.05; margin: 0 44px 8px 0; }
.home-auth-copy { margin: 0 0 18px; color: var(--muted); font-size: 14px; line-height: 1.65; }
.home-auth-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px;
  margin-bottom: 16px; border: 1px solid rgba(36,35,29,.10); border-radius: 16px;
  background: rgba(36,35,29,.04);
}
.home-auth-tab {
  min-height: 38px; border: 0; border-radius: 12px; background: transparent;
  color: var(--muted); cursor: pointer; font: inherit; font-size: 13px; font-weight: 800;
}
.home-auth-tab.is-active { background: #fff; color: var(--ink); box-shadow: 0 2px 10px rgba(43,42,34,.08); }
.home-auth-form { display: grid; gap: 12px; }
.home-auth-field { display: grid; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 700; }
.home-auth-field input {
  width: 100%; min-height: 46px; border: 1px solid rgba(36,35,29,.14); border-radius: 14px;
  background: #fff; color: var(--ink); padding: 0 13px; font: inherit; font-size: 14px; outline: none;
}
.home-auth-field input:focus { border-color: color-mix(in srgb, var(--accent) 70%, #fff); box-shadow: 0 0 0 4px rgba(136,194,160,.18); }
.home-auth-status { min-height: 18px; color: #9b3f2f; font-size: 12px; line-height: 1.45; }
.home-auth-primary {
  min-height: 48px; border: 0; border-radius: 16px; background: var(--accent-dark); color: #fff;
  cursor: pointer; font: inherit; font-size: 15px; font-weight: 900; box-shadow: 0 5px 0 rgba(47,78,40,.28);
}
.home-auth-primary:hover { transform: translateY(-1px); }
.home-auth-primary[disabled] { opacity: .7; cursor: wait; transform: none; }
.home-auth-foot { margin-top: 14px; display: flex; justify-content: center; gap: 6px; color: var(--muted); font-size: 13px; }
.home-auth-link { border: 0; background: transparent; color: var(--accent-dark); cursor: pointer; font: inherit; font-weight: 800; padding: 0; }

/* ─── SECTION COMMON ───────────────────────────────── */
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--ff-mono); font-size: 12px; text-transform: uppercase;
  letter-spacing: .14em; color: var(--accent-dark); font-weight: 700;
  margin-bottom: 18px;
}
.eyebrow::before { content: ''; width: 22px; height: 2px; background: var(--accent); flex-shrink: 0; }

.sec-title {
  font-family: var(--ff-display); font-weight: 500;
  font-size: clamp(30px, 4.5vw, 60px);
  line-height: 1.05; letter-spacing: -.02em;
  color: var(--ink); margin-bottom: 18px;
  text-wrap: balance;
}
.sec-title em { font-style: italic; font-weight: 400; color: var(--accent-dark); }
.sec-sub { font-size: clamp(15px, 1.4vw, 18px); line-height: 1.6; color: var(--ink-soft); max-width: 600px; margin-bottom: 48px; }

/* ─── HERO ─────────────────────────────────────────── */
.hero { padding: clamp(20px,3.8vh,40px) 0 clamp(38px,6.5vh,64px); }
.hero-grid {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: clamp(28px, 3.6vw, 48px);
  align-items: center;
}

.hero-title {
  font-family: var(--ff-display); font-weight: 500;
  font-size: clamp(42px, 5vw, 72px);
  line-height: 1.03; letter-spacing: -.022em;
  color: var(--ink); margin-bottom: 16px;
  text-wrap: balance;
}
.hero-title em { font-style: italic; font-weight: 400; }

.mark {
  position: relative; display: inline; padding: 0 .12em .02em .1em;
  font-style: italic; font-weight: 500;
}
.mark::before {
  content: ''; position: absolute;
  inset: .06em -.06em .06em -.06em;
  z-index: -1; border-radius: 2px;
  transform: skew(-2deg) rotate(-.5deg);
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
  font-size: clamp(15px, 1.35vw, 17.5px); line-height: 1.55;
  color: var(--ink-soft); max-width: 560px; margin-bottom: 22px;
}
.hero-sub strong {
  font-weight: 700; color: var(--ink);
  background: linear-gradient(180deg, transparent 64%, color-mix(in srgb, var(--gold) 60%, transparent) 64%);
}

.hero-ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 12px;
  padding: 16px 26px;
  font-family: var(--ff-body); font-size: 15px; font-weight: 700;
  background: var(--ink); color: var(--bg);
  border-radius: 13px; text-decoration: none;
  border: 2px solid var(--ink);
  box-shadow: 4px 4px 0 var(--accent), 4px 4px 0 1.5px var(--ink);
  transition: transform .13s ease, box-shadow .18s ease, background .15s;
  cursor: pointer; white-space: nowrap;
  min-height: 52px;
}
.btn-primary small {
  font-family: var(--ff-mono); font-size: 11px; font-weight: 500; opacity: .65;
  padding: 3px 7px; border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 18%, transparent);
}
.btn-primary:hover {
  transform: translate(-2px,-2px);
  box-shadow: 6px 6px 0 var(--accent), 6px 6px 0 1.5px var(--ink);
}
.btn-primary[disabled] { cursor: wait; opacity: .75; }
.btn-primary svg { flex-shrink: 0; transition: transform .22s ease; }
.btn-primary:hover svg { transform: translateX(4px); }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 16px 20px;
  font-size: 14px; font-weight: 600; color: var(--ink-soft);
  text-decoration: none; border-radius: 13px;
  border: 1.5px dashed color-mix(in srgb, var(--ink) 28%, transparent);
  background: transparent; cursor: pointer;
  transition: background .2s, border-color .2s;
  min-height: 52px;
}
.btn-ghost:hover { background: color-mix(in srgb, var(--paper) 70%, transparent); border-color: var(--ink); }

.trust-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 7px 12px;
  font-family: var(--ff-mono); font-size: 12px; color: var(--muted);
}
.trust-bar .label { text-transform: uppercase; letter-spacing: .1em; color: var(--muted-2); font-weight: 600; font-size: 11px; }
.trust-bar .pill {
  padding: 3px 9px; border-radius: 999px;
  background: color-mix(in srgb, var(--paper) 70%, transparent);
  border: 1px solid var(--line); color: var(--ink-soft); font-weight: 600; font-size: 11.5px;
}

/* ─── DEMO CARD ─────────────────────────────────────── */
.hero-demo { position: relative; }
.demo-card {
  background: var(--paper); border: 1.5px solid var(--ink);
  border-radius: 18px;
  box-shadow: 7px 7px 0 var(--ink), 7px 7px 0 1.5px var(--ai-str);
  overflow: hidden;
  transition: transform .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s;
}
.demo-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 11px 15px; border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-deep) 55%, var(--paper));
}
.demo-bar .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.demo-bar .dot:nth-child(1) { background: var(--coral); }
.demo-bar .dot:nth-child(2) { background: var(--gold); }
.demo-bar .dot:nth-child(3) { background: var(--human); }
.demo-bar .title { margin-left: 8px; font-family: var(--ff-mono); font-size: 12px; color: var(--muted); letter-spacing: .02em; }
.demo-actions {
  margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-family: var(--ff-body);
}
.demo-action {
  display: inline-flex; align-items: center;
  min-height: 26px; padding: 0 9px; border-radius: 999px;
  border: 1px solid rgba(26,25,19,.12); background: rgba(255,255,255,.7);
  color: var(--ink); font-size: 11px; font-weight: 800; white-space: nowrap;
}
.demo-action.dark { background: var(--ink); border-color: var(--ink); color: var(--bg); }

.demo-body {
  display: grid; grid-template-columns: 13px 1fr;
  gap: 13px; padding: 20px 20px 68px;
}
.prov-rail { display: flex; flex-direction: column; gap: 3px; border-radius: 4px; overflow: hidden; }
.prov-seg { width: 100%; }
.prov-seg.h { background: var(--human); }
.prov-seg.a { background: var(--ai); }

.demo-content {
  font-family: var(--ff-display); font-size: 15px; line-height: 1.7; color: var(--ink-soft);
}
.demo-content h4 {
  font-family: var(--ff-display); font-weight: 700; font-size: 15px;
  color: var(--ink); margin: 0 0 4px; letter-spacing: -.01em;
}
.demo-content h4 .hash { color: var(--muted-2); margin-right: 5px; }

.seg { display: block; padding: 2px 5px; margin: 0 -5px 7px; border-radius: 4px; }
.seg.human { color: var(--ink); }
.seg.ai {
  background: color-mix(in srgb, var(--ai-soft) 60%, transparent);
  color: #2d1c5a; border-left: 2px solid var(--ai-str); padding-left: 9px;
  position: relative;
}
.seg.ai.selected {
  outline: 2px solid var(--ai-str); outline-offset: 2px;
  background: color-mix(in srgb, var(--ai-soft) 85%, white);
}
.seg.edited {
  background: color-mix(in srgb, var(--human-soft) 66%, transparent);
  color: var(--ink); border-left: 2px solid var(--human-str); padding-left: 9px; position: relative;
}
.seg.edited::before {
  content: '↻ 你刚改了这句';
  position: absolute; top: -9px; left: 8px;
  font-family: var(--ff-mono); font-size: 10px;
  background: var(--human-str); color: white; padding: 2px 7px; border-radius: 4px;
}

.cursor {
  display: inline-block; width: 2px; height: 1em;
  background: var(--ai-str); margin-left: 1px; vertical-align: -.15em;
  animation: blink 1s steps(2) infinite;
}
@keyframes blink { 50% { opacity: 0; } }

.demo-context-menu {
  position: absolute; right: 16px; bottom: 16px;
  width: min(232px, calc(100% - 36px));
  padding: 5px; border-radius: 10px;
  border: 1px solid rgba(26,25,19,.15);
  background: rgba(252,250,242,.98);
  box-shadow: 0 14px 30px rgba(26,25,19,.16), 3px 3px 0 rgba(138,109,209,.24);
  font-family: var(--ff-body); z-index: 2;
}
.demo-menu-item {
  display: flex; align-items: center; justify-content: space-between; gap: 9px;
  min-height: 30px; padding: 6px 8px; border-radius: 7px;
  color: var(--ink); font-size: 12px; font-weight: 700;
}
.demo-menu-item.strong { background: color-mix(in srgb, var(--ai-soft) 50%, transparent); }
.demo-menu-shortcut, .demo-menu-arrow { color: var(--muted-2); font-family: var(--ff-mono); font-size: 10px; font-weight: 700; }
.demo-submenu { display: grid; grid-template-columns: repeat(3,1fr); gap: 3px; padding: 2px 4px 5px; }
.demo-submenu span {
  display: inline-flex; justify-content: center; align-items: center;
  min-height: 22px; border-radius: 5px;
  background: color-mix(in srgb, var(--bg-deep) 74%, white);
  color: var(--muted); font-size: 10px; font-weight: 800; white-space: nowrap;
}
.demo-menu-sep { height: 1px; margin: 3px 5px; background: var(--line-soft); }

.presence-chip {
  position: absolute; bottom: -14px; right: 16px;
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px;
  background: var(--ink); color: white; border-radius: 999px;
  font-family: var(--ff-mono); font-size: 11.5px;
  border: 1.5px solid var(--ink); box-shadow: 3px 3px 0 var(--ai-str);
}
.presence-chip .pdot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--ai);
  animation: pulse-soft 1.6s ease-in-out infinite;
}
@keyframes pulse-soft { 0%,100% { transform: scale(1); } 50% { transform: scale(1.4); } }

/* ─── DIVIDER ───────────────────────────────────────── */
.stripe-divider {
  height: 28px;
  background: repeating-linear-gradient(90deg,
    var(--human) 0 13px, var(--ai) 13px 26px,
    var(--human) 26px 34px, var(--ai) 34px 52px,
    var(--human) 52px 74px, var(--ai) 74px 88px);
  border-top: 1.5px solid var(--ink); border-bottom: 1.5px solid var(--ink);
}

/* ─── COMPARE ───────────────────────────────────────── */
.compare {
  background: var(--bg-deep);
  border-bottom: 1.5px solid var(--ink);
  padding: clamp(64px,8vw,100px) 0;
}
.compare-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 24px; align-items: stretch;
}
.col-card {
  background: var(--paper); border: 1.5px solid var(--ink);
  border-radius: 16px; padding: 26px 24px 28px;
  display: flex; flex-direction: column;
}
.col-card.bad { background: color-mix(in srgb, var(--warn-soft) 46%, var(--paper)); box-shadow: 5px 5px 0 var(--warn); }
.col-card.good { box-shadow: 5px 5px 0 var(--ai-str); }
.col-tag {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--ff-mono); font-size: 11.5px; font-weight: 700;
  letter-spacing: .04em; padding: 4px 9px; border-radius: 4px;
  margin-bottom: 13px; width: fit-content;
}
.col-tag.bad { background: var(--warn); color: white; }
.col-tag.good { background: var(--accent); color: var(--bg); }
.col-title {
  font-family: var(--ff-display); font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 600; line-height: 1.15; letter-spacing: -.015em;
  color: var(--ink); margin-bottom: 20px;
}
.chat-stream { display: flex; flex-direction: column; gap: 9px; flex: 1; }
.bubble {
  padding: 9px 13px; border-radius: 13px; font-size: 13px; line-height: 1.5;
  max-width: 92%; position: relative;
}
.bubble.user {
  align-self: flex-end; background: var(--ink); color: var(--bg);
  border-bottom-right-radius: 4px;
}
.bubble.ai {
  align-self: flex-start; background: white;
  border: 1px solid var(--line); border-bottom-left-radius: 4px; color: var(--ink-soft);
}
.bubble.ai.huge {
  max-width: 100%; font-family: var(--ff-mono);
  font-size: 11px; line-height: 1.4; color: var(--muted);
}
.bubble.ai.huge::after {
  content: '… 又生成了 800 字'; display: block; margin-top: 5px;
  font-style: italic; color: var(--warn); font-weight: 600;
}
.bubble .turn-tag {
  position: absolute; top: -8px; left: 9px;
  font-family: var(--ff-mono); font-size: 9.5px;
  background: var(--bg-deep); border: 1px solid var(--line);
  padding: 1px 5px; border-radius: 3px; color: var(--muted);
}
.bubble.user .turn-tag { left: auto; right: 9px; }
.chat-foot {
  margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--line);
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--ff-mono); font-size: 11.5px;
}
.chat-foot .label { color: var(--muted); }
.chat-foot .stat { color: var(--warn); font-weight: 700; font-size: 13px; }

.doc-demo {
  flex: 1; background: linear-gradient(180deg, var(--bg) 0%, var(--paper) 100%);
  border: 1px dashed var(--line); border-radius: 12px;
  padding: 16px; font-family: var(--ff-display); font-size: 14.5px;
  line-height: 1.7; color: var(--ink-soft); position: relative;
}
.doc-demo .doc-line { display: block; padding: 3px 5px; margin: 0 -5px; border-radius: 3px; }
.doc-demo .doc-line.ai-text {
  background: color-mix(in srgb, var(--ai-soft) 56%, transparent);
  color: #2d1c5a; border-left: 2px solid var(--ai-str); padding-left: 9px; position: relative;
}
.doc-demo .doc-line.edited {
  background: color-mix(in srgb, var(--human-soft) 66%, transparent);
  color: var(--ink); border-left: 2px solid var(--human-str); padding-left: 9px;
}
.step-pill {
  display: inline-block;
  font-family: var(--ff-mono); font-size: 10px;
  background: var(--ink); color: var(--bg);
  padding: 2px 8px; border-radius: 999px; letter-spacing: .04em;
  white-space: nowrap;
}
.action-row { margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
.action-pill {
  font-family: var(--ff-mono); font-size: 11px; font-weight: 600;
  padding: 4px 9px; border-radius: 4px; background: white;
  border: 1px solid var(--line); color: var(--muted);
}
.action-pill.active { background: var(--human); color: var(--accent-deep); border-color: var(--human-str); }
.compare-stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
.compare-stat { display: flex; align-items: baseline; gap: 10px; font-family: var(--ff-mono); font-size: 12px; }
.compare-stat .num { font-family: var(--ff-display); font-weight: 700; font-size: 30px; letter-spacing: -.02em; }
.compare-stat.bad .num { color: var(--warn); }
.compare-stat.good .num { color: var(--accent); }
.compare-stat .desc { color: var(--muted); line-height: 1.35; }

/* ─── PROVENANCE / FEATURES ─────────────────────────── */
.prov-section { padding: clamp(64px,8vw,100px) 0; border-bottom: 1.5px solid var(--ink); }
.prov-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.prov-text p { font-size: 16px; line-height: 1.65; color: var(--ink-soft); margin-bottom: 15px; max-width: 460px; }
.prov-text code {
  font-family: var(--ff-mono); font-size: 12.5px;
  background: var(--bg-deep); padding: 2px 5px; border-radius: 4px; color: var(--accent-dark);
}
.features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 48px; }
.feat {
  background: var(--paper); border: 1.5px solid var(--ink);
  border-radius: 16px; padding: 26px 22px; position: relative;
  transition: transform .22s ease, box-shadow .22s ease;
}
.feat:hover { transform: translate(-3px,-3px); }
.feat-num {
  font-family: var(--ff-display); font-size: 13px; font-weight: 600;
  letter-spacing: .06em; color: var(--muted-2); margin-bottom: 11px;
  display: flex; justify-content: space-between; align-items: center;
}
.feat-num .glyph {
  width: 26px; height: 26px; border-radius: 6px;
  display: grid; place-items: center; font-family: var(--ff-mono); font-size: 12px; flex-shrink: 0;
}
.feat:nth-child(1) { box-shadow: 4px 4px 0 var(--human-str); }
.feat:nth-child(1) .glyph { background: var(--human); color: var(--accent-deep); }
.feat:nth-child(2) { box-shadow: 4px 4px 0 var(--ai-str); }
.feat:nth-child(2) .glyph { background: var(--ai); color: white; }
.feat:nth-child(3) { box-shadow: 4px 4px 0 var(--coral); }
.feat:nth-child(3) .glyph { background: var(--coral); color: var(--ink); }
.feat:hover:nth-child(1) { box-shadow: 7px 7px 0 var(--human-str); }
.feat:hover:nth-child(2) { box-shadow: 7px 7px 0 var(--ai-str); }
.feat:hover:nth-child(3) { box-shadow: 7px 7px 0 var(--coral); }
.feat-title { font-family: var(--ff-display); font-size: 24px; font-weight: 600; letter-spacing: -.015em; margin-bottom: 10px; color: var(--ink); }
.feat-desc { font-size: 14px; line-height: 1.6; color: var(--ink-soft); margin-bottom: 14px; }
.feat-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--ff-mono); font-size: 11px; padding: 3px 9px;
  border-radius: 4px; background: var(--bg-deep); color: var(--muted); font-weight: 600;
}

/* ─── TABLE ─────────────────────────────────────────── */
.table-section {
  padding: clamp(64px,8vw,100px) 0;
  background: var(--ink); color: var(--bg);
  border-bottom: 1.5px solid var(--ink);
}
.table-section .sec-title { color: var(--bg); }
.table-section .eyebrow { color: var(--human); }
.table-section .eyebrow::before { background: var(--human); }
.table-section .sec-sub { color: color-mix(in srgb, var(--bg) 78%, transparent); }
.table-wrap {
  position: relative;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 14px;
  /* mask the overscroll edges on mobile */
  -webkit-mask-image: linear-gradient(90deg, transparent 0, black 20px, black calc(100% - 20px), transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0, black 20px, black calc(100% - 20px), transparent 100%);
}
.table-wrap::-webkit-scrollbar { height: 4px; }
.table-wrap::-webkit-scrollbar-track { background: rgba(255,255,255,.06); border-radius: 2px; }
.table-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,.22); border-radius: 2px; }
.compare-table {
  width: 100%; min-width: 640px;
  border-collapse: separate; border-spacing: 0;
  font-size: 14px;
  background: color-mix(in srgb, var(--ink) 68%, var(--bg-deep) 32%);
  border-radius: 14px; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--bg) 11%, transparent);
}
.compare-table th, .compare-table td {
  padding: 16px 18px; text-align: left;
  border-bottom: 1px solid color-mix(in srgb, var(--bg) 9%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--bg) 9%, transparent);
}
.compare-table th {
  background: color-mix(in srgb, var(--ink) 50%, black);
  color: var(--bg); font-family: var(--ff-mono); font-size: 11.5px;
  letter-spacing: .06em; text-transform: uppercase; font-weight: 600;
}
.compare-table th.zoon-col { background: var(--accent-dark); color: var(--human); font-weight: 800; }
.compare-table tr:last-child td { border-bottom: none; }
.compare-table td:last-child, .compare-table th:last-child { border-right: none; }
.compare-table td.row-label { font-weight: 600; color: var(--bg); }
.compare-table td.zoon-cell { background: color-mix(in srgb, var(--accent-dark) 68%, var(--ink)); color: var(--human); font-weight: 700; }
.compare-table .check { color: var(--human); font-size: 17px; font-weight: 700; }
.compare-table .cross { color: var(--warn); font-size: 17px; }
.table-hint {
  text-align: center; font-family: var(--ff-mono); font-size: 11px;
  letter-spacing: .06em; color: color-mix(in srgb, var(--bg) 52%, transparent);
  margin-top: 12px; display: none;
}

/* ─── ROLES ─────────────────────────────────────────── */
.roles-section { padding: clamp(64px,8vw,100px) 0; }
.role-tabs {
  display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1.5px solid var(--line);
  padding-bottom: 0; margin-bottom: 32px;
}
.role-tab {
  padding: 13px 20px; font-family: var(--ff-body); font-size: 14.5px; font-weight: 600;
  color: var(--muted); background: transparent; border: none; cursor: pointer;
  position: relative; border-bottom: 3px solid transparent; margin-bottom: -1.5px;
  transition: color .2s; min-height: 48px;
}
.role-tab:hover { color: var(--ink); }
.role-tab.active { color: var(--ink); border-bottom-color: var(--accent); }
.role-tab .label-en { display: block; font-family: var(--ff-mono); font-size: 10px; font-weight: 500; color: var(--muted-2); letter-spacing: .06em; margin-top: 2px; }
.role-panel { display: none; grid-template-columns: 1fr 1fr; gap: 52px; align-items: center; }
.role-panel.active { display: grid; }
.role-text h3 { font-family: var(--ff-display); font-size: clamp(24px,3vw,36px); font-weight: 600; line-height: 1.1; letter-spacing: -.015em; margin-bottom: 16px; }
.role-text .scenario { font-size: 15.5px; line-height: 1.6; color: var(--ink-soft); margin-bottom: 20px; }
.role-quote { border-left: 3px solid var(--accent); padding: 10px 0 10px 16px; font-family: var(--ff-display); font-style: italic; font-size: 16px; line-height: 1.55; color: var(--ink-soft); margin-bottom: 12px; }
.role-byline { font-family: var(--ff-mono); font-size: 11.5px; color: var(--muted); }
.role-byline strong { color: var(--ink); font-weight: 700; }
.role-mock {
  background: var(--paper); border: 1.5px solid var(--ink);
  border-radius: 14px; padding: 18px 20px;
  font-family: var(--ff-display); font-size: 14px; line-height: 1.7;
  box-shadow: 5px 5px 0 var(--ink);
}

/* ─── CONNECT ───────────────────────────────────────── */
.connect-section { padding: clamp(64px,8vw,100px) 0; background: var(--bg-deep); border-top: 1.5px solid var(--ink); }
.tool-picker { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin: 32px 0 24px; }
.tool-card {
  padding: 18px 16px; background: var(--paper);
  border: 1.5px solid var(--ink); border-radius: 12px;
  cursor: pointer; transition: all .18s; text-align: left;
  font-family: var(--ff-body); color: var(--ink); min-height: 72px;
}
.tool-card:hover { transform: translate(-2px,-2px); box-shadow: 4px 4px 0 var(--ink); }
.tool-card.active { background: var(--ink); color: var(--bg); box-shadow: 4px 4px 0 var(--accent); transform: translate(-2px,-2px); }
.tool-card .name { font-family: var(--ff-display); font-size: 17px; font-weight: 600; margin-bottom: 3px; }
.tool-card .meta { font-family: var(--ff-mono); font-size: 10.5px; opacity: .6; }
.code-card {
  background: var(--ink); color: var(--bg); border-radius: 14px;
  padding: 20px 22px 48px; font-family: var(--ff-mono); font-size: 13px; line-height: 1.7;
  position: relative; border: 1.5px solid var(--ink); box-shadow: 6px 6px 0 var(--accent);
  overflow-x: auto;
}
.code-card .lang { position: absolute; top: 13px; right: 15px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted-2); }
.code-card .copy-btn {
  position: absolute; bottom: 13px; right: 15px; font-size: 11px;
  background: color-mix(in srgb, var(--bg) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--bg) 20%, transparent);
  color: var(--bg); padding: 4px 10px; border-radius: 4px; cursor: pointer; font-family: var(--ff-mono);
}
.code-card .comment { color: var(--muted-2); }
.code-card .kw { color: var(--ai); }
.code-card .str { color: var(--gold); }

/* ─── FAQ ───────────────────────────────────────────── */
.faq-section { padding: clamp(64px,8vw,100px) 0; }
.faq-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 60px; }
.faq-list { display: flex; flex-direction: column; gap: 2px; }
.faq-item { border-top: 1px solid var(--line); padding: 18px 0; }
.faq-item:last-child { border-bottom: 1px solid var(--line); }
.faq-q {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
  cursor: pointer; font-family: var(--ff-display); font-size: 18px; font-weight: 500;
  color: var(--ink); letter-spacing: -.01em; line-height: 1.3;
  background: none; border: none; text-align: left; width: 100%; padding: 0;
}
.faq-q .toggle {
  width: 26px; height: 26px; flex-shrink: 0; border-radius: 999px;
  background: var(--ink); color: var(--bg); display: grid; place-items: center;
  font-family: var(--ff-mono); font-size: 15px; transition: transform .25s ease;
  margin-top: 2px;
}
.faq-item.open .toggle { transform: rotate(45deg); }
.faq-a {
  max-height: 0; overflow: hidden;
  transition: max-height .35s ease, padding-top .25s ease;
  font-size: 14.5px; line-height: 1.65; color: var(--ink-soft);
}
.faq-item.open .faq-a { max-height: 320px; padding-top: 13px; }
.faq-a code { font-family: var(--ff-mono); font-size: 12.5px; background: var(--bg-deep); padding: 1px 5px; border-radius: 3px; color: var(--accent-dark); }

/* ─── FINAL CTA ─────────────────────────────────────── */
.final-cta { padding: clamp(72px,10vh,110px) 0 clamp(48px,6vh,64px); text-align: center; position: relative; overflow: hidden; }
.final-cta .sec-title { margin: 0 auto 22px; text-align: center; }
.final-cta .sec-sub { margin: 0 auto 32px; text-align: center; }
.final-cta .hero-ctas { justify-content: center; }
.final-flair { font-family: var(--ff-display); font-style: italic; font-size: 14px; color: var(--muted); margin-top: 26px; }
.watermark {
  font-family: var(--ff-display); font-style: italic;
  font-size: clamp(100px, 20vw, 280px); font-weight: 400;
  color: color-mix(in srgb, var(--accent) 9%, transparent);
  position: absolute; bottom: -24px; left: 2%; line-height: 1; letter-spacing: -.04em;
  pointer-events: none; user-select: none;
}

/* ─── FOOTER ─────────────────────────────────────────── */
footer { padding: clamp(40px,6vw,56px) 0 clamp(28px,4vw,40px); border-top: 1px solid var(--line); background: var(--bg); }
.foot-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 28px; }
.foot-logo { font-family: var(--ff-display); font-weight: 600; font-size: 30px; letter-spacing: -.5px; color: var(--ink); text-decoration: none; }
.foot-logo .dot { font-style: italic; color: var(--accent); }
.foot-blurb { font-family: var(--ff-display); font-style: italic; font-size: 17px; line-height: 1.5; color: var(--ink-soft); margin-top: 14px; max-width: 300px; }
.foot-col h5 { font-family: var(--ff-mono); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--muted-2); font-weight: 700; margin-bottom: 11px; }
.foot-col a { display: block; font-size: 14px; color: var(--ink-soft); text-decoration: none; padding: 3px 0; font-weight: 500; }
.foot-col a:hover { color: var(--accent); }
.foot-base {
  margin-top: 36px; padding-top: 22px; border-top: 1px dashed var(--line);
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--ff-mono); font-size: 11.5px; color: var(--muted);
}

/* ─── FADE IN ────────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hero-text > * { animation: fadeUp .7s both; }
.hero-title    { animation-delay: .04s; }
.hero-sub      { animation-delay: .16s; }
.hero-ctas     { animation-delay: .26s; }
.trust-bar     { animation-delay: .36s; }
.hero-demo     { animation: fadeUp .9s .42s both; }

/* ═══════════════════════════════════════════════════════
   RESPONSIVE — tablet: ≤ 1040px
   ═══════════════════════════════════════════════════════ */
@media (max-width: 1040px) {
  .hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .hero-sub { max-width: 100%; }
  .prov-grid { grid-template-columns: 1fr; gap: 36px; }
  .role-panel { grid-template-columns: 1fr; gap: 28px; }
  .faq-grid { grid-template-columns: 1fr; gap: 28px; }
}

/* ═══════════════════════════════════════════════════════
   RESPONSIVE — mobile: ≤ 768px
   ═══════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  :root { --r-nav: 56px; }

  /* nav */
  .nav-links { display: none; }
  .nav-hamburger { display: inline-flex; }
  .home-account-trigger { padding: 7px 14px; font-size: 12.5px; }

  /* hero */
  .hero { padding: 20px 0 48px; }
  .hero-title { font-size: clamp(38px, 10.5vw, 56px); line-height: 1.06; }
  .hero-sub { font-size: 15px; }
  .hero-ctas { gap: 10px; }
  .btn-primary { flex: 1 1 100%; justify-content: center; padding: 15px 20px; font-size: 14.5px; box-shadow: 3px 3px 0 var(--accent), 3px 3px 0 1.5px var(--ink); }
  .btn-ghost   { flex: 1 1 100%; justify-content: center; padding: 15px 18px; font-size: 14px; }

  /* demo card */
  .demo-card { transform: none !important; }
  .demo-bar .rev { display: none; }
  .demo-action.dark:nth-child(3) { display: none; }
  .demo-body { padding: 16px 14px 88px; gap: 9px; grid-template-columns: 10px 1fr; }
  .demo-content { font-size: 13.5px; }
  .demo-context-menu { left: 14px; right: 10px; bottom: 12px; width: auto; }

  /* compare */
  .compare-grid { grid-template-columns: 1fr; gap: 18px; }
  .col-title { font-size: 21px; }

  /* table */
  .table-wrap {
    margin: 0 calc(-1 * clamp(20px,5vw,40px));
    padding: 0 clamp(20px,5vw,40px) 6px;
    border-radius: 0;
    -webkit-mask-image: none; mask-image: none;
  }
  .table-hint { display: block; }
  .compare-table { min-width: 580px; font-size: 12.5px; }
  .compare-table th, .compare-table td { padding: 12px 10px; }
  .compare-table th { font-size: 10px; }

  /* roles tabs */
  .role-tabs {
    flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
    margin: 0 calc(-1 * clamp(20px,5vw,40px)) 26px;
    padding: 0 clamp(20px,5vw,40px);
  }
  .role-tabs::-webkit-scrollbar { display: none; }
  .role-tab { flex-shrink: 0; white-space: nowrap; padding: 11px 14px; font-size: 13.5px; min-height: 44px; }
  .role-tab .label-en { font-size: 9.5px; }
  .role-mock { transform: none; padding: 15px 16px; font-size: 13px; }

  /* features */
  .features { grid-template-columns: 1fr; margin-top: 28px; }
  .feat:hover { transform: none; }

  /* tool picker */
  .tool-picker { grid-template-columns: 1fr 1fr; gap: 8px; }
  .tool-card { padding: 14px 12px; }
  .tool-card .name { font-size: 15px; }
  .code-card { padding: 16px 14px 42px; font-size: 11.5px; }
  .code-card pre { white-space: pre; }

  /* footer */
  .foot-grid { grid-template-columns: 1fr 1fr; gap: 24px 18px; }
  .foot-grid > div:first-child { grid-column: 1 / -1; }
  .foot-blurb { font-size: 15px; }
  .foot-base { flex-direction: column; align-items: flex-start; gap: 8px; font-size: 11px; }

  /* section spacing */
  .sec-sub { margin-bottom: 32px; }
}

/* ═══════════════════════════════════════════════════════
   RESPONSIVE — small: ≤ 480px
   ═══════════════════════════════════════════════════════ */
@media (max-width: 480px) {
  .hero-title { font-size: clamp(34px, 11vw, 46px); }
  .mark { display: inline; }
  .compare-table { min-width: 520px; font-size: 12px; }
  .faq-q { font-size: 16px; }
  .tool-picker { grid-template-columns: 1fr 1fr; }
  .presence-chip { font-size: 10.5px; padding: 6px 11px; }
  .seg.edited::before { font-size: 9px; padding: 1px 5px; }
}

/* ─── touch: disable hover effects ─────────────────── */
@media (hover: none) and (pointer: coarse) {
  .feat:hover { transform: none; box-shadow: inherit; }
  .btn-primary:hover { transform: none; }
  .tool-card:hover { transform: none; box-shadow: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}`;

function homepageInteractions(origin: string): string {
  return String.raw`(function () {
  /* ── hamburger ──────────────────────────── */
  var btn    = document.getElementById('nav-hamburger');
  var drawer = document.getElementById('nav-drawer');
  if (btn && drawer) {
    btn.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
    });
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        drawer.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── role tabs ──────────────────────────── */
  var roleTabs   = document.querySelectorAll('.role-tab');
  var rolePanels = document.querySelectorAll('.role-panel');
  roleTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-target');
      roleTabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      rolePanels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
      var panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  /* ── tool picker / code blocks ──────────── */
  var codeBlocks = {
    claude: [
      '<span class="comment"># 1. 装入 Claude Code 插件市场</span>',
      '<span class="kw">/plugin marketplace add</span> <span class="str">https://github.com/stephenfan80/human-agent-collab</span>',
      '',
      '<span class="comment"># 2. 安装 zoon skill</span>',
      '<span class="kw">/plugin install</span> <span class="str">zoon@human-agent-collab</span>',
      '',
      '<span class="comment"># 现在把任意 Zoon 文档 URL 发给 Claude，它就能直接读写。</span>'
    ].join('\n'),
    codex: [
      '<span class="comment"># 把 SKILL.md 装到 Codex / Cursor 的 skills 目录</span>',
      '<span class="kw">mkdir</span> -p ~/.codex/skills/zoon',
      '<span class="kw">curl</span> -fsSL <span class="str">${origin}/skill</span> \\',
      '  -o ~/.codex/skills/zoon/SKILL.md',
      '',
      '<span class="comment"># 然后让 agent: "用 zoon skill 协作这份文档 &lt;URL&gt;"</span>'
    ].join('\n'),
    chatgpt: [
      '<span class="comment"># 把这段贴进 ChatGPT 的对话开头：</span>',
      '',
      '<span class="str">"接下来我们要协作一份 Zoon 文档。</span>',
      '<span class="str">请从 ${origin}/skill</span>',
      '<span class="str">读取 skill 指引，然后告诉我你准备好了。"</span>',
      '',
      '<span class="comment"># ChatGPT 会自动 fetch 协议，然后等你给任务。</span>'
    ].join('\n'),
    curl: [
      '<span class="comment"># 创建文档</span>',
      '<span class="kw">curl</span> -X POST <span class="str">${origin}/documents</span> \\',
      '  -H <span class="str">"Content-Type: application/json"</span> \\',
      '  -d <span class="str">\'{"markdown":"# Draft\\n\\nStart here.","title":"Draft"}\'</span>',
      '',
      '<span class="comment"># 写入一段（紫色 AI 段落）</span>',
      '<span class="kw">curl</span> -X POST <span class="str">$URL/edit/v2</span> \\',
      '  -H <span class="str">"x-share-token: $TOKEN"</span> \\',
      '  -d <span class="str">\'{"by":"ai:claude","operations":[{"op":"insert_at_end","markdown":"New paragraph"}]}\'</span>'
    ].join('\n')
  };

  var codeEl  = document.getElementById('code-content');
  var copyBtn = document.getElementById('code-copy-btn');
  document.querySelectorAll('.tool-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.tool-card').forEach(function (c) { c.classList.remove('active'); });
      card.classList.add('active');
      var key = card.getAttribute('data-code');
      if (codeEl && codeBlocks[key]) codeEl.innerHTML = codeBlocks[key];
    });
  });
  if (copyBtn && codeEl) {
    copyBtn.addEventListener('click', async function () {
      var text = codeEl.innerText || '';
      try {
        await navigator.clipboard.writeText(text.trim());
        var orig = copyBtn.textContent;
        copyBtn.textContent = '✓ copied';
        setTimeout(function () { copyBtn.textContent = orig; }, 1600);
      } catch (_) {}
    });
  }

  /* ── FAQ accordion ──────────────────────── */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      q.parentElement.classList.toggle('open');
    });
  });
})();`;
}

export function renderHomepageV2(origin: string): string {
  return String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zoon — 把 AI 初稿改成你的稿</title>
  <meta name="description" content="创建一份 Zoon 文档，把链接发给 Agent。它能直接补内容、改段落、留评论；你在原文旁边审校，保住自己的声音。" />
  <meta property="og:title" content="Zoon — 把 AI 初稿改成你的稿" />
  <meta property="og:description" content="创建一份 Zoon 文档，把链接发给 Agent；它补内容、改段落、留评论，你在原文旁边审校，保住自己的声音。" />
  <meta property="og:type" content="website" />
  <link rel="icon" type="image/svg+xml" href="/zoon-favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" />
  <style>${REDESIGN_STYLES}</style>
</head>
<body>
<div class="shell">

<!-- ── NAV ────────────────────────────────────────── -->
<header class="nav">
  <div class="wrap nav-inner">
    <a href="/" class="logo">Zoon<span class="dot">.</span></a>
    <nav class="nav-links" aria-label="主导航">
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
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="菜单" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<nav class="nav-drawer" id="nav-drawer" aria-label="移动导航">
  <a href="#why" class="nav-drawer-link">为什么用</a>
  <a href="#features" class="nav-drawer-link">怎么协作</a>
  <a href="#roles" class="nav-drawer-link">谁在用</a>
  <a href="#connect" class="nav-drawer-link">接入</a>
  <a href="#faq" class="nav-drawer-link">FAQ</a>
</nav>

<div class="home-auth-modal" id="home-auth-modal" role="dialog" aria-modal="true" aria-labelledby="home-auth-title" hidden></div>

<main>

<!-- ── HERO ───────────────────────────────────────── -->
<section class="hero">
  <div class="wrap">
    <div class="hero-grid">
      <div class="hero-text">
        <p class="eyebrow">给内容创作者的 AI 改稿工作台</p>
        <h1 class="hero-title">
          AI 能写初稿，<br>
          <span class="mark mark-purple" style="white-space:nowrap">Zoon</span> 帮你改成你的稿。
        </h1>
        <p class="hero-sub">
          把草稿放进一份 Zoon 文档，再把链接发给 Claude Code / Codex / ChatGPT / Kimi。
          Agent 能直接补内容、改段落、留评论；你在<strong>原文旁边审校</strong>，保住自己的声音，不再来回复制。
        </p>
        <div class="hero-ctas">
          <button class="btn-primary create-doc-trigger" type="button">
            <span>开始改一篇稿</span>
            <small>无需注册</small>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
              <path d="M1 6H16M16 6L11 1M16 6L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <a href="#demo-card" class="btn-ghost">看它怎么改 →</a>
        </div>
        <div class="trust-bar">
          <span class="label">10 秒创建 · 复制链接给 Agent</span>
          <span class="pill">Codex</span>
          <span class="pill">Claude Code</span>
          <span class="pill">ChatGPT</span>
          <span class="pill">Kimi</span>
        </div>
      </div>

      <!-- demo card -->
      <div class="hero-demo" id="demo-card">
        <div class="demo-card">
          <div class="demo-bar">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="title">公众号草稿 · 发布前审校</span>
            <div class="demo-actions" aria-hidden="true">
              <span class="demo-action">+ Add agent</span>
              <span class="demo-action dark">分享</span>
              <span class="demo-action dark">新建</span>
            </div>
          </div>
          <div class="demo-body">
            <div class="prov-rail" aria-hidden="true">
              <span class="prov-seg h" style="height:24%"></span>
              <span class="prov-seg a" style="height:34%"></span>
              <span class="prov-seg h" style="height:16%"></span>
              <span class="prov-seg a" style="height:26%"></span>
            </div>
            <div class="demo-content">
              <h4><span class="hash">##</span> 一句话，原地找回你的声音</h4>
              <span class="seg human">原文：在信息爆炸的时代，我们很难保持真正的专注。</span>
              <span class="seg ai">
                Agent 留评：这句太泛，像 AI 开场；按你前文口吻，应该先给读者一个具体画面。
              </span>
              <span class="seg ai selected">
                Agent 直改：上周三晚上 11 点，我盯着同一段视频回放看了 17 遍。<span class="cursor"></span>
              </span>
              <div class="demo-context-menu" aria-hidden="true">
                <div class="demo-menu-item strong"><span>交给 Zoon...</span><span class="demo-menu-shortcut">⇧⌘P</span></div>
                <div class="demo-menu-item"><span>快速操作</span><span class="demo-menu-arrow">›</span></div>
                <div class="demo-submenu">
                  <span>修复语法</span><span>改善表达</span><span>缩短</span>
                </div>
                <div class="demo-menu-sep"></div>
                <div class="demo-menu-item"><span>添加 Zoon 任务评论</span><span class="demo-menu-shortcut">⇧⌘K</span></div>
              </div>
            </div>
          </div>
          <div class="presence-chip">
            <span class="pdot"></span>
            <span>Codex joined · writing...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="stripe-divider" aria-hidden="true"></div>

<!-- ── COMPARE ────────────────────────────────────── -->
<section class="compare" id="why">
  <div class="wrap">
    <p class="eyebrow">为什么不是聊天窗口</p>
    <h2 class="sec-title">你只想改一句，<br>AI 却<em>重写一整段</em>。</h2>
    <p class="sec-sub">
      AI 最大的问题不是不会写，而是改稿没有落点：上下文散在对话里，
      最后还是你把内容搬回文档。
    </p>
    <div class="compare-grid">
      <div class="col-card bad">
        <span class="col-tag bad">老路 · 在对话里改</span>
        <h3 class="col-title">越追问，<br>稿子越不像你。</h3>
        <div class="chat-stream">
          <div class="bubble user"><span class="turn-tag">turn 1</span>把第三段改得更像我，别太 AI。</div>
          <div class="bubble ai huge">当然。以下是完整改写版……</div>
          <div class="bubble user"><span class="turn-tag">turn 2</span>不是整段重写，只改那句“信息爆炸”。</div>
          <div class="bubble ai huge">明白，我重新整理这一段……</div>
          <div class="bubble user"><span class="turn-tag">turn 3</span>算了，我自己复制回去改。</div>
        </div>
        <div class="chat-foot">
          <span class="label">对话上下文</span>
          <span class="stat">重写整段 · 上下文污染 · 来回复制</span>
        </div>
        <div class="compare-stat-row" style="margin-top:auto; padding-top:18px">
          <div class="compare-stat bad"><span class="num">3</span><span class="desc">轮对话<br>才定位到问题</span></div>
          <div class="compare-stat bad"><span class="num">2x</span><span class="desc">复制粘贴<br>来回搬运</span></div>
        </div>
      </div>

      <div class="col-card good">
        <span class="col-tag good">Zoon · 在文档里改</span>
        <h3 class="col-title">Agent 贴着原文改，<br>你只决定留哪句。</h3>
        <div class="doc-demo">
          <span class="doc-line">## 开头</span>
          <span class="doc-line ai-text" style="position:relative">
            在信息爆炸的时代，我们很难保持真正的专注。
            <span class="step-pill" style="position:absolute; top:4px; right:-4px; transform:translateX(100%); font-size:9.5px">① 选中这句</span>
          </span>
          <span class="doc-line">## 修改</span>
          <span class="doc-line ai-text">Agent 改写：上周三晚上 11 点，我盯着同一段视频回放看了 17 遍。</span>
          <span class="doc-line edited">人类审校：保留画面感，删掉空泛判断。</span>
        </div>
        <div class="action-row">
          <span class="action-pill">交给 Zoon...</span>
          <span class="action-pill">修复语法</span>
          <span class="action-pill">改善表达</span>
          <span class="action-pill active">✓ 可留任务评论</span>
        </div>
        <div class="compare-stat-row" style="margin-top:auto; padding-top:18px">
          <div class="compare-stat good"><span class="num">1</span><span class="desc">份文档<br>人和 Agent 同页</span></div>
          <div class="compare-stat good"><span class="num">0</span><span class="desc">复制粘贴<br>不搬来搬去</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── PROVENANCE / FEATURES ──────────────────────── -->
<section class="prov-section" id="features">
  <div class="wrap">
    <div class="prov-grid">
      <div class="prov-text">
        <p class="eyebrow">怎么开始</p>
        <h2 class="sec-title">不用换写作习惯，<br>只换 <em>AI 协作的位置</em>。</h2>
        <p>你还是在文档里写。不同的是，Agent 不再只回一段聊天，而是进入同一份稿子。</p>
        <div class="hero-ctas" style="margin-top:24px;margin-bottom:0">
          <button class="btn-primary create-doc-trigger" type="button">
            <span>创建文档开始改</span>
            <small>无需注册</small>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
              <path d="M1 6H16M16 6L11 1M16 6L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="feat" style="align-self:start">
        <div class="feat-num"><span>01 / Draft In</span><span class="glyph">↳</span></div>
        <h3 class="feat-title">把草稿放进 Zoon</h3>
        <p class="feat-desc">公众号文章、脚本片段、PRD、策划案，都可以先贴进一份空白文档。</p>
        <span class="feat-tag">先把稿子放到现场</span>
      </div>
    </div>
    <div class="features">
      <div class="feat">
        <div class="feat-num"><span>02 / Send Link</span><span class="glyph">●</span></div>
        <h3 class="feat-title">把链接发给 Agent</h3>
        <p class="feat-desc">告诉 Claude Code / Codex / ChatGPT / Kimi：帮我补内容、改这几段，或者先留评论。</p>
        <span class="feat-tag">不用重新描述上下文</span>
      </div>
      <div class="feat">
        <div class="feat-num"><span>03 / Review</span><span class="glyph">⌥</span></div>
        <h3 class="feat-title">在原文旁边审校</h3>
        <p class="feat-desc">每一处新增、修改、评论都留在上下文里，你决定哪句留下。</p>
        <span class="feat-tag">改稿不离开文档</span>
      </div>
    </div>
  </div>
</section>

<!-- ── ROLES ──────────────────────────────────────── -->
<section class="roles-section" id="roles">
  <div class="wrap">
    <p class="eyebrow">谁最需要</p>
    <h2 class="sec-title">适合 <em>AI 能起稿，<br>但你要负责交付</em>的人。</h2>
    <p class="sec-sub">内容、剧本、PRD、策划案都不是缺文字，而是缺最后那一轮判断和修改。</p>

    <div class="role-tabs" role="tablist">
      <button class="role-tab active" data-target="role-creator" type="button" role="tab" aria-selected="true">内容创作者<span class="label-en">长文 · 公众号</span></button>
      <button class="role-tab" data-target="role-screenwriter" type="button" role="tab" aria-selected="false">AI 编剧<span class="label-en">剧本 · 分镜</span></button>
      <button class="role-tab" data-target="role-pm" type="button" role="tab" aria-selected="false">产品经理<span class="label-en">PRD · 需求文档</span></button>
      <button class="role-tab" data-target="role-planner" type="button" role="tab" aria-selected="false">策划创意<span class="label-en">方案 · Campaign</span></button>
    </div>

    <div class="role-panel active" id="role-creator">
      <div class="role-text">
        <h3>长文不是缺初稿，是缺你的声音。</h3>
        <p class="scenario">AI 能把公众号草稿铺满，但它不知道哪句像你、哪句只是顺。Zoon 让你把那些“对，但不像我”的句子圈出来，交给 Agent 在原文旁边改。</p>
        <p class="role-quote">"我不是要 AI 替我写完，我要它把别扭的地方改到像我。"</p>
        <p class="role-byline"><strong>Yan</strong> · 内容创作者 · 12k 公众号</p>
      </div>
      <div class="role-mock">
        <code style="font-family:var(--ff-mono);font-size:11.5px;color:var(--muted);display:block;margin-bottom:7px">公众号草稿 · 2900 字 · Agent 正在改</code>
        <span style="color:#2d1c5a;background:var(--ai-soft);border-left:2px solid var(--ai-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">AI 原句：在信息爆炸的时代，我们很难保持真正的专注。</span>
        <span style="color:#2d1c5a;background:var(--ai-soft);border-left:2px solid var(--ai-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">Zoon 评论：这句太泛，像模板开头；你的文章需要一个能让人停下来的画面。</span>
        <span style="color:var(--ink);background:var(--human-soft);border-left:2px solid var(--human-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">改成你的口吻：上周三晚上 11 点，我盯着同一段视频回放看了 17 遍。</span>
        <span style="color:var(--ink-soft);background:var(--paper);border-left:2px solid var(--accent);padding:4px 10px;display:block;margin:3px 0;font-size:13px">审校：保留这句。它不是更长，而是更像我。</span>
      </div>
    </div>
    <div class="role-panel" id="role-screenwriter">
      <div class="role-text">
        <h3>剧情可以扩，人物不能跑。</h3>
        <p class="scenario">让 Agent 补桥段、改对白、铺分镜；你在同一页审角色动机、节奏和口气。</p>
        <p class="role-quote">"我不怕 AI 给我多几个版本，我怕它把人物写跑。Zoon 里我能看到哪段是 Agent 补的，直接标出哪句对白不对，再让它顺着角色重新写。"</p>
        <p class="role-byline"><strong>Akira</strong> · 短剧编剧 · AI 辅助创作</p>
      </div>
      <div class="role-mock">
        <code style="font-family:var(--ff-mono);font-size:11.5px;color:var(--muted);display:block;margin-bottom:7px">第 3 场 · 夜 · 天台</code>
        <strong style="font-family:var(--ff-display);font-size:17px"># 分镜草稿</strong><br>
        <span style="color:#2d1c5a;background:var(--ai-soft);border-left:2px solid var(--ai-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">她沉默三秒，低头笑了一下："你终于还是来了。"</span>
        <span style="color:var(--ink);background:var(--human-soft);border-left:2px solid var(--human-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">这句太像偶像剧。改成更克制：她只问，"你带伞了吗？"</span>
      </div>
    </div>
    <div class="role-panel" id="role-pm">
      <div class="role-text">
        <h3>PRD 可以让 AI 起草，取舍必须由你决定。</h3>
        <p class="scenario">Agent 负责补背景、目标和指标，你负责判断假设是否成立、优先级是否合理。</p>
        <p class="role-quote">"以前让 AI 改 PRD，我得逐字 diff 才敢接受。Zoon 里 Agent 直接把新段落写进来，紫色一眼能看出是它加的——我要审校哪句，就选中那句交给 Zoon。"</p>
        <p class="role-byline"><strong>林</strong> · 互联网汽车垂媒 · 增长产品经理</p>
      </div>
      <div class="role-mock">
        <strong style="font-family:var(--ff-display);font-size:17px"># PRD: Q2 留资增长</strong><br>
        <span style="color:var(--ink);display:block;padding:3px 0">## 背景</span>
        <span style="color:#2d1c5a;background:var(--ai-soft);border-left:2px solid var(--ai-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">当前留资率 18%，距离 KPI 24% 仍有 6 个百分点缺口。</span>
        <span style="color:var(--ink);display:block;padding:3px 0">## 核心假设</span>
        <span style="color:#2d1c5a;background:var(--ai-soft);border-left:2px solid var(--ai-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">首页 CTA 措辞影响转化率最高 5pp。</span>
        <span style="color:var(--ink);background:var(--human-soft);border-left:2px solid var(--human-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">↻ 经验上是 2–3pp，5pp 太乐观，改用 A/B 实测。</span>
      </div>
    </div>
    <div class="role-panel" id="role-planner">
      <div class="role-text">
        <h3>方案可以发散，最后必须能落地。</h3>
        <p class="scenario">让 Agent 扩方向、列角度、补执行，你筛掉空话，留下能打动客户的表达。</p>
        <p class="role-quote">"我需要的是 20 个可筛选的方向，不是一个看起来很完整但没法落地的方案。Zoon 让我把筛选和改稿都留在同一页。"</p>
        <p class="role-byline"><strong>Mia</strong> · 品牌策划 · Creative Planner</p>
      </div>
      <div class="role-mock">
        <code style="font-family:var(--ff-mono);font-size:11.5px;color:var(--muted);display:block;margin-bottom:7px">Campaign 方案 · 12 个角度</code>
        <strong style="font-family:var(--ff-display);font-size:17px"># 春季新品传播</strong><br>
        <span style="color:#2d1c5a;background:var(--ai-soft);border-left:2px solid var(--ai-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">角度 A：把新品包装成"城市轻户外"生活方式。</span>
        <span style="color:#2d1c5a;background:var(--ai-soft);border-left:2px solid var(--ai-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">角度 B：用 7 天挑战降低第一次尝试门槛。</span>
        <span style="color:var(--ink);background:var(--human-soft);border-left:2px solid var(--human-str);padding:4px 10px;display:block;margin:3px 0;font-size:13.5px">保留 B，删掉 A。下一版沿"低门槛尝试"继续扩。</span>
      </div>
    </div>
  </div>
</section>

<!-- ── TABLE ──────────────────────────────────────── -->
<section class="table-section">
  <div class="wrap">
    <p class="eyebrow">Zoon 独有的地方</p>
    <h2 class="sec-title">它不是更会聊天，<br>而是能<em>进入同一份文档</em>。</h2>
    <p class="sec-sub">聊天工具给你答案；Zoon 让 Agent 站到稿件现场，围绕原文写、改、评。</p>
    <div class="table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="width:36%">能力</th>
            <th>聊天窗口</th>
            <th>普通在线文档</th>
            <th>AI 写作画布</th>
            <th class="zoon-col">Zoon</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">初稿生成</td>
            <td>能</td><td>不能</td><td>能</td>
            <td class="zoon-cell">能</td>
          </tr>
          <tr>
            <td class="row-label">围绕原文局部改</td>
            <td>靠追问</td><td>靠人改</td><td>部分支持</td>
            <td class="zoon-cell">直接改</td>
          </tr>
          <tr>
            <td class="row-label">Agent 通过同一链接协作</td>
            <td>不能</td><td>不能</td><td>少见</td>
            <td class="zoon-cell">可以</td>
          </tr>
          <tr>
            <td class="row-label">人类 / AI 来源可见</td>
            <td>看不清</td><td>看不清</td><td>不稳定</td>
            <td class="zoon-cell">清楚</td>
          </tr>
          <tr>
            <td class="row-label">评论、建议、直写在同一页</td>
            <td>分散</td><td>部分评论</td><td>部分支持</td>
            <td class="zoon-cell">同页完成</td>
          </tr>
        </tbody>
      </table>
      <p class="table-hint" aria-hidden="true">← 左右滑动看完整对比 →</p>
    </div>
  </div>
</section>

<div class="stripe-divider" aria-hidden="true"></div>

<!-- ── CONNECT ─────────────────────────────────────── -->
<section class="connect-section" id="connect">
  <div class="wrap">
    <p class="eyebrow">给 Agent 的入口</p>
    <h2 class="sec-title">普通用户复制链接，<br><em>高级用户接入协议。</em></h2>
    <p class="sec-sub">创建后先把文档链接发给 Agent，就能开始改稿。下面是给 Claude Code / Codex / Cursor 的接入方式。</p>

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
      <pre id="code-content" style="margin:0; white-space:pre-wrap"><span class="comment"># 1. 装入 Claude Code 插件市场</span>
<span class="kw">/plugin marketplace add</span> <span class="str">https://github.com/stephenfan80/human-agent-collab</span>

<span class="comment"># 2. 安装 zoon skill</span>
<span class="kw">/plugin install</span> <span class="str">zoon@human-agent-collab</span>

<span class="comment"># 现在把任意 Zoon 文档 URL 发给 Claude，它就能直接读写。</span></pre>
      <button class="copy-btn" id="code-copy-btn" type="button">copy</button>
    </div>
  </div>
</section>

<!-- ── FAQ ────────────────────────────────────────── -->
<section class="faq-section" id="faq">
  <div class="wrap">
    <div class="faq-grid">
      <div>
        <p class="eyebrow">常见问题</p>
        <h2 class="sec-title">创建前，先把这些<br>问清楚。</h2>
        <p class="sec-sub" style="margin-bottom:0">不用懂协议，也可以先创建一份文档。</p>
      </div>
      <div class="faq-list">
        <div class="faq-item open">
          <button class="faq-q" type="button">我不会 Agent，也能用吗？<span class="toggle">+</span></button>
          <div class="faq-a">不一定。你可以先把 Zoon 当成一份在线文档来用：创建文档、写初稿、复制链接。等你想让 Claude Code、Codex、ChatGPT 或 Kimi 帮忙时，再把链接发给它。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">创建后我到底把什么发给 AI？<span class="toggle">+</span></button>
          <div class="faq-a">先写一点原文，或直接把已有草稿粘进去；然后点 Add agent / 分享，把文档链接发给你的 AI 工具。告诉它要补内容、改段落、留评论，或先给你几个方向。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">这和 ChatGPT / Claude Canvas 有什么不同？<span class="toggle">+</span></button>
          <div class="faq-a">它们更像 AI 写作界面；Zoon 更像人和 Agent 共用的一份文档。Agent 可以直接把内容写进文档，评论、建议、直改都贴着原文，你不用在聊天窗口和文档之间搬运。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">AI 会不会把我的原文改没？<span class="toggle">+</span></button>
          <div class="faq-a">Agent 可以直接改文档，但每次写入都会带身份。你能看到哪些内容来自 AI，也可以让它改用评论或建议来走审阅路径。你始终在同一个页面里审校和继续写。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">我的文档安全吗？<span class="toggle">+</span></button>
          <div class="faq-a">拥有文档链接和权限 token 的访问方可以按权限读写。请只把链接发给你信任的人或 Agent；敏感内容建议先脱敏。</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── FINAL CTA ──────────────────────────────────── -->
<section class="final-cta" id="cta">
  <div class="wrap" style="position:relative;z-index:2">
    <p class="eyebrow" style="justify-content:center;display:inline-flex">下一篇就这样改</p>
    <h2 class="sec-title" style="max-width:760px;margin:0 auto 22px">
      别再把 AI 回答<br>
      搬回文档。
    </h2>
    <p class="sec-sub" style="max-width:520px;margin:0 auto 32px;text-align:center">
      创建一份 Zoon 文档，把草稿和 Agent 放到同一页；
      它负责补内容、改段落、留评论，你负责保留真正像你的那部分。
    </p>
    <div class="hero-ctas" style="justify-content:center">
      <button class="btn-primary create-doc-trigger" type="button">
        <span>开始改一篇稿</span>
        <small>无需注册</small>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
          <path d="M1 6H16M16 6L11 1M16 6L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <a href="/agent-docs" class="btn-ghost">读 Agent 协议 →</a>
    </div>
    <p class="final-flair">— Zoon, 一份给 agent 也给人类的草稿纸 —</p>
  </div>
  <div class="watermark" aria-hidden="true">Zoon.</div>
</section>
</main>

<!-- ── FOOTER ─────────────────────────────────────── -->
<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a href="/" class="foot-logo">Zoon<span class="dot">.</span></a>
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
      <span style="font-style:italic;font-family:var(--ff-display)">"草稿纸应该让所有写字的人留下痕迹。"</span>
    </div>
  </div>
</footer>

</div><!-- .shell -->


<script>${HOMEPAGE_SCRIPT}</script>
<script>${homepageInteractions(origin)}</script>
</body>
</html>`;
}
