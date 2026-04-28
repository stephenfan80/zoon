import { readFileSync } from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertIncludes(source: string, needle: string, message: string): void {
  assert(source.includes(needle), message);
}

const root = process.cwd();
const homepage = readFileSync(path.join(root, 'server', 'homepage.ts'), 'utf8');
const editor = readFileSync(path.join(root, 'src', 'editor', 'index.ts'), 'utf8');
const recentDocs = readFileSync(path.join(root, 'src', 'ui', 'recent-docs.ts'), 'utf8');
const hostedAuth = readFileSync(path.join(root, 'server', 'hosted-auth.ts'), 'utf8');
const routes = readFileSync(path.join(root, 'server', 'routes.ts'), 'utf8');
const db = readFileSync(path.join(root, 'server', 'db.ts'), 'utf8');

assertIncludes(homepage, 'id="home-account-trigger"', 'Homepage should render the account trigger');
assertIncludes(homepage, 'class="home-auth-modal"', 'Homepage should render auth in a top-level modal');
assertIncludes(homepage, 'home-auth-backdrop', 'Homepage auth modal should include a blocking backdrop');
assert(!homepage.includes('邀请码（注册时填写）'), 'Homepage signup should not require invite codes by default');
assertIncludes(homepage, '欢迎回来', 'Homepage should use a polished login state');
assertIncludes(homepage, "'/api/auth/local/login'", 'Homepage should login with local accounts');
assertIncludes(homepage, "'/api/auth/local/register'", 'Homepage should register local accounts');
assertIncludes(homepage, "fetch('/api/account/documents?limit=50'", 'Homepage should load the account document library');
assertIncludes(homepage, "fetch('/api/auth/logout'", 'Homepage should support logout');
assertIncludes(homepage, "'zoon:recent-docs'", 'Homepage account panel should fall back to local recent documents');

assertIncludes(editor, 'createAccountMenuButton', 'Editor should define an account menu button');
assertIncludes(editor, 'loginAccount', 'Editor should support local account login');
assertIncludes(editor, 'registerAccount', 'Editor should support local account registration');
assert(!editor.includes('邀请码（注册时填写）'), 'Editor signup should not require invite codes by default');
assert(!editor.includes('renderSignedOutMenu'), 'Editor signed-out auth should not render inside the dark document dropdown');
assertIncludes(editor, 'share-account-auth-modal', 'Editor should render signed-out auth in a top-level modal');
assertIncludes(editor, 'share-account-auth-backdrop', 'Editor auth modal should include a blocking backdrop');
assertIncludes(editor, 'Zoon account', 'Editor auth modal should use the homepage account copy');
assertIncludes(editor, '欢迎回来', 'Editor should use the same polished login state as the homepage');
assertIncludes(editor, 'loadAccountDocuments(50)', 'Editor should load account documents in the panel');
assertIncludes(editor, 'logoutAccount', 'Editor should support account logout');
assertIncludes(editor, 'newDocBtn, accountBtn, moreBtn', 'Editor account button should sit between new-doc and more actions');

assertIncludes(recentDocs, 'export async function loginAccount', 'Recent-docs module should export local login');
assertIncludes(recentDocs, 'export async function registerAccount', 'Recent-docs module should export local registration');
assertIncludes(recentDocs, 'export async function loadAccountDocuments', 'Recent-docs module should export account documents');

assertIncludes(routes, "apiRoutes.post('/auth/local/register'", 'Routes should expose local registration');
assertIncludes(routes, "apiRoutes.post('/auth/local/login'", 'Routes should expose local login');
assertIncludes(hostedAuth, 'export function registerLocalAccount', 'Hosted auth should implement local registration');
assertIncludes(hostedAuth, 'export function loginLocalAccount', 'Hosted auth should implement local login');
assertIncludes(hostedAuth, 'ZOON_SIGNUP_INVITE_REQUIRED', 'Hosted auth should keep invite codes as an explicit optional gate');
assertIncludes(db, 'CREATE TABLE IF NOT EXISTS local_accounts', 'Database should store local accounts');

console.log('✓ account UI static wiring');
