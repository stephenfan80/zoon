# 2026-06-26 Outline Panel Top And Hierarchy

## 问题

用户在编辑页右侧目录展开状态下看到两个问题：

- 目录浮层容器会顶到顶部功能栏区域，视觉上和 `Add agent / 分享 / 新建` 顶栏重叠。
- 目录列表里的标题层级不明显，一级、二级、三级标题看起来像同一层。

## 产品目标

- 目录浮层应该从顶部功能栏下方展开，不遮挡顶部操作区。
- 目录缩略条仍保留在正文右侧。
- 展开后的目录列表必须能快速扫出标题层级。
- active 标题仍保持清楚，但不能抹掉层级差异。

## 实现

- `src/index.html`
  - 新增 `--outline-nav-top: clamp(118px, 18vh, 176px)`，作为右侧目录缩略条和浮层的共享顶部安全区。
  - `.editor-outline-panel` 不再用 `top: 50% + translateY(-50%)` 垂直居中，改为 `top: 0; transform: none;`，从缩略条顶部展开，避免被推到顶部栏后面。
  - 浮层高度改为 `max-height: min(680px, calc(100vh - var(--outline-nav-top) - 24px))`，保证在视口内。
  - 目录项增加层级样式：
    - H1：更深色、更大字号、更粗字重。
    - H2：中等字重、缩进更深。
    - H3+：更弱颜色、更小字号、更深缩进。
    - 每个条目前增加轻量层级 marker。

- `src/ui/editor-navigation.ts`
  - 目录项增加 `aria-label="${level} 级标题：${text}"`，方便调试和读屏识别层级。

- `src/tests/editor-navigation-static.test.ts`
  - 锁定浮层不再垂直居中到顶部工具栏。
  - 锁定 H1/H2/H3 视觉层级差异。

## 验证记录

- `npm run test:editor-navigation`：通过。
- `npm run test:ai-human-collab-ui`：通过。
- `npm run build`：通过。
