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
  assertIncludes(introCard, 'left: var(--editor-workspace-left, 0px);', 'Intro card should center inside the editor workspace, not the full viewport');
  assertIncludes(introCard, 'justify-content: center;', 'Intro card should use the editor workspace rail for centering');
  assertIncludes(introCard, 'width: min(560px, calc(100vw - var(--editor-workspace-left, 0px) - 32px));', 'Intro card width should account for the document sidebar');
  assertIncludes(introCard, 'background: rgba(255, 255, 255, 0.98);', 'Intro card should match the white editor surface');
  assertIncludes(introCard, '这是你和 AI 一起写的文档');
  assertIncludes(introCard, 'Zoon 把协作分成三层');
  assertIncludes(introCard, '评论是任务 / 讨论');
  assertIncludes(introCard, '建议是待确认改动');
  assertIncludes(introCard, '才是真正改正文');
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
  assertIncludes(defaultMarkdown, '协作模型分三层');
  assertIncludes(defaultMarkdown, '评论 = 任务 / 讨论');
  assertIncludes(defaultMarkdown, '建议 = 待确认改动');
  assertIncludes(defaultMarkdown, '正文 = 真正改动');
  assertIncludes(defaultMarkdown, '需要哪一层，就明确告诉 Agent');
  assertIncludes(defaultMarkdown, 'Zoon 的控制感来自来源可见');
  assertNotIncludes(defaultMarkdown, '拍板');
  assertNotIncludes(defaultMarkdown, '挂批注');

  console.log('collab-first-run-onboarding.test.ts: ok');
}

run();
