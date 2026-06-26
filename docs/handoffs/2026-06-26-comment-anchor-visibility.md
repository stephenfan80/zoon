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
- `src/index.html`
  - 给 `.mark-comment` 和 `span[data-proof="comment"]` 增加同款静态 CSS，覆盖刷新后或 hydration 前的可见性。
- `src/tests/ai-human-collab-ui-static.test.ts`
  - 增加评论锚点可见性断言。

## 交互说明

评论锚点不参与“人类/Agent 来源色条”判断；来源色条仍只表达是谁写的，评论黄色只表达“这里有讨论”。这能避免用户把评论颜色误解成作者身份。
