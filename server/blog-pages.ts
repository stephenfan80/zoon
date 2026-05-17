export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readTime: string;
  contentHtml: string;
};

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'real-time-agent-collaboration-crdt',
    title: '真正能用的人和 Agent 实时协作：为什么 Zoon 不是另一个聊天窗口',
    description:
      'Zoon 用 Yjs CRDT + Hocuspocus 做实时协作，让多人和 Agent 在同一份 Markdown 文档里编辑、评论、建议，减少复制到 AI、再粘回文档的断裂。',
    date: '2026-05-15',
    category: '协作技术',
    readTime: '6 min read',
    contentHtml: String.raw`
      <p>很多人已经会用 AI 起草内容，但真正卡住的不是“AI 会不会写”，而是改稿没有落点。</p>
      <p>你只想改一句，它常常重写一段；你想确认一小段，还要复制上下文去问，最后再把答案粘回原稿。Zoon 要解决的就是这个断裂：让人和 Agent 留在同一份 Markdown 稿件里协作。</p>

      <h2>1. 翻译成人话：实时协作不是“自动保存”</h2>
      <p>Zoon 的实时协作不是每隔几秒把全文保存一次，而是让多个浏览器和 Agent 面对同一份文档状态工作。你在文档里写，协作者能看到你的光标；Agent 通过 HTTP 读写同一份 Markdown；评论和建议会贴在原文附近，而不是散落在聊天记录里。</p>
      <p>底层使用的是 <strong>Yjs CRDT</strong> 和 <strong>Hocuspocus</strong>。你不需要理解它们的所有细节，只需要知道：它们让多人同时编辑时更容易保持一致，不需要靠“谁最后保存就覆盖谁”的方式合并。</p>

      <h2>2. 为什么这对 Agent 改稿重要</h2>
      <p>聊天窗口擅长回答问题，但不擅长保留稿件位置。Zoon 把位置交还给文档：选中哪一句，就让 Agent 只围绕这一句修语法、改表达、缩短或评论。其他地方保持不动。</p>
      <p>这件事对内容编辑、公众号作者和产品经理尤其重要，因为他们不是只要一段“新答案”，而是要把一份已经存在的稿子改到能发布、能交付、能让团队审校。</p>

      <h2>3. 日常体验会是什么样</h2>
      <ul>
        <li><span><strong>实时协作光标 / presence：</strong>你能看到人类协作者和 Agent 是否正在同一份文档里。</span></li>
        <li><span><strong>行内评论和任务评论：</strong>不确定的段落可以直接留在原文旁边讨论。</span></li>
        <li><span><strong>Agent 可读写同一份 Markdown 原稿：</strong>不需要把上下文搬进聊天窗口再搬回来。</span></li>
        <li><span><strong>人类 / AI 来源可见：</strong>你能判断哪些是自己的判断，哪些是 Agent 补充或改写。</span></li>
        <li><span><strong>评论、建议、直改都在同页审校：</strong>最后由人决定保留哪一句，而不是被一整段新答案淹没。</span></li>
      </ul>

      <h2>4. Zoon 不想替代所有文档工具</h2>
      <p>Zoon 当前更像 AI 改稿的中间工作台。你可以把飞书、公众号后台或 PRD 里的文字先放进 Zoon，让 Agent 贴着 Markdown 原稿改；审完后，再把结果带回你的发布或交付工具。</p>
      <p>第一阶段我们只承诺文本密集工作流：长文、内容稿、PRD、方案正文。图片排版、完整企业权限、私有部署和成熟团队后台，不是这一期的核心。</p>

      <h2>5. 一句话总结</h2>
      <p>如果你只是想让 AI 起草，聊天窗口够用；如果你想让 AI 精准改稿，Zoon 把人、Agent、评论、建议和来源放回同一份 Markdown 原稿里。</p>
    `,
  },
];

function renderLayout(args: { title: string; description: string; body: string }): string {
  return String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${args.title}</title>
  <meta name="description" content="${args.description}" />
  <meta property="og:title" content="${args.title}" />
  <meta property="og:description" content="${args.description}" />
  <meta property="og:type" content="article" />
  <link rel="icon" type="image/svg+xml" href="/zoon-favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" />
  <style>
    :root {
      color-scheme: light;
      --bg:#f4f0e7; --bg-deep:#ece4d0; --paper:#fcfaf2; --ink:#1a1913;
      --ink-soft:#2b2a22; --muted:#716c5f; --line:#d8cfb8;
      --accent:#4a5d3a; --accent-dark:#2f3d25; --human:#6fb892; --ai:#a991e3;
      --ff-display:'Fraunces','Iowan Old Style',Georgia,serif;
      --ff-body:'Plus Jakarta Sans',ui-sans-serif,system-ui,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
      --ff-mono:'JetBrains Mono',ui-monospace,Menlo,monospace;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
    body {
      margin: 0; background: var(--bg); color: var(--ink); font-family: var(--ff-body);
      line-height: 1.65; -webkit-font-smoothing: antialiased; overflow-x: hidden;
    }
    body::before {
      content:''; position:fixed; inset:0; pointer-events:none; z-index:-1;
      background-image:
        radial-gradient(circle at 12% 12%, rgba(111,184,146,.13), transparent 34%),
        radial-gradient(circle at 90% 36%, rgba(169,145,227,.12), transparent 38%);
    }
    a { color: inherit; text-decoration: none; }
    .wrap { width: min(100%, 1120px); margin: 0 auto; padding: 0 clamp(20px,5vw,40px); }
    .nav { height: 64px; border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent); background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 10; }
    .nav-inner { height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .logo { font-family: var(--ff-display); font-size: 27px; font-weight: 650; letter-spacing: -.02em; }
    .logo span { color: var(--accent); font-style: italic; }
    .nav-links { display: flex; gap: 18px; color: var(--muted); font-size: 14px; font-weight: 650; }
    .nav-links a:hover { color: var(--ink); }
    .hero { padding: clamp(56px,8vw,96px) 0 clamp(44px,6vw,72px); border-bottom: 1.5px solid var(--ink); }
    .eyebrow { display:flex; align-items:center; gap:10px; margin:0 0 18px; color:var(--accent-dark); font-family:var(--ff-mono); font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    .eyebrow::before { content:''; width:30px; height:2px; background:var(--accent); }
    h1 { max-width: 940px; margin:0 0 18px; font-family:var(--ff-display); font-size:clamp(40px,6.2vw,72px); line-height:1.02; letter-spacing:-.02em; }
    .lead { max-width: 760px; margin:0; color:var(--ink-soft); font-size:clamp(17px,1.7vw,21px); line-height:1.65; }
    .meta-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:24px; font-family:var(--ff-mono); font-size:12px; color:var(--muted); }
    .meta-row span { padding:5px 9px; border:1px solid var(--line); border-radius:999px; background:color-mix(in srgb, var(--paper) 72%, transparent); }
    .back { display:inline-flex; margin-bottom:28px; color:var(--muted); font-weight:700; }
    .post-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:18px; padding: clamp(44px,6vw,72px) 0; }
    .post-card { display:grid; gap:18px; padding:clamp(24px,4vw,38px); border:1.5px solid var(--ink); border-radius:18px; background:var(--paper); box-shadow:6px 6px 0 var(--accent); }
    .post-card h2 { margin:0; font-family:var(--ff-display); font-size:clamp(30px,4vw,48px); line-height:1.06; letter-spacing:-.02em; }
    .post-card p { margin:0; max-width:760px; color:var(--ink-soft); font-size:16px; }
    .btn { width:fit-content; display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:12px 16px; border:1.5px solid var(--ink); border-radius:10px; font-weight:800; background:var(--ink); color:var(--paper); box-shadow:4px 4px 0 var(--accent); }
    article.post { max-width: 820px; padding: clamp(44px,6vw,72px) 0; }
    article.post h2 { margin:44px 0 12px; font-family:var(--ff-display); font-size:clamp(28px,3.5vw,42px); line-height:1.08; letter-spacing:-.018em; }
    article.post p { margin:0 0 18px; color:var(--ink-soft); font-size:18px; line-height:1.78; }
    article.post ul { margin:12px 0 26px; padding:0; list-style:none; display:grid; gap:12px; }
    article.post li { display:grid; grid-template-columns:20px minmax(0,1fr); gap:10px; color:var(--ink-soft); font-size:17px; line-height:1.65; }
    article.post li::before { content:'✓'; color:var(--accent-dark); font-weight:900; }
    article.post li > span { min-width:0; }
    article.post strong { color:var(--ink); font-weight:800; }
    .note { margin-top:34px; padding:18px 20px; background:var(--paper); border:1.5px solid var(--ink); border-radius:14px; box-shadow:4px 4px 0 var(--ai); color:var(--ink-soft); }
    footer { border-top:1px solid var(--line); padding:34px 0 40px; color:var(--muted); font-family:var(--ff-mono); font-size:12px; }
    @media (max-width: 720px) {
      .nav-links { gap:12px; font-size:13px; }
      .nav-links a:nth-child(2) { display:none; }
      h1 { font-size:clamp(38px,11vw,56px); }
      .lead, article.post p { font-size:16px; }
      article.post li { font-size:15.5px; }
    }
  </style>
</head>
<body>
  <header class="nav">
    <div class="wrap nav-inner">
      <a class="logo" href="/">Zoon<span>.</span></a>
      <nav class="nav-links" aria-label="Blog navigation">
        <a href="/">首页</a>
        <a href="/#demo">演示</a>
        <a href="/#pricing">价格</a>
      </nav>
    </div>
  </header>
  ${args.body}
  <footer>
    <div class="wrap">© 2026 Zoon · Agent 进入稿件现场</div>
  </footer>
</body>
</html>`;
}

export function renderBlogIndex(): string {
  const posts = BLOG_POSTS.map((post) => String.raw`
    <article class="post-card">
      <div class="meta-row">
        <span>${post.category}</span>
        <span>${post.date}</span>
        <span>${post.readTime}</span>
      </div>
      <h2>${post.title}</h2>
      <p>${post.description}</p>
      <a class="btn" href="/blog/${post.slug}">阅读文章 →</a>
    </article>
  `).join('\n');

  return renderLayout({
    title: 'Zoon Blog - 把 Agent 协作讲清楚',
    description: 'Zoon Blog 用人话解释 Agent 改稿、Markdown 协作、CRDT 实时同步和团队审校工作流。',
    body: String.raw`
      <main>
        <section class="hero">
          <div class="wrap">
            <p class="eyebrow">Zoon Blog</p>
            <h1>把 Agent 协作，讲到能上手。</h1>
            <p class="lead">不堆术语。每篇文章只回答一个问题：Zoon 怎么减少复制粘贴、局部追问和多人合稿混乱。</p>
          </div>
        </section>
        <section class="wrap post-grid">
          ${posts}
        </section>
      </main>
    `,
  });
}

export function getBlogPost(slug: string): BlogPost | null {
  return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

export function renderBlogPost(slug: string): string | null {
  const post = getBlogPost(slug);
  if (!post) return null;

  return renderLayout({
    title: `${post.title} - Zoon Blog`,
    description: post.description,
    body: String.raw`
      <main>
        <section class="hero">
          <div class="wrap">
            <a class="back" href="/blog">← 返回 Blog</a>
            <p class="eyebrow">${post.category}</p>
            <h1>${post.title}</h1>
            <p class="lead">${post.description}</p>
            <div class="meta-row">
              <span>${post.date}</span>
              <span>${post.readTime}</span>
              <span>Yjs</span>
              <span>Hocuspocus</span>
              <span>CRDT</span>
            </div>
          </div>
        </section>
        <div class="wrap">
          <article class="post">
            ${post.contentHtml}
            <div class="note">想体验这套流程，可以回到首页免费创建一份文档：放入草稿，选中一句，让 Agent 在原文里改。</div>
          </article>
        </div>
      </main>
    `,
  });
}
