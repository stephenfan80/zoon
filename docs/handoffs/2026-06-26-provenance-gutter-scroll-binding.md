# 2026-06-26 Provenance Gutter Scroll Binding

## 问题

编辑页滚动时，正文左侧“人类 / Agent 来源颜色条”会跳动。用户反馈希望“颜色条与文本绑定”，而不是滚动时条形一直被重新追位。

## 根因

旧实现把 `#provenance-gutter` 放在 viewport fixed 坐标系里，再根据 `editorView.dom.getBoundingClientRect().top` 计算滚动偏移，并用 `translateY(...)` 推动内部色条。

这会让颜色条依赖实时视口位置。顶部工具栏、历史文档栏、浏览器滚动、视觉 viewport 变化或字体/图片重排时，参考点会变化，用户看到的就是颜色条上下跳。

## 产品目标

- 颜色条属于正文，不属于浏览器视口。
- 文本怎么滚，颜色条就跟着同一份文档流滚。
- 滚动时不重算、不 transform 追位。
- 只有文档内容或布局尺寸变化时才重算颜色条段落。

## 实现

- `src/index.html`
  - `#provenance-gutter` 从 `position: fixed` 改为 `position: absolute`。
  - 左侧位置改为 `left: var(--editor-side-padding)`，放在 `#editor-container` 内部。
  - 删除废弃的 `--provenance-gutter-left` / `--provenance-text-gap` 视口定位 token。

- `src/editor/plugins/heatmap-decorations.ts`
  - `calculateSegments(...)` 新增 `coordinateRoot`，以 gutter 所在编辑容器为坐标原点。
  - 移除 desktop 滚动轮询和 `translateY(...)` 滚动追位。
  - 使用 `ResizeObserver` 监听编辑器/容器尺寸变化，文本布局变了再重算。

- `src/tests/editor-navigation-static.test.ts`
  - 锁定颜色条必须锚定编辑容器。
  - 禁止恢复 `translateY(...)` 或 runtime `position: fixed`。

## 验证记录

- `npm run test:ai-human-collab-ui`：通过。
- `npm run test:editor-navigation`：通过。
- `npm run build`：通过。

## 后续注意

如果后续调整历史文档栏宽度、编辑容器宽度或右侧目录，不要再把颜色条移回 viewport fixed 坐标系。颜色条的心智是“每一段文字是谁写的”，因此必须跟正文容器绑定。
