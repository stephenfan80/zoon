export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readTime: string;
  heroImage?: string;
  heroAlt?: string;
  tags?: string[];
  contentHtml: string;
};

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'team-writing-workflow-agent-collaboration',
    title: 'AI 初稿之后，团队改稿为什么总是卡在复制粘贴里',
    description:
      '给公众号作者、内容编辑和产品经理看的协作故事：当主笔、编辑、业务同学和 Agent 都要改同一篇稿，Zoon 让修改回到原文旁边。',
    date: '2026-05-17',
    category: '团队协作',
    readTime: '7 min read',
    heroImage: '/assets/zoon-team-writing-workflow.jpg',
    heroAlt: '文字工作者团队围绕同一份 Markdown 稿件和 Agent 协作审稿',
    tags: ['公众号', '内容编辑', '团队审稿'],
    contentHtml: String.raw`
      <p>写稿团队现在最不缺的，是第一版。公众号标题可以让 AI 给十个，活动方案可以让 AI 先铺满，产品发布稿也能很快生成一版看起来完整的文字。</p>
      <p>真正慢下来的，是第一版之后。稿子已经有了，但还不能发。编辑觉得开头太像 AI，产品经理担心某句功能描述过度承诺，主笔想保留自己的语气，Agent 又在另一个聊天窗口里给出一整段新答案。</p>
      <p>看起来每个人都在协作，实际上每个人都在搬运：把原文复制出去，把建议复制回来，把评论截图给别人，再在最终稿里手动对齐。文字团队的损耗，往往不发生在写不出来，而发生在改不准、对不齐、找不到哪一句才是最终版本。</p>

      <h2>聊天窗口会回答，但它不知道稿件位置</h2>
      <p>对话式 AI 很适合起草。你给它一个主题，它能快速展开；你让它总结资料，它也能给出结构。但一旦进入团队改稿，聊天窗口的问题就变得明显：它能回答，却很难稳定地围绕原文里的某一句工作。</p>
      <p>你只想把一句“在信息爆炸的时代，我们很难保持真正的专注”改得更具体一点，它可能直接重写整段。你只想确认一小段产品描述是否准确，却要把上下文、前后段落、团队要求一起复制过去。AI 给完答案以后，最终还要由你判断哪一句能用，再粘回文档。</p>
      <p>如果只有一个人写一篇短文，这件事还能忍。但当一篇稿子需要主笔、编辑、业务同学和 Agent 一起参与，问题就不只是麻烦，而是协作位置错了。</p>

      <h2>一篇能发布的稿子，通常不是一次生成的</h2>
      <p>想象一篇周五要发的公众号文章。主笔先用 AI 做出初稿，编辑看完后说：“第二段太泛，像 AI 开场。”产品经理补了一句：“这里别说完整知识库，我们现在更准确的说法是 Markdown 改稿工作台。”运营又提醒：“标题可以更像读者会点开的表达。”</p>
      <p>这些意见都不是让 AI 重新写一篇。它们都是很小、很具体、很贴近原文的位置：这一句太空，那一段过度承诺，这个标题不够像人说话。</p>
      <p>可在旧流程里，每个小问题都会被迫变成一轮大对话。团队把一句话搬进聊天窗口，AI 回一段；再把另一句搬进去，AI 又回一段。几轮之后，原稿、评论、AI 建议和人工判断分散在不同地方，主笔最后做的不是审校，而是清理现场。</p>

      <h2>Zoon 把团队改稿带回原文旁边</h2>
      <p>Zoon 的出发点很简单：既然团队最终要交付的是同一份稿子，协作就应该发生在这份稿子里。</p>
      <p>在 Zoon 里，草稿是一份原生 Markdown 文档。主笔可以继续写正文，编辑可以在句子旁边留评论，产品经理可以标出不准确的功能表述，Agent 可以围绕被选中的内容做局部修改。它不是在旁边重新生成一篇，而是在原文现场补充、改写、建议和解释。</p>
      <p>这对文字工作很关键。你想改哪一句，就把 Agent 带到哪一句；你想保留哪一句，就在原文旁边审校；你不想动的段落，就保持不动。改稿终于有了落点。</p>

      <h2>人负责判断，Agent 负责把修改放回现场</h2>
      <p>好的团队稿件通常带着很多人的判断。编辑知道语气要不要收一点，产品经理知道边界能不能这样说，主笔知道这篇文章最终要像谁写的。Agent 可以给建议，但它不应该吞掉这些判断。</p>
      <p>Zoon 更像一个 AI 改稿现场，而不是一个替你决定最终稿的黑箱：</p>
      <ul>
        <li><span><strong>原文在同一页：</strong>团队知道这段原来怎么写，也知道为什么要改。</span></li>
        <li><span><strong>评论贴着句子：</strong>编辑和业务同学的判断不会散落在聊天记录里。</span></li>
        <li><span><strong>Agent 围绕位置工作：</strong>选中一句就改一句，其他内容保持不动。</span></li>
        <li><span><strong>最终由人审校：</strong>人决定保留哪句，Agent 负责把可选项放到原文旁边。</span></li>
      </ul>
      <p>这样一来，主笔不再是“把 AI 答案搬回文档的人”，而是重新回到真正重要的位置：判断这篇稿子应该留下什么。</p>

      <h2>这更适合哪类文字团队</h2>
      <p><strong>公众号作者和内容编辑：</strong>一周多篇稿、反复改开头、标题和表达时，Zoon 能减少“复制给 AI 再粘回来”的断裂。</p>
      <p><strong>产品经理和业务团队：</strong>写 PRD、发布说明、方案正文时，很多修改不是文采问题，而是事实、边界和承诺要准确。Zoon 让这些判断留在原文旁边。</p>
      <p><strong>小型内容团队和工作室：</strong>多人一起交付客户稿、脚本、活动方案时，Zoon 可以让编辑、主笔、产品同学和 Agent 在同一份 Markdown 原稿里协作。</p>

      <h2>Zoon 不想替代你的发布工具</h2>
      <p>你可以继续用飞书协同、用公众号后台发布、用 Notion 管项目。Zoon 解决的是中间最混乱的一段：AI 初稿已经有了，但团队还要把它改成能发布、能交付、能代表自己的稿子。</p>
      <p>这也是为什么 Zoon 先聚焦文本工作流。它不承诺这一期解决图片排版、SSO、私有部署或完整团队后台。它先把一件事做好：让人和 Agent 在同一份 Markdown 原稿里精准改稿。</p>

      <h2>最后，团队需要的不是更多答案</h2>
      <p>AI 已经能给很多答案了。文字团队真正缺的，是一个能承载判断的位置：哪里需要改，谁提出了意见，Agent 改了什么，最终为什么保留这一句。</p>
      <p>聊天窗口适合从零开始，Zoon 适合把已有稿件改到能发布。当一篇文章不只是“写出来”，而是要被团队一起审过、改过、确认过，它就不该继续散在一堆对话里。</p>
    `,
  },
  {
    slug: 'real-time-agent-collaboration-crdt',
    title: '真正能用的人和 Agent 实时协作：为什么 Zoon 不是另一个聊天窗口',
    description:
      'Zoon 用 Yjs CRDT + Hocuspocus 做实时协作，让多人和 Agent 在同一份 Markdown 文档里编辑、评论、建议，减少复制到 AI、再粘回文档的断裂。',
    date: '2026-05-15',
    category: '协作技术',
    readTime: '6 min read',
    tags: ['Yjs', 'Hocuspocus', 'CRDT'],
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

function renderLayout(args: { title: string; description: string; body: string; image?: string }): string {
  const ogImage = args.image
    ? (args.image.startsWith('http') ? args.image : `https://zoon.up.railway.app${args.image}`)
    : '';

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
  ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
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
    .post-card.with-image { grid-template-columns:minmax(0,1fr) minmax(280px,.72fr); align-items:center; gap:clamp(22px,4vw,42px); }
    .post-card-copy { min-width:0; }
    .post-card-media { margin:0; border:1.5px solid var(--ink); border-radius:14px; overflow:hidden; background:var(--bg); box-shadow:4px 4px 0 var(--ai); }
    .post-card-media img { display:block; width:100%; aspect-ratio:16/10; object-fit:cover; }
    .post-card h2 { margin:0; font-family:var(--ff-display); font-size:clamp(30px,4vw,48px); line-height:1.06; letter-spacing:-.02em; }
    .post-card p { margin:0; max-width:760px; color:var(--ink-soft); font-size:16px; }
    .btn { width:fit-content; display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:12px 16px; border:1.5px solid var(--ink); border-radius:10px; font-weight:800; background:var(--ink); color:var(--paper); box-shadow:4px 4px 0 var(--accent); }
    .post-hero-image { margin:clamp(28px,4vw,42px) 0 0; max-width:980px; border:1.5px solid var(--ink); border-radius:18px; overflow:hidden; background:var(--paper); box-shadow:7px 7px 0 var(--accent); }
    .post-hero-image img { display:block; width:100%; aspect-ratio:16/9; object-fit:cover; }
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
      .post-card.with-image { grid-template-columns:1fr; }
      .post-card-media { order:-1; }
      .post-hero-image { border-radius:14px; box-shadow:4px 4px 0 var(--accent); }
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
  const posts = BLOG_POSTS.map((post) => {
    const media = post.heroImage
      ? String.raw`<figure class="post-card-media"><img src="${post.heroImage}" alt="${post.heroAlt ?? post.title}" loading="lazy" /></figure>`
      : '';

    return String.raw`
    <article class="post-card${post.heroImage ? ' with-image' : ''}">
      <div class="post-card-copy">
        <div class="meta-row">
          <span>${post.category}</span>
          <span>${post.date}</span>
          <span>${post.readTime}</span>
        </div>
        <h2>${post.title}</h2>
        <p>${post.description}</p>
        <a class="btn" href="/blog/${post.slug}">阅读文章 →</a>
      </div>
      ${media}
    </article>
  `;
  }).join('\n');

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
  const tags = [post.date, post.readTime, ...(post.tags ?? [])];
  const meta = tags.map((tag) => `<span>${tag}</span>`).join('\n              ');
  const heroImage = post.heroImage
    ? String.raw`
            <figure class="post-hero-image">
              <img src="${post.heroImage}" alt="${post.heroAlt ?? post.title}" loading="eager" />
            </figure>`
    : '';

  return renderLayout({
    title: `${post.title} - Zoon Blog`,
    description: post.description,
    image: post.heroImage,
    body: String.raw`
      <main>
        <section class="hero">
          <div class="wrap">
            <a class="back" href="/blog">← 返回 Blog</a>
            <p class="eyebrow">${post.category}</p>
            <h1>${post.title}</h1>
            <p class="lead">${post.description}</p>
            <div class="meta-row">
              ${meta}
            </div>
            ${heroImage}
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
