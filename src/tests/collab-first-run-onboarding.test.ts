import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source: string, text: string, message?: string): void {
  assert(source.includes(text), message ?? `Expected source to include: ${text}`);
}

function assertNotIncludes(source: string, text: string, message?: string): void {
  assert(!source.includes(text), message ?? `Expected source not to include: ${text}`);
}

function assertBootDoesNotOpenWelcome(editorSource: string): void {
  const match = editorSource.match(/function bootEditor\(\) \{([\s\S]*?)\n\}/);
  assert(Boolean(match), 'Expected bootEditor() to exist');
  const body = match?.[1] ?? '';
  assertNotIncludes(body, 'maybeShowWelcomeCard', 'bootEditor must not directly show the welcome modal');
  assertNotIncludes(body, 'showWelcomeCard', 'bootEditor must not directly show the invite modal');
}

function run(): void {
  const editor = read('src/editor/index.ts');
  const introCard = read('src/ui/collab-intro-card.ts');
  const welcomeCard = read('src/ui/welcome-card.ts');
  const homepage = read('server/homepage.ts');
  const publicEntryRoutes = read('server/public-entry-routes.ts');

  assertIncludes(editor, "import { maybeShowCollabIntroCard } from '../ui/collab-intro-card';");
  assertIncludes(editor, "import { showWelcomeCard } from '../ui/welcome-card';");
  assertNotIncludes(editor, 'maybeShowWelcomeCard', 'welcome=1 should route through the intro card, not the old modal helper');
  assertBootDoesNotOpenWelcome(editor);

  const loadedShareIndex = editor.indexOf("console.log('[initFromShare] Loaded shared document:'");
  const introCallIndex = editor.indexOf('const handledFirstRunIntro = maybeShowCollabIntroCard({', loadedShareIndex);
  assert(loadedShareIndex > -1, 'Expected initFromShare success marker');
  assert(introCallIndex > loadedShareIndex, 'Expected intro card to show only after shared document init succeeds');
  assertIncludes(editor, 'onInvite: () => showWelcomeCard({ reopen: true })');
  assertIncludes(editor, 'onWriteFirst: promptForViewerName,');
  assertIncludes(editor, 'if (!handledFirstRunIntro) promptForViewerName();');

  assertIncludes(introCard, 'onWriteFirst?: () => void;');
  assertIncludes(introCard, 'export function maybeShowCollabIntroCard(options: CollabIntroOptions): boolean');
  assertIncludes(introCard, 'transform: translateX(-50%);');
  assertIncludes(introCard, '这是你和 AI 一起写的文档');
  assertIncludes(introCard, '你写的会保留人类身份。');
  assertIncludes(introCard, 'AI 新写内容会显示为紫色。');
  assertIncludes(introCard, '不喜欢的 AI 段落可以直接改或删。');
  assertIncludes(introCard, '邀请 Agent');
  assertIncludes(introCard, '先自己写');

  assertIncludes(welcomeCard, 'buildAgentInviteMessage');
  assertIncludes(welcomeCard, '复制这段给你的 AI');
  assertIncludes(welcomeCard, '它会加入这篇文档，并等你给任务后再读取和写入。');
  assertNotIncludes(welcomeCard, '把你的 Agent 请进来');

  assertIncludes(homepage, '免费创建协作文档');
  assertIncludes(homepage, '<a class="secondary" href="#how-it-works">看一次协作过程</a>');
  assertNotIncludes(homepage, '<a class="secondary" href="/skill"');
  assertNotIncludes(homepage, 'Agent 自动读文档');

  const defaultMarkdownStart = publicEntryRoutes.indexOf('const DEFAULT_MARKDOWN = `');
  const defaultMarkdownEnd = publicEntryRoutes.indexOf('`;', defaultMarkdownStart + 1);
  assert(defaultMarkdownStart !== -1 && defaultMarkdownEnd !== -1, 'Expected DEFAULT_MARKDOWN to exist');
  const defaultMarkdown = publicEntryRoutes.slice(defaultMarkdownStart, defaultMarkdownEnd);
  assertIncludes(defaultMarkdown, '一个链接就是协作入口');
  assertIncludes(defaultMarkdown, 'Agent 默认直接写');
  assertIncludes(defaultMarkdown, '评论或建议');
  assertIncludes(defaultMarkdown, 'Zoon 的控制感来自来源可见');
  assertNotIncludes(defaultMarkdown, '拍板');
  assertNotIncludes(defaultMarkdown, '挂批注');

  console.log('collab-first-run-onboarding.test.ts: ok');
}

run();
