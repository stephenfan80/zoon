import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');

const homepage = readFileSync(path.join(root, 'server', 'homepage-v2.ts'), 'utf8');
const serverIndex = readFileSync(path.join(root, 'server', 'index.ts'), 'utf8');
const blogPages = readFileSync(path.join(root, 'server', 'blog-pages.ts'), 'utf8');

assert(homepage.includes('id="demo"'), 'Expected homepage to expose #demo section');
assert(homepage.includes('/assets/zoon-demo-90s.mp4'), 'Expected homepage video source path');
assert(homepage.includes('/assets/zoon-demo-poster.jpg'), 'Expected homepage video poster path');
assert(existsSync(path.join(root, 'public', 'assets', 'zoon-demo-90s.mp4')), 'Expected demo mp4 asset to exist');
assert(existsSync(path.join(root, 'public', 'assets', 'zoon-demo-poster.jpg')), 'Expected demo poster asset to exist');
assert(existsSync(path.join(root, 'public', 'assets', 'zoon-team-writing-workflow.jpg')), 'Expected team writing workflow blog image to exist');
assert(homepage.includes('观看 90 秒演示'), 'Expected hero CTA to link to the demo video section');
assert(homepage.includes('<a href="/blog">Blog</a>'), 'Expected homepage nav to link to the standalone Blog page');
assert(!homepage.includes('id="blog"'), 'Homepage should not embed a Blog section');
assert(!homepage.includes('blog-teaser-section'), 'Homepage should not keep Blog teaser styles');

assert(serverIndex.includes("app.get('/blog'"), 'Expected /blog route');
assert(serverIndex.includes("app.get('/blog/:slug'"), 'Expected /blog/:slug route');
assert(serverIndex.includes("renderBlogIndex()"), 'Expected blog index renderer to be wired');
assert(serverIndex.includes('renderBlogPost(req.params.slug)'), 'Expected blog post renderer to be wired');

assert(blogPages.includes('type BlogPost'), 'Expected BlogPost data structure');
assert(blogPages.includes('team-writing-workflow-agent-collaboration'), 'Expected team writing workflow post slug');
assert(blogPages.includes('AI 初稿之后，团队改稿为什么总是卡在复制粘贴里'), 'Expected team writing workflow post title');
assert(blogPages.includes('/assets/zoon-team-writing-workflow.jpg'), 'Expected team writing workflow hero image');
assert(blogPages.includes('文字工作者团队围绕同一份 Markdown 稿件和 Agent 协作审稿'), 'Expected descriptive alt text for generated image');
assert(blogPages.includes('给公众号作者、内容编辑和产品经理看的协作故事'), 'Expected user-facing team collaboration positioning');
assert(blogPages.includes('团队需要的不是更多答案'), 'Expected user-facing article conclusion');
assert(!blogPages.includes('主笔先把 AI 初稿放进 Zoon'), 'Team collaboration post should not read like an internal operation guide');
assert(blogPages.includes('real-time-agent-collaboration-crdt'), 'Expected CRDT post slug');
assert(blogPages.includes('真正能用的人和 Agent 实时协作：为什么 Zoon 不是另一个聊天窗口'), 'Expected first blog post title');
assert(blogPages.includes('Yjs CRDT'), 'Expected Yjs CRDT copy');
assert(blogPages.includes('Hocuspocus'), 'Expected Hocuspocus copy');
assert(blogPages.includes('<li><span><strong>实时协作光标 / presence'), 'Expected list copy to be wrapped for stable layout');
assert(blogPages.includes('<li><span><strong>Agent 可读写同一份 Markdown 原稿'), 'Expected Agent feature copy to be wrapped for stable layout');
assert(!blogPages.includes('Loro'), 'Blog should not claim Loro CRDT');
assert(!blogPages.includes('4 周'), 'Blog should not use old four-week pricing copy');
assert(!blogPages.includes('任意时间点可回滚'), 'Blog should not promise full version rollback');
assert(!blogPages.includes('一连网就同步'), 'Blog should not promise full offline editing');

console.log('✓ blog pages and homepage demo entry are wired');
