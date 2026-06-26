# 2026-06-26 Comment Anchor Visibility

## 问题

用户在编辑页增加评论后，底部评论数量会增加，但正文里被评论的文本不够明显，用户难以感知“这条评论锚定在哪里”。截图里只看到其他标记样式，评论锚点没有形成 Proof 风格的黄色选区反馈。

## 产品目标

- 用户提交评论前，当前选区要保持可见。
- 用户提交评论后，被评论文本要有稳定、明显的黄色评论锚点。
- 刷新或从持久化 markdown 重新渲染后，`span[data-proof="comment"]` 也要可见。

## 实现

- `src/editor/plugins/marks.ts`
  - 加强 `comment` / `comment_active` / `compose_anchor` 样式。
  - 评论锚点使用暖黄色背景、金色下划线、内阴影和 `box-decoration-break: clone`，多行选区也能保持连续感。
  - 2026-06-26 17:30 线上回归发现：目标文档 markdown 中存在 3 个 `span[data-proof="comment"]`，但 `marks` metadata 中 comment 数量为 0。仅靠 metadata 生成 decoration 会导致正文评论锚点不可见。
  - 新增运行时兜底：扫描 ProseMirror 正文里的 `proofComment` inline mark。即使 comment metadata 暂时缺失，也给正文锚点补 `.mark-comment` 装饰；但仍不把它合成为空评论，避免污染评论列表或覆盖真实评论内容。
- `src/index.html`
  - 给 `.mark-comment` 和 `span[data-proof="comment"]` 增加同款静态 CSS，覆盖刷新后或 hydration 前的可见性。
- `src/tests/ai-human-collab-ui-static.test.ts`
  - 增加评论锚点可见性断言。
  - 增加运行时 fallback 断言，防止后续只改 CSS 而漏掉编辑器 decoration 路径。

## 验证记录

- `npm run test:ai-human-collab-ui`：通过。
- `npm run test:mobile-comment-ux`：通过。
- `npm run build`：通过。
- `npx tsx src/tests/marks.test.ts`：当前有 4 个既有失败，集中在 `applyRemoteMarks` 上下文锚点重定位；本轮新增的“缺 metadata 不生成空评论”保护仍通过。

## 交互说明

评论锚点不参与“人类/Agent 来源色条”判断；来源色条仍只表达是谁写的，评论黄色只表达“这里有讨论”。这能避免用户把评论颜色误解成作者身份。
