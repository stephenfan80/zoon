import { readFileSync } from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertIncludes(source: string, needle: string, message: string): void {
  assert(source.includes(needle), message);
}

function assertMatches(source: string, pattern: RegExp, message: string): void {
  assert(pattern.test(source), message);
}

const root = process.cwd();
const homepage = readFileSync(path.join(root, 'server', 'homepage.ts'), 'utf8');
const editor = readFileSync(path.join(root, 'src', 'editor', 'index.ts'), 'utf8');
const editorSidebar = readFileSync(path.join(root, 'src', 'ui', 'editor-document-sidebar.ts'), 'utf8');
const recentDocs = readFileSync(path.join(root, 'src', 'ui', 'recent-docs.ts'), 'utf8');
const html = readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const hostedAuth = readFileSync(path.join(root, 'server', 'hosted-auth.ts'), 'utf8');
const routes = readFileSync(path.join(root, 'server', 'routes.ts'), 'utf8');
const db = readFileSync(path.join(root, 'server', 'db.ts'), 'utf8');

assertIncludes(homepage, 'id="home-account-trigger"', 'Homepage should render the account trigger');
assertIncludes(homepage, '把一个想法，<br />和 <em>Agent</em> 一起写成文档', 'Homepage hero should use the idea-to-document headline');
assertIncludes(homepage, '复制邀请给 Agent', 'Homepage flow should use Agent language');
assertIncludes(homepage, 'class="role-card human"', 'Homepage should visualize the human role');
assertIncludes(homepage, 'class="role-card agent"', 'Homepage should visualize the Agent role');
assertIncludes(homepage, '邀请 Agent 参加', 'Homepage story should show the human inviting an Agent');
assertIncludes(homepage, 'data-story-step="idea"', 'Homepage story should include the idea step');
assertIncludes(homepage, 'data-story-step="outline"', 'Homepage story should include the outline step');
assertIncludes(homepage, 'data-story-step="human"', 'Homepage story should include the human contribution step');
assertIncludes(homepage, 'data-story-step="revise"', 'Homepage story should include the agent revision step');
assertIncludes(homepage, 'data-story-step="review"', 'Homepage story should include the review step');
assertIncludes(homepage, 'class="mobile-story-visual"', 'Homepage story should include mobile story visuals');
assertIncludes(homepage, '人类直接修改 Agent 内容', 'Homepage story should show humans directly editing Agent content');
assertIncludes(homepage, 'Agent 根据人类修改再次补充', 'Homepage story should show the Agent revising after human edits');
assertIncludes(homepage, '来源可见', 'Homepage story should show authorship visibility instead of forced replacement confirmation');
assertIncludes(homepage, '评论 / 建议可选', 'Homepage story should show opt-in review paths');
assertIncludes(homepage, '改 / 删 / 重写', 'Homepage story should show review actions');
assertIncludes(homepage, '@keyframes hero-story-scroll', 'Homepage hero demo should auto-scroll inside a fixed viewport');
assertIncludes(homepage, 'animation: hero-story-scroll', 'Homepage hero demo content should use the auto-scroll animation');
assertIncludes(homepage, '@keyframes hero-story-scroll-mobile', 'Homepage hero demo should have a mobile-safe scroll animation');
assertIncludes(homepage, 'prefers-reduced-motion: reduce', 'Homepage should respect reduced motion');
assert(!homepage.includes('class="flow-strip"'), 'Homepage hero should not render the old three-step flow strip');
assert(!homepage.includes('class="hero-toolbar"'), 'Homepage hero preview should not render the redundant editor toolbar');
assert(!homepage.includes('class="agent-strip'), 'Homepage should not render the old agent compatibility strip');
assert(!homepage.includes('四步开始协作'), 'Homepage should not use the old static four-step section title');
assert(!homepage.includes('Works with your AI tools'), 'Homepage should not show the old English agent strip label');
assert(!homepage.includes('把同一段邀请发给你的 Agent'), 'Homepage should not show the removed agent strip copy');
assert(!homepage.includes('让 <em>AI</em> 直接写'), 'Homepage should not show the old AI-focused headline');
assert(!homepage.includes('人类和 <em>Agent</em>，<br />一起构建内容'), 'Homepage should not show the old human + Agent headline');
assertIncludes(homepage, 'class="home-auth-modal"', 'Homepage should render auth in a top-level modal');
assertIncludes(homepage, 'home-auth-backdrop', 'Homepage auth modal should include a blocking backdrop');
assertMatches(homepage, /header\s*\{[^}]*z-index:\s*1300/s, 'Homepage header should stack the account panel above the hero preview');
assertMatches(homepage, /@media \(max-width: 720px\)[\s\S]*\.home-account-panel\s*\{[^}]*right:\s*0;[^}]*left:\s*auto;[^}]*transform:\s*none/s, 'Homepage mobile account panel should stay inside the viewport');
assertMatches(homepage, /@media \(max-width: 420px\)[\s\S]*\.home-account-panel\s*\{[^}]*width:\s*calc\(100vw - 56px\)/s, 'Homepage narrow mobile account panel should keep side margins');
assert(!homepage.includes('邀请码（注册时填写）'), 'Homepage signup should not require invite codes by default');
assertIncludes(homepage, '欢迎回来', 'Homepage should use a polished login state');
assertIncludes(homepage, "'/api/auth/local/login'", 'Homepage should login with local accounts');
assertIncludes(homepage, "'/api/auth/local/register'", 'Homepage should register local accounts');
assertIncludes(homepage, "fetch('/api/account/documents?limit=50'", 'Homepage should load the account document library');
assertIncludes(homepage, "fetch('/api/auth/logout'", 'Homepage should support logout');
assertIncludes(homepage, "'zoon:recent-docs'", 'Homepage account panel should fall back to local recent documents');
assertIncludes(homepage, '搜索文档标题', 'Homepage account panel should include title search');
assertIncludes(homepage, '按创建时间排序', 'Homepage account panel should show creation-time sorting');
assertIncludes(homepage, 'sortAccountDocumentsByCreatedAt', 'Homepage account panel should sort account docs by createdAt');
assertIncludes(homepage, 'filterDocumentsByTitle', 'Homepage account panel should filter account docs by title');
assert(!homepage.includes("meta.textContent = doc.isOwned ? '我创建的文档' : '最近打开'"), 'Homepage account rows should not use latest-opened copy');
assert(!homepage.includes("newDoc.textContent = '新建文档'"), 'Homepage account panel should not create documents inside My Documents');
assertIncludes(homepage, 'home-doc-action', 'Homepage account rows should render delete/remove actions');
assertIncludes(homepage, "fetch('/api/documents/' + encodeURIComponent(slug)", 'Homepage should call the canonical document delete endpoint');
assertIncludes(homepage, "method: 'DELETE'", 'Homepage should support DELETE requests for docs and visits');
assertIncludes(homepage, 'getApiClientHeaders', 'Homepage delete/remove requests should include compatibility headers');
assertIncludes(homepage, "'X-Proof-Client-Version'", 'Homepage compatibility headers should include client version');

assertIncludes(editor, 'initEditorDocumentSidebar', 'Editor should mount the left document sidebar in share mode');
assertIncludes(editor, 'this.ensureDocumentSidebar();', 'Editor should initialize the document sidebar when the editor chrome appears');
assertIncludes(editor, 'this.destroyDocumentSidebar();', 'Editor should clean up the document sidebar when share mode exits');
assertIncludes(editor, 'shareBtn, newDocBtn, moreBtn', 'Editor top bar should keep share, new document, and non-history actions');
assert(!editor.includes('createAccountMenuButton'), 'Editor should no longer render My Documents from the top bar');
assert(!editor.includes('accountBtn'), 'Editor top bar should not include the removed My Documents entry');
assertIncludes(editor, "inviteLabel.textContent = '邀请 Agent';", 'Editor top more menu should keep non-history actions');
assert(!editor.includes("loadAccountDocuments(50)"), 'Editor top more menu should not load account history');
assert(!editor.includes("loadRecentDocs()"), 'Editor top more menu should not render local recent history');
assert(!editor.includes('share-account-auth-modal'), 'Editor auth should move out of the top dropdown into the left sidebar flow');

assertIncludes(html, 'id="document-sidebar-root"', 'Editor HTML should include the left document sidebar mount');
assertIncludes(html, '--document-sidebar-width: 272px;', 'Editor should reserve a narrow left document sidebar');
assertIncludes(html, '--document-sidebar-collapsed-width: 48px;', 'Editor should define a collapsed document sidebar rail width');
assertIncludes(html, 'body[data-share-mode="true"] #document-sidebar-root', 'Document sidebar should only appear in share editing mode');
assertIncludes(html, 'body[data-share-mode="true"].document-sidebar-collapsed', 'Desktop sidebar should support a collapsed rail state');
assertIncludes(html, '.document-sidebar-resize-handle', 'Desktop sidebar should expose a resize handle');
assertIncludes(html, 'body.document-sidebar-resizing', 'Desktop sidebar resizing should lock the resize cursor');
assert(!html.includes('.document-sidebar-provenance-legend'), 'Editor sidebar should not show the collaboration color legend');
assertIncludes(html, '.document-sidebar-mobile-toggle', 'Mobile editor should expose a collapsed document drawer trigger');
assertIncludes(html, 'body.document-sidebar-open', 'Mobile document drawer should use an explicit open state');
assertIncludes(html, 'top: 72px;', 'Mobile document drawer trigger should sit below the share banner');
assertIncludes(html, 'z-index: 1200;', 'Mobile document drawer should layer above the share banner when open');

assertIncludes(editorSidebar, 'loginAccount', 'Editor sidebar should support local account login');
assertIncludes(editorSidebar, 'registerAccount', 'Editor sidebar should support local account registration');
assert(!editorSidebar.includes('邀请码（注册时填写）'), 'Editor signup should not require invite codes by default');
assertIncludes(editorSidebar, '欢迎回来', 'Editor sidebar should use the same polished login state as the homepage');
assertIncludes(editorSidebar, '登录后内容会跟账号绑定，其他设备端也能看到。', 'Signed-out sidebar should explain account-bound cross-device documents');
assertIncludes(editorSidebar, 'loadAccountDocuments(50)', 'Editor sidebar should load account documents');
assertIncludes(editorSidebar, 'loadRecentDocs()', 'Editor sidebar should fall back to local recent documents');
assertIncludes(editorSidebar, '本机最近文档', 'Signed-out sidebar should show local recent documents as a fallback');
assertIncludes(editorSidebar, '搜索文档标题', 'Editor account sidebar should include title search');
assertIncludes(editorSidebar, '搜索本机文档标题', 'Signed-out sidebar should support local title search');
assertIncludes(editorSidebar, '按创建时间排序', 'Editor account sidebar should show creation-time sorting');
assertIncludes(editorSidebar, 'sortAccountDocumentsByCreatedAtDesc', 'Editor sidebar should sort account docs by createdAt');
assertIncludes(editorSidebar, 'filterAccountDocumentsByTitle', 'Editor sidebar should filter account docs by title');
assertIncludes(editorSidebar, 'card.href = options.href;', 'Document cards should navigate by webUrl in the current tab');
assert(!editorSidebar.includes("card.target = '_blank'"), 'Document cards should not open a new tab');
assertIncludes(editorSidebar, "const SIDEBAR_WIDTH_STORAGE_KEY = 'zoon.editor.documentSidebar.width';", 'Editor sidebar should persist the desktop width locally');
assertIncludes(editorSidebar, "const SIDEBAR_COLLAPSED_STORAGE_KEY = 'zoon.editor.documentSidebar.collapsed';", 'Editor sidebar should persist collapsed state locally');
assertIncludes(editorSidebar, 'const SIDEBAR_MIN_WIDTH = 236;', 'Editor sidebar should enforce a readable minimum width');
assertIncludes(editorSidebar, 'const SIDEBAR_MAX_WIDTH = 420;', 'Editor sidebar should enforce a maximum width');
assertIncludes(editorSidebar, 'this.resizeHandle.setAttribute(\'role\', \'separator\');', 'Editor sidebar resize handle should be accessible');
assertIncludes(editorSidebar, "this.collapseToggle.textContent = this.collapsed ? '展开' : '收起';", 'Editor sidebar should expose explicit collapse/expand copy');
assert(!editorSidebar.includes('createProvenanceLegend'), 'Editor sidebar should not render the collaboration color legend');
assert(!editorSidebar.includes('协作颜色说明'), 'Editor sidebar should keep color explanation out of the history list');
assert(!editorSidebar.includes("meta.textContent = doc.isOwned ? '我创建的文档' : '最近打开'"), 'Editor account rows should not use latest-opened copy');
assert(!editorSidebar.includes("newDoc.textContent = '新建文档'"), 'Editor sidebar should not create documents inside the history list');
assertIncludes(editorSidebar, 'logoutAccount', 'Editor sidebar should support account logout');
assertIncludes(editorSidebar, 'deleteOwnedDocument', 'Editor sidebar should call the shared delete helper for owned documents');
assertIncludes(editorSidebar, 'removeAccountDocumentVisit', 'Editor sidebar should remove shared docs from the account list');
assertIncludes(editorSidebar, 'getLocalOwnerSecret', 'Editor sidebar should support anonymous owner deletion from local recent docs');
assertIncludes(editorSidebar, "document.body.classList.toggle('document-sidebar-open', open)", 'Mobile sidebar should open as a collapsible drawer');

assertIncludes(recentDocs, 'export async function loginAccount', 'Recent-docs module should export local login');
assertIncludes(recentDocs, 'export async function registerAccount', 'Recent-docs module should export local registration');
assertIncludes(recentDocs, 'export async function loadAccountDocuments', 'Recent-docs module should export account documents');
assertIncludes(recentDocs, 'export function sortAccountDocumentsByCreatedAtDesc', 'Recent-docs module should export account document creation-time sorting');
assertIncludes(recentDocs, 'export function filterAccountDocumentsByTitle', 'Recent-docs module should export account document title search');
assertIncludes(recentDocs, 'export function removeRecentDoc', 'Recent-docs module should export local removal');
assertIncludes(recentDocs, 'export function getLocalOwnerSecret', 'Recent-docs module should export local owner lookup');
assertIncludes(recentDocs, 'export async function deleteOwnedDocument', 'Recent-docs module should export owned document deletion');
assertIncludes(recentDocs, 'export async function removeAccountDocumentVisit', 'Recent-docs module should export account visit removal');
assertIncludes(recentDocs, 'getApiClientHeaders', 'Recent-docs delete/remove requests should include compatibility headers');
assertIncludes(recentDocs, "'X-Proof-Client-Version'", 'Recent-docs compatibility headers should include client version');

assertIncludes(routes, "apiRoutes.post('/auth/local/register'", 'Routes should expose local registration');
assertIncludes(routes, "apiRoutes.post('/auth/local/login'", 'Routes should expose local login');
assertIncludes(hostedAuth, 'export function registerLocalAccount', 'Hosted auth should implement local registration');
assertIncludes(hostedAuth, 'export function loginLocalAccount', 'Hosted auth should implement local login');
assertIncludes(hostedAuth, 'ZOON_SIGNUP_INVITE_REQUIRED', 'Hosted auth should keep invite codes as an explicit optional gate');
assertIncludes(db, 'CREATE TABLE IF NOT EXISTS local_accounts', 'Database should store local accounts');

console.log('✓ account UI static wiring');
