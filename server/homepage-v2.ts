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
.home-doc-link { align-items: flex-start; }
.home-account-head { padding: 4px 8px 10px; }
.home-account-name {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 13px; font-weight: 800;
}
.home-doc-title {
  overflow-wrap: anywhere; word-break: break-word; white-space: normal;
  line-height: 1.35; font-size: 13px; font-weight: 800;
}
.home-account-email, .home-doc-meta, .home-doc-time, .home-account-status {
  color: rgba(252,250,242,.56); font-size: 11px; font-weight: 600;
}
.home-doc-meta { display: block; margin-top: 2px; }
.home-doc-time {
  flex: 0 0 auto; align-self: center; white-space: nowrap;
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
.home-account-search {
  width: 100%; min-height: 38px; margin: 0 0 8px; padding: 0 12px;
  border: 1px solid rgba(252,250,242,.18); border-radius: 999px;
  background: rgba(252,250,242,.08); color: var(--paper);
  font-family: var(--ff-body); font-size: 13px; outline: none;
}
.home-account-search::placeholder { color: rgba(252,250,242,.44); }
.home-account-search:focus {
  border-color: rgba(136,194,160,.72);
  box-shadow: 0 0 0 3px rgba(136,194,160,.16);
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
.keep-together { white-space: nowrap; }
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
  max-width: 760px;
  text-wrap: balance;
}
.hero-title em { font-style: italic; font-weight: 400; }
.hero-title-line { display: block; }
.hero-title-main { white-space: nowrap; }

.mark {
  position: relative; display: inline-block; padding: 0 .12em .02em .1em;
  font-style: italic; font-weight: 500;
  line-height: .98;
  vertical-align: baseline;
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
  inset: .08em -.06em .02em -.06em;
}

.hero-sub {
  font-size: clamp(15px, 1.35vw, 17.5px); line-height: 1.55;
  color: var(--ink-soft); max-width: 600px; margin-bottom: 22px;
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
.btn-ghost[disabled] {
  cursor: default;
  opacity: .72;
  color: var(--muted);
  background: color-mix(in srgb, var(--paper) 58%, transparent);
}
.btn-ghost[disabled]:hover {
  background: color-mix(in srgb, var(--paper) 58%, transparent);
  border-color: color-mix(in srgb, var(--ink) 28%, transparent);
}

.trust-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 7px 12px;
  font-family: var(--ff-mono); font-size: 12px; color: var(--muted);
}
.trust-bar .label { text-transform: none; letter-spacing: .05em; color: var(--muted-2); font-weight: 600; font-size: 11px; }
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
  display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;
  font-family: var(--ff-mono); font-size: 11.5px;
}
.chat-foot .label { color: var(--muted); }
.chat-foot .stat { color: var(--warn); font-weight: 700; font-size: 13px; text-align: right; }

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
.steps-head {
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(320px, .7fr);
  gap: clamp(28px,5vw,64px);
  align-items: end;
  margin-bottom: 34px;
}
.steps-copy p {
  font-size: 16px; line-height: 1.7; color: var(--ink-soft);
  margin: 0 0 20px; max-width: 560px;
}
.prov-text code {
  font-family: var(--ff-mono); font-size: 12.5px;
  background: var(--bg-deep); padding: 2px 5px; border-radius: 4px; color: var(--accent-dark);
}
.steps-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.feat {
  background: var(--paper); border: 1.5px solid var(--ink);
  border-radius: 16px; padding: 26px 22px; position: relative;
  transition: transform .22s ease, box-shadow .22s ease;
}
.step-card {
  min-height: 310px;
  display: flex;
  flex-direction: column;
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
.step-list {
  display: grid; gap: 8px; margin: 2px 0 18px; padding: 0; list-style: none;
}
.step-list li {
  display: grid; grid-template-columns: 16px minmax(0,1fr); gap: 8px;
  font-size: 13.5px; line-height: 1.5; color: var(--ink-soft);
}
.step-list li::before {
  content: '•'; color: var(--accent-dark); font-weight: 800; line-height: 1.45;
}
.feat-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--ff-mono); font-size: 11px; padding: 3px 9px;
  border-radius: 4px; background: var(--bg-deep); color: var(--muted); font-weight: 600;
  width: fit-content; margin-top: auto;
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
.use-case-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.use-case-card {
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  padding: clamp(22px,3vw,30px);
  box-shadow: 5px 5px 0 var(--ink);
  display: flex;
  flex-direction: column;
  min-height: 360px;
}
.use-case-card:nth-child(1) { box-shadow: 5px 5px 0 var(--human-str); }
.use-case-card:nth-child(2) { box-shadow: 5px 5px 0 var(--ai-str); }
.use-case-card:nth-child(3) { box-shadow: 5px 5px 0 var(--coral); }
.use-case-label {
  font-family: var(--ff-mono);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 14px;
}
.use-case-card h3 {
  font-family: var(--ff-display);
  font-size: clamp(24px,2.7vw,34px);
  line-height: 1.08;
  letter-spacing: -.015em;
  margin: 0 0 14px;
}
.use-case-block {
  display: grid;
  gap: 6px;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px dashed var(--line);
}
.use-case-block strong {
  font-family: var(--ff-mono);
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--accent-dark);
}
.use-case-block p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.62;
}
.use-case-card .btn-ghost {
  align-self: flex-start;
  margin-top: auto;
  padding: 11px 14px;
  min-height: 42px;
}

/* ─── PRICING / COMMERCIAL ─────────────────────────── */
.pilot-section {
  padding: clamp(64px,8vw,100px) 0;
  background: var(--bg-deep);
  border-top: 1.5px solid var(--line);
  border-bottom: 1.5px solid var(--line);
}
.pilot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 34px;
}
.pilot-card {
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  padding: clamp(22px,3vw,34px);
  box-shadow: 5px 5px 0 var(--ink);
  display: flex;
  flex-direction: column;
}
.pilot-card.paid {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--ai) 18%, transparent), transparent 42%),
    var(--paper);
  box-shadow: 6px 6px 0 var(--ai-str);
}
.pilot-card.team {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), transparent 42%),
    var(--paper);
  box-shadow: 6px 6px 0 var(--accent);
}
.pilot-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--ff-mono);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 16px;
}
.pilot-label::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent);
}
.pilot-card h3 {
  font-family: var(--ff-display);
  font-size: clamp(24px,3vw,34px);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -.015em;
  margin: 0 0 12px;
}
.pilot-card p {
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.65;
  margin: 0 0 18px;
}
.pilot-list {
  display: grid;
  gap: 10px;
  margin: 18px 0 24px;
  padding: 0;
  list-style: none;
}
.pilot-list li {
  display: grid;
  grid-template-columns: 18px minmax(0,1fr);
  gap: 10px;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.55;
}
.pilot-list li::before {
  content: '✓';
  color: var(--accent-dark);
  font-weight: 800;
}
.pilot-price {
  font-family: var(--ff-display);
  font-size: clamp(32px,4vw,48px);
  line-height: 1;
  font-weight: 650;
  color: var(--ink);
  margin: 4px 0 14px;
}
.pilot-price small {
  font-family: var(--ff-body);
  font-size: 13px;
  color: var(--muted);
  font-weight: 700;
}
.pilot-card .btn-primary,
.pilot-card .btn-ghost {
  align-self: flex-start;
  margin-top: auto;
}

/* ─── CONNECT ───────────────────────────────────────── */
.connect-section { padding: clamp(64px,8vw,100px) 0; background: var(--bg-deep); border-top: 1.5px solid var(--ink); }
.tool-picker { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; margin: 32px 0 24px; }
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

/* ─── VIDEO DEMO ───────────────────────────────────── */
.demo-section {
  padding: clamp(56px,7vw,92px) 0;
  border-top: 1.5px solid var(--ink);
  border-bottom: 1.5px solid var(--ink);
  background: linear-gradient(180deg, var(--paper) 0%, var(--bg) 100%);
}
.demo-section-head {
  max-width: 860px;
  margin: 0 0 clamp(26px,4vw,44px);
}
.demo-section-head .eyebrow { margin-bottom: 16px; }
.demo-section-head .sec-title {
  margin-bottom: 16px;
  max-width: 760px;
}
.demo-section-head .sec-sub {
  max-width: 760px;
  margin-bottom: 0;
}
.demo-section-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(320px, .84fr);
  gap: clamp(28px,4.8vw,64px);
  align-items: start;
}
.demo-steps-panel { padding-top: 2px; }
.demo-step-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.demo-step-list li {
  display: grid;
  grid-template-columns: 42px minmax(0,1fr);
  gap: 13px;
  align-items: start;
  padding: 15px 16px;
  background: color-mix(in srgb, var(--paper) 84%, white);
  border: 1.5px solid var(--ink);
  border-radius: 12px;
  box-shadow: 4px 4px 0 color-mix(in srgb, var(--accent) 62%, transparent);
}
.demo-step-list .num {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--ff-mono);
  font-size: 12px;
  font-weight: 800;
}
.demo-step-list strong {
  display: block;
  font-size: 15px;
  color: var(--ink);
  margin-bottom: 3px;
}
.demo-step-list span:last-child {
  color: var(--ink-soft);
  font-size: 13.5px;
  line-height: 1.55;
}
.video-frame {
  position: relative;
  border: 2px solid var(--ink);
  border-radius: 18px;
  overflow: hidden;
  background: var(--ink);
  box-shadow: 9px 9px 0 var(--ai-str), 9px 9px 0 2px var(--ink);
}
.video-frame video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  background: var(--ink);
}
.video-caption {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--ff-mono);
  font-size: 11.5px;
}
.video-caption a {
  color: var(--human);
  text-decoration: none;
  font-weight: 700;
}
.video-fallback {
  position: absolute;
  inset: 0 0 38px;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--paper);
  background: linear-gradient(180deg, rgba(26,25,19,.4), rgba(26,25,19,.84));
  font-weight: 700;
}
.video-frame.video-missing .video-fallback { display: flex; }

/* ═══════════════════════════════════════════════════════
   RESPONSIVE — tablet: ≤ 1040px
   ═══════════════════════════════════════════════════════ */
@media (max-width: 1040px) {
  .hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .hero-sub { max-width: 100%; }
  .demo-section-grid { grid-template-columns: 1fr; gap: 30px; }
  .steps-head { grid-template-columns: 1fr; gap: 24px; align-items: start; }
  .steps-grid { grid-template-columns: 1fr; }
  .use-case-grid { grid-template-columns: 1fr; }
  .use-case-card { min-height: auto; }
  .role-panel { grid-template-columns: 1fr; gap: 28px; }
  .pilot-grid { grid-template-columns: 1fr; }
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
  .hero-title-main { white-space: normal; }
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

  /* video demo */
  .demo-step-list li { grid-template-columns: 38px minmax(0,1fr); padding: 13px 14px; }
  .video-frame { border-radius: 14px; box-shadow: 4px 4px 0 var(--ai-str), 4px 4px 0 1.5px var(--ink); }
  .video-caption { flex-direction: column; align-items: flex-start; }

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

  /* pilot */
  .pilot-grid { grid-template-columns: 1fr; }
  .pilot-card { box-shadow: 3px 3px 0 var(--ink); }
  .pilot-card.team { box-shadow: 3px 3px 0 var(--accent); }
  /* features */
  .steps-head { margin-bottom: 28px; }
  .step-card { min-height: auto; }
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
  .demo-step-list strong { font-size: 14px; }
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
    codexPlugin: [
      '<span class="comment"># 1. 添加 Zoon Codex plugin marketplace</span>',
      '<span class="kw">codex plugin marketplace add</span> <span class="str">stephenfan80/zoon-codex-plugin</span>',
      '',
      '<span class="comment"># 2. 在 Codex 的 Plugins 列表里启用 Zoon</span>',
      '<span class="comment"># 新开一个 Codex 会话后，贴 Zoon URL 或说「推到 Zoon」即可触发。</span>',
      '',
      '<span class="comment"># 触发示例</span>',
      '<span class="str">把这个方案推到 Zoon</span>'
    ].join('\n'),
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
      '<span class="comment"># 通用 fallback：把 SKILL.md 装到 Codex / Cursor 的 skills 目录</span>',
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

  /* ── demo video fallback ───────────────── */
  var demoVideo = document.getElementById('zoon-demo-video');
  if (demoVideo) {
    demoVideo.addEventListener('error', function () {
      var frame = demoVideo.closest('.video-frame');
      if (frame) frame.classList.add('video-missing');
    });
  }
})();`;
}

export function renderHomepageV2(origin: string): string {
  return String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zoon - 让 Agent 直接改你的 Markdown 稿件</title>
  <meta name="description" content="Zoon 是给人和 Agent 共用的 Markdown 协作文档。选中一段文字，让 Agent 修语法、改表达、缩短或评论；团队可以在同一份文档里审校和保留修改。" />
  <meta property="og:title" content="Zoon - 让 Agent 直接改你的 Markdown 稿件" />
  <meta property="og:description" content="不用在 AI 和飞书之间来回复制。选中一段，修语法、改表达、缩短或让 Agent 评论；团队可以在同一份文档里审校和保留修改。" />
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
      <a href="#demo">演示</a>
      <a href="#features">三步开始</a>
      <a href="#roles">谁在用</a>
      <a href="#pricing">价格</a>
      <a href="#connect">Agent 接入</a>
      <a href="/blog">Blog</a>
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
  <a href="#demo" class="nav-drawer-link">演示</a>
  <a href="#features" class="nav-drawer-link">三步开始</a>
  <a href="#roles" class="nav-drawer-link">谁在用</a>
  <a href="#pricing" class="nav-drawer-link">价格</a>
  <a href="#connect" class="nav-drawer-link">Agent 接入</a>
  <a href="/blog" class="nav-drawer-link">Blog</a>
  <a href="#faq" class="nav-drawer-link">FAQ</a>
</nav>

<div class="home-auth-modal" id="home-auth-modal" role="dialog" aria-modal="true" aria-labelledby="home-auth-title" hidden></div>

<main>

<!-- ── HERO ───────────────────────────────────────── -->
<section class="hero">
  <div class="wrap">
    <div class="hero-grid">
      <div class="hero-text">
        <p class="eyebrow">给公众号作者、内容编辑和产品经理的 Markdown 改稿工作台</p>
        <h1 class="hero-title">
          <span class="hero-title-line">让 Agent 直接改</span>
          <span class="hero-title-line hero-title-main">你的 Markdown 稿件。</span>
        </h1>
        <p class="hero-sub">
          不用在 AI 和飞书之间来回复制。选中一段，修语法、改表达、缩短或让 Agent 评论；
          团队可以在<strong>同一份文档里审校和保留修改</strong>。
        </p>
        <div class="hero-ctas">
          <button class="btn-primary create-doc-trigger" type="button">
            <span>免费创建文档</span>
            <small>试一次局部改稿</small>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
              <path d="M1 6H16M16 6L11 1M16 6L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <a href="#pricing" class="btn-ghost">了解 Team 协作模式 →</a>
          <a href="#demo" class="btn-ghost">观看 90 秒演示</a>
        </div>
        <div class="trust-bar">
          <span class="label">局部改稿 · Markdown 原稿 · Team 季度试点</span>
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
              <span class="seg human">人类审校：保留具体画面，删掉空泛判断。</span>
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

<!-- ── VIDEO DEMO ─────────────────────────────────── -->
<section class="demo-section" id="demo">
  <div class="wrap">
    <div class="demo-section-head">
      <p class="eyebrow">视频演示</p>
      <h2 class="sec-title">90 秒看懂：<br>让 Agent 直接改你的 Markdown 稿件。</h2>
      <p class="sec-sub">从粘贴草稿、选中一句、交给 Agent，到在原文里审校保留。看完就知道 Zoon 不是聊天窗口，而是人和 Agent 共用的改稿现场。</p>
    </div>
    <div class="demo-section-grid">
      <div class="video-frame">
        <video id="zoon-demo-video" controls preload="metadata" playsinline poster="/assets/zoon-demo-poster.jpg">
          <source src="/assets/zoon-demo-90s.mp4" type="video/mp4" />
          你的浏览器暂时无法播放这个演示视频。
        </video>
        <div class="video-fallback">演示视频加载失败。你仍然可以免费创建文档，按右侧 4 步体验 Zoon。</div>
        <div class="video-caption">
          <span>真实产品录屏 · 粘贴草稿 → 选中一句 → Agent 改稿 → 原文审校</span>
          <a href="/assets/zoon-demo-90s.mp4">打开视频</a>
        </div>
      </div>

      <div class="demo-steps-panel">
        <ol class="demo-step-list">
          <li><span class="num">01</span><span><strong>放入草稿</strong>把公众号稿、PRD 或方案正文粘进一份 Markdown 文档。</span></li>
          <li><span class="num">02</span><span><strong>选中要改的句子</strong>只定位到这一句或这一段，不重新解释整篇上下文。</span></li>
          <li><span class="num">03</span><span><strong>交给 Agent / 右键快捷操作</strong>修语法、改表达、缩短，或者让 Agent 留任务评论。</span></li>
          <li><span class="num">04</span><span><strong>审校保留修改</strong>评论、建议和直改都在原文旁边，你决定哪句留下。</span></li>
        </ol>
      </div>
    </div>
  </div>
</section>

<!-- ── COMPARE ────────────────────────────────────── -->
<section class="compare" id="why">
  <div class="wrap">
    <p class="eyebrow">为什么不是聊天窗口</p>
    <h2 class="sec-title">对话式 AI 给答案，<br>Zoon 改<em>你的原稿</em>。</h2>
    <p class="sec-sub">
      聊天窗口里，你只想改一句，它常常重写一段；想确认一小段，还要复制上下文去问，
      再把答案粘回文档。Zoon 在 Markdown 原文里精准修改：选中哪里就改哪里，其他地方都不变。
    </p>
    <div class="compare-grid">
      <div class="col-card bad">
        <span class="col-tag bad">旧流程 · 聊天窗口补救</span>
        <h3 class="col-title">一句话的问题，<br>变成一段新答案。</h3>
        <div class="chat-stream">
          <div class="bubble user"><span class="turn-tag">step 1</span>把这份 AI 初稿改得像我一点，别太 AI。</div>
          <div class="bubble ai huge">当然。以下是完整改写版……</div>
          <div class="bubble user"><span class="turn-tag">step 2</span>我已经贴到飞书了，只想改那句“信息爆炸”。</div>
          <div class="bubble ai huge">明白，我重新整理这一段……</div>
          <div class="bubble user"><span class="turn-tag">step 3</span>还是不确定，我再复制这一小段问你。</div>
          <div class="bubble user"><span class="turn-tag">step 4</span>最后还得手动粘回文档。</div>
        </div>
        <div class="chat-foot">
          <span class="label">稿件在文档，判断在聊天</span>
          <span class="stat">复制初稿 · 摘句追问 · 再粘回</span>
        </div>
        <div class="compare-stat-row" style="margin-top:auto; padding-top:18px">
          <div class="compare-stat bad"><span class="num">4</span><span class="desc">步补救<br>才改一句</span></div>
          <div class="compare-stat bad"><span class="num">3x</span><span class="desc">复制粘贴<br>搬进搬出</span></div>
        </div>
      </div>

      <div class="col-card good">
        <span class="col-tag good">Zoon · Markdown 原文协作</span>
        <h3 class="col-title">Agent 直接进稿件，<br>改动留在原文旁边。</h3>
        <div class="doc-demo">
          <span class="doc-line">## 原文</span>
          <span class="doc-line ai-text" style="position:relative">
            在信息爆炸的时代，我们很难保持真正的专注。
            <span class="step-pill" style="position:absolute; top:4px; right:8px; font-size:9.5px">① 选中这句</span>
          </span>
          <span class="doc-line">## 任务评论</span>
          <span class="doc-line edited">只改这句，别重写整段；给一个更像人的表达。</span>
          <span class="doc-line">## Agent 建议</span>
          <span class="doc-line ai-text">Agent 改写：上周三晚上 11 点，我盯着同一段视频回放看了 17 遍。</span>
          <span class="doc-line edited">人类审校：保留画面感，删掉空泛判断。</span>
        </div>
        <div class="action-row">
          <span class="action-pill">发链接给 Agent</span>
          <span class="action-pill">只改选中句</span>
          <span class="action-pill">评论 / 建议 / 直改</span>
          <span class="action-pill active">✓ Markdown 原稿不搬走</span>
        </div>
        <div class="compare-stat-row" style="margin-top:auto; padding-top:18px">
          <div class="compare-stat good"><span class="num">1</span><span class="desc">份 Markdown<br>人和 Agent 同页</span></div>
          <div class="compare-stat good"><span class="num">0</span><span class="desc">搬进搬出<br>原文里审稿</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── PROVENANCE / FEATURES ──────────────────────── -->
<section class="prov-section" id="features">
  <div class="wrap">
    <div class="steps-head">
      <div class="prov-text">
        <p class="eyebrow">三步开始</p>
        <h2 class="sec-title">不是把稿子丢给 AI，<br>而是让 Agent <em class="keep-together">贴着原文改</em>。</h2>
      </div>
      <div class="steps-copy">
        <p>Zoon 不替代飞书，也不是再开一个聊天窗口。它是 AI 改稿的中间工作台：先把 Markdown 草稿放进来，让 Agent 贴着原文改，审完再带回你的发布工具。</p>
        <div class="hero-ctas" style="margin-top:24px;margin-bottom:0">
          <button class="btn-primary create-doc-trigger" type="button">
            <span>免费创建文档</span>
            <small>无需注册</small>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
              <path d="M1 6H16M16 6L11 1M16 6L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="steps-grid">
      <article class="feat step-card">
        <div class="feat-num"><span>01 / Paste Draft</span><span class="glyph">↳</span></div>
        <h3 class="feat-title">放入 Markdown 初稿</h3>
        <p class="feat-desc">把需要改的文本先放进 Zoon，不需要先搭工作流。</p>
        <ul class="step-list">
          <li>公众号稿、内容稿、PRD、方案正文都可以直接粘贴。</li>
          <li>如果原稿在飞书或公众号后台，先复制文本进来做改稿。</li>
        </ul>
        <span class="feat-tag">先把稿件放到现场</span>
      </article>
      <article class="feat step-card">
        <div class="feat-num"><span>02 / Ask Agent</span><span class="glyph">●</span></div>
        <h3 class="feat-title">选中一段让 Agent 改</h3>
        <p class="feat-desc">想改哪里就选哪里，其他地方保持不动。</p>
        <ul class="step-list">
          <li>右键做修语法、改表达、缩短，或让 Agent 留评论。</li>
          <li>也可以把 Zoon 链接发给 Codex、Claude Code 或 ChatGPT。</li>
        </ul>
        <span class="feat-tag">不用重新描述上下文</span>
      </article>
      <article class="feat step-card">
        <div class="feat-num"><span>03 / Review</span><span class="glyph">⌥</span></div>
        <h3 class="feat-title">在原文里审校保留</h3>
        <p class="feat-desc">Agent 的写入、评论和建议都贴着原文，你决定保留什么。</p>
        <ul class="step-list">
          <li>个人用户完成一次局部改稿，不再来回复制。</li>
          <li>团队可以继续邀请人类协作者或第二个 Agent 审校。</li>
        </ul>
        <span class="feat-tag">减少复制粘贴和合稿混乱</span>
      </article>
    </div>
  </div>
</section>

<!-- ── ROLES ──────────────────────────────────────── -->
<section class="roles-section" id="roles">
  <div class="wrap">
    <p class="eyebrow">谁最需要</p>
    <h2 class="sec-title">三类人最先感到：<br>AI 改稿不该停在聊天里。</h2>
    <p class="sec-sub">Zoon 先服务文本密集工作流：公众号长文、内容稿、PRD、方案正文。图片和复杂排版不是这一期重点。</p>

    <div class="use-case-grid">
      <article class="use-case-card">
        <span class="use-case-label">Creator</span>
        <h3>公众号作者打磨长文</h3>
        <div class="use-case-block">
          <strong>痛点</strong>
          <p>AI 能写初稿，但每次局部润色都要复制一段给 AI，再粘回编辑器。</p>
        </div>
        <div class="use-case-block">
          <strong>Zoon 解决</strong>
          <p>选中一段直接让 Agent 改表达或缩短，你决定保留哪一句。</p>
        </div>
        <a href="#features" class="btn-ghost">试一次局部润色 →</a>
      </article>

      <article class="use-case-card">
        <span class="use-case-label">Editor</span>
        <h3>内容编辑做多轮改稿</h3>
        <div class="use-case-block">
          <strong>痛点</strong>
          <p>一篇稿子反复让 AI 改几轮，聊天窗口、飞书和人工修改混在一起。</p>
        </div>
        <div class="use-case-block">
          <strong>Zoon 解决</strong>
          <p>Agent 在同一份 Markdown 稿件里评论、建议、直改，修改发生在哪里一眼可见。</p>
        </div>
        <button class="btn-ghost create-doc-trigger" type="button">创建改稿文档 →</button>
      </article>

      <article class="use-case-card">
        <span class="use-case-label">PM</span>
        <h3>产品经理写 PRD 和方案</h3>
        <div class="use-case-block">
          <strong>痛点</strong>
          <p>AI 补材料很快，但粘回方案后，很难判断哪些是你的判断，哪些是 AI 扩展。</p>
        </div>
        <div class="use-case-block">
          <strong>Zoon 解决</strong>
          <p>人类负责方向，Agent 负责补充和改写；来源可见，交付前能逐段审校。</p>
        </div>
        <a href="#pricing" class="btn-ghost">看团队协作 →</a>
      </article>
    </div>
  </div>
</section>

<!-- ── PRICING ─────────────────────────────────────── -->
<section class="pilot-section" id="pricing">
  <div class="wrap">
    <p class="eyebrow">价格</p>
    <h2 class="sec-title">先免费试一次，<br>再选择个人或 Team 协作。</h2>
    <p class="sec-sub">第一次先用个人免费试用完成局部改稿；高频写稿的人用个人模式，把 quick actions 和内置 Agent 用顺；有多人审校和合稿的团队，再用 Team 协作跑一个季度真实流程。</p>

    <div class="pilot-grid">
      <article class="pilot-card free">
        <span class="pilot-label">Free</span>
        <h3>个人免费试用</h3>
        <div class="pilot-price">¥0 <small>/ 试一次</small></div>
        <p>适合第一次理解 Zoon：把草稿放进 Markdown 文档，选中一段，体验基础快捷操作或把链接发给外部 Agent。</p>
        <ul class="pilot-list">
          <li>免费创建文档，试一次局部改稿。</li>
          <li>复制链接给 Claude Code / Codex / ChatGPT / Kimi。</li>
          <li>验证是否减少复制粘贴、局部追问和回贴。</li>
        </ul>
        <button class="btn-primary create-doc-trigger" type="button">
          <span>免费创建文档</span>
          <small>试一次</small>
        </button>
      </article>

      <article class="pilot-card paid">
        <span class="pilot-label">Personal</span>
        <h3>个人模式</h3>
        <div class="pilot-price">¥19.9 <small>/ 季度</small></div>
        <p>适合公众号作者、内容编辑、产品经理。用户买的不是 token 包，而是更顺的局部改稿动作和开箱即用的 Zoon Agent。</p>
        <ul class="pilot-list">
          <li>快速操作：修复语法、改善表达、缩短。</li>
          <li>局部追问：只围绕选中文本提问和改写。</li>
          <li>保留 / 删除 AI 修改，基础来源可见。</li>
        </ul>
        <button class="btn-ghost" type="button" disabled>个人模式灰度中</button>
      </article>

      <article class="pilot-card team">
        <span class="pilot-label">Team</span>
        <h3>Team 协作模式</h3>
        <div class="pilot-price">¥1,999 <small>/ 季度</small></div>
        <p>适合每周有 5 份以上文本稿件、PRD、方案或报告的团队，用真实文档验证 AI 改稿是否能从聊天窗口迁到稿件现场。</p>
        <ul class="pilot-list">
          <li>10-30 份真实文本协作文档，2-5 名人类协作者，1-3 个 Agent 身份。</li>
          <li>3 套改稿 prompt / 任务模板，45 分钟 onboarding，1 次试点复盘。</li>
          <li>文本协作为主；不承诺图片排版、SSO、私有部署或完整团队后台。</li>
        </ul>
        <button class="btn-ghost" type="button" disabled>Team Pilot 灰度开放中</button>
      </article>
    </div>
  </div>
</section>

<!-- ── TABLE ──────────────────────────────────────── -->
<section class="table-section">
  <div class="wrap">
    <p class="eyebrow">为什么值得换流程</p>
    <h2 class="sec-title">不是更会聊天，<br>而是把改稿动作放回<em>真实文档</em>。</h2>
    <p class="sec-sub">第一价值不是“生成更多文字”，而是减少复制粘贴、局部追问和多人合稿混乱。</p>
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
            <td class="row-label">AI 起草</td>
            <td>能</td><td>不能</td><td>能</td>
            <td class="zoon-cell">能</td>
          </tr>
          <tr>
            <td class="row-label">选中一段精准改</td>
            <td>靠追问</td><td>靠人改</td><td>部分支持</td>
            <td class="zoon-cell">想改哪就改哪</td>
          </tr>
          <tr>
            <td class="row-label">Agent 进入稿件现场</td>
            <td>不能</td><td>不能</td><td>少见</td>
            <td class="zoon-cell">可以</td>
          </tr>
          <tr>
            <td class="row-label">人类 / AI 来源可见</td>
            <td>看不清</td><td>看不清</td><td>不稳定</td>
            <td class="zoon-cell">清楚</td>
          </tr>
          <tr>
            <td class="row-label">评论、建议、直改同页审校</td>
            <td>分散</td><td>部分评论</td><td>部分支持</td>
            <td class="zoon-cell">同页完成</td>
          </tr>
        </tbody>
      </table>
      <p class="table-hint" aria-hidden="true">← 左右滑动看完整对比 →</p>
    </div>
  </div>
</section>

<!-- ── CONNECT ─────────────────────────────────────── -->
<section class="connect-section" id="connect">
  <div class="wrap">
    <p class="eyebrow">给 Agent 的入口</p>
    <h2 class="sec-title">已经在用 Agent？<br><em>把 Zoon 链接交给它。</em></h2>
    <p class="sec-sub">个人用户可以先用右键快捷操作；高级用户和团队试点可以继续使用 Codex、Claude Code、ChatGPT 或其他能发 HTTP 请求的 Agent。</p>

    <div class="tool-picker" role="tablist">
      <button class="tool-card active" data-code="codexPlugin" type="button">
        <div class="name">Codex Plugin</div><div class="meta">Marketplace · 推荐</div>
      </button>
      <button class="tool-card" data-code="claude" type="button">
        <div class="name">Claude Code</div><div class="meta">Plugin · 一行命令</div>
      </button>
      <button class="tool-card" data-code="codex" type="button">
        <div class="name">Skills 文件</div><div class="meta">Codex / Cursor fallback</div>
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
      <pre id="code-content" style="margin:0; white-space:pre-wrap"><span class="comment"># 1. 添加 Zoon Codex plugin marketplace</span>
<span class="kw">codex plugin marketplace add</span> <span class="str">stephenfan80/zoon-codex-plugin</span>

<span class="comment"># 2. 在 Codex 的 Plugins 列表里启用 Zoon</span>
<span class="comment"># 新开一个 Codex 会话后，贴 Zoon URL 或说「推到 Zoon」即可触发。</span>

<span class="comment"># 触发示例</span>
<span class="str">把这个方案推到 Zoon</span></pre>
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
        <h2 class="sec-title">先把边界<br>讲清楚。</h2>
        <p class="sec-sub" style="margin-bottom:0">当前首页只承诺文本密集改稿工作流，不把 Zoon 包装成成熟团队平台。</p>
      </div>
      <div class="faq-list">
        <div class="faq-item open">
          <button class="faq-q" type="button">Zoon 是飞书 / Google Docs 替代品吗？<span class="toggle">+</span></button>
          <div class="faq-a">不是。Zoon 当前更适合作为 AI 改稿中间工作台。你可以在 Zoon 里让 Agent 贴着原文改，最后再迁回飞书、公众号编辑器或其他交付工具。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">Zoon 自己提供 AI 模型吗？<span class="toggle">+</span></button>
          <div class="faq-a">Zoon 的核心是让 Agent 进入文档协作。个人模式会灰度接入内置 Zoon Agent；高级用户也可以继续使用 Claude Code、Codex、Cursor、ChatGPT 或其他能发 HTTP 请求的 Agent。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">为什么用 Markdown？<span class="toggle">+</span></button>
          <div class="faq-a">Markdown 对人类够简单，对 Agent 也足够清晰。它让 AI 更容易准确读、改、评论你正在写的那一段。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">支持图片和排版吗？<span class="toggle">+</span></button>
          <div class="faq-a">当前商业化试点只承诺文本密集工作流。图片、富媒体排版和企业级文档管理不在本期范围内。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">免费、个人模式和 Team 协作有什么区别？<span class="toggle">+</span></button>
          <div class="faq-a">个人免费试用让你创建文档并完成一次局部改稿。个人模式面向高频个人写稿和审稿，重点是更顺的 quick actions 和内置 Agent。Team 协作模式是季度试点，用真实团队文档验证多人和多个 Agent 能否减少复制粘贴、局部追问和合稿混乱。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">Team Pilot 包含什么？<span class="toggle">+</span></button>
          <div class="faq-a">Team Pilot 是季度试点，价格 ¥1,999。包含 10-30 份真实文本协作文档、2-5 名人类协作者、1-3 个 Agent 身份、3 套改稿 prompt / 任务模板、45 分钟 onboarding 和 1 次试点复盘。</div>
        </div>
        <div class="faq-item">
          <button class="faq-q" type="button">Team Pilot 不包含什么？<span class="toggle">+</span></button>
          <div class="faq-a">这不是成熟企业平台，不承诺图片排版、完整 workspace / team 后台、billing、企业级权限矩阵、SSO / SCIM、私有部署标准流程、正式审计日志、合规报告或 SLA。</div>
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
      让 Agent 直接在<br>
      Markdown 稿件里改。
    </h2>
    <p class="sec-sub" style="max-width:520px;margin:0 auto 32px;text-align:center">
      免费创建文档，先试一次局部改稿；如果团队每周有多份文本稿件，再用 Team Pilot 跑真实协作流程。
    </p>
    <div class="hero-ctas" style="justify-content:center">
      <button class="btn-primary create-doc-trigger" type="button">
        <span>免费创建文档</span>
        <small>试一次局部改稿</small>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
          <path d="M1 6H16M16 6L11 1M16 6L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <a href="#pricing" class="btn-ghost">了解 Team Pilot →</a>
    </div>
    <p class="final-flair">— Zoon, Agent 进入稿件现场 —</p>
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
        <p class="foot-blurb">让 Agent 直接改你的 Markdown 稿件。<br>文本为主，先跑通真实改稿流程。</p>
      </div>
      <div class="foot-col">
        <h5>产品</h5>
        <a href="#why">为什么用</a>
        <a href="#features">三步开始</a>
        <a href="#roles">谁在用</a>
        <a href="#pricing">价格</a>
        <a href="/blog">Blog</a>
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
