# Zoon 编辑页纠偏迭代记录

> 状态：已进入实现与验证。
> 范围：只改 Zoon 编辑页面的布局工作台、评论/建议输入框、正文左侧颜色体系。
> 背景：上一轮把右侧目录理解成“常驻完整目录”，并把协作颜色说明放进历史文档栏。本轮按用户确认纠偏。

## 1. 本轮产品口径

1. 右侧目录不是常驻完整列表。
   - 需要保留“收起状态的标题缩略图”。
   - 标题缩略图不能有额外白色容器。
   - 鼠标滑到缩略图区域时，自动弹出目录浮层。

2. “人类 + Agent + 修改”的颜色体系不属于历史文档栏。
   - 历史文档栏只负责账号、搜索、历史文档卡片、删除/移除。
   - 颜色体系应回到正文文本区左侧，用颜色条表达来源和修改状态。

3. 评论/建议输入框不能是窄小浮窗。
   - 桌面端点击评论/建议后，输入框占当前编辑区域约 80%。
   - 输入框水平居中展示。
   - 移动端仍走原有底部 sheet，不把桌面大输入框强塞到窄屏。

## 2. 已处理的问题

### 2.1 右侧目录

改动文件：

- `src/ui/editor-navigation.ts`
- `src/index.html`
- `src/tests/editor-navigation-static.test.ts`

实现结果：

- 目录默认只显示右侧标题缩略条。
- 缩略条使用透明背景，不再出现白色额外容器。
- 鼠标进入缩略条或键盘 focus 时打开目录浮层。
- 鼠标离开后延迟收起，避免移动到浮层时闪断。
- 点击目录项后跳转到对应标题，并收起浮层。
- 正文区域不再为“常驻完整目录”额外预留右侧宽度。

后续注意：

- 不要把 `.editor-outline-panel` 改回 `position: static`，那会恢复成常驻完整目录。
- 不要把 `.editor-outline-toggle` 改回白底卡片样式，用户明确不要缩略图外再套白色容器。

### 2.2 正文左侧颜色条

改动文件：

- `src/ui/editor-document-sidebar.ts`
- `src/editor/plugins/heatmap-decorations.ts`
- `src/index.html`
- `src/tests/ai-human-collab-ui-static.test.ts`
- `src/tests/account-ui-static.test.ts`

实现结果：

- 删除历史文档栏中的“人类 / Agent / 修改”颜色图例。
- 正文左侧 `#provenance-gutter` 继续承担颜色识别。
- 左侧颜色条增加“修改”优先级：未处理的 `insert/delete/replace` 建议会按修改色显示。
- 普通来源仍按人类/Agent authored marks 计算。

后续注意：

- 历史文档栏不要再展示颜色图例。
- 如果未来要加颜色说明，建议放在正文颜色条附近或工具栏帮助入口，而不是历史文档区。

### 2.3 评论/建议输入框

改动文件：

- `src/editor/plugins/mark-popover.ts`
- `src/index.html`
- `src/tests/mobile-comment-ux.test.ts`

实现结果：

- 桌面端评论 composer 和建议 composer 使用 `.mark-popover-composer`。
- 定位时按当前编辑区计算宽度，目标宽度为编辑区 80%。
- 输入框水平居中，并继续根据选区上下空间决定显示在选区上方或下方。
- 普通评论线程、建议详情、人类/Agent 来源详情不会继承大输入框宽度。
- 移动端 `.mark-popover-sheet` 逻辑不变。

后续注意：

- `.mark-popover-composer` 只用于新建评论和新建建议，不要套到已存在评论线程详情上。
- 桌面定位需要同时考虑左侧历史栏宽度和右侧已打开的目录浮层。

## 3. 本轮验证点

必须验证：

1. 桌面端右侧只有标题缩略条常驻，hover 后出现目录浮层。
2. 标题缩略条没有白色额外容器。
3. 历史文档栏不再出现“人类 / Agent / 修改”图例。
4. 正文左侧颜色条仍可见，并能区分人类、Agent、修改状态。
5. 点击评论/建议后，桌面输入框约占编辑区 80%，水平居中。
6. 移动端历史栏仍为抽屉，评论/建议仍为底部 sheet。

## 4. 已知风险

1. 静态测试只能验证结构契约，不能证明真实 hover、宽度和颜色都符合肉眼预期。
2. 右侧目录浮层如果打开时过宽，可能影响普通小 popover 的右侧贴边定位；当前定位只在浮层打开时避让。
3. 正文颜色条依赖 marks 数据。如果测试文档没有 authored 或 suggestion marks，只会看到默认来源色，不能用空文档判断颜色体系是否失效。

## 5. 本轮过程问题记录

1. 浏览器插件无法直接验收本地页面。
   - 现象：打开 `http://127.0.0.1:4000/d/...` 时，插件页面变成 `This page crashed`。
   - 报错核心：Browser Use URL policy blocked the requested page。
   - 处理：改用本地 Playwright 做真实渲染验收。
   - 后续建议：本地 UI 验收如果遇到同类策略阻断，可以直接切到 Playwright，但要在最终说明里区分“Browser 插件失败”和“Playwright 真实页面通过”。

2. 首次访问的显示名称弹窗会挡住右侧目录 hover。
   - 现象：`.editor-outline-toggle` 已渲染，但鼠标移动到缩略条后目录浮层没有打开。
   - 真实原因：`promptForName()` 的遮罩层 z-index 为 `10000`，拦截了鼠标事件。
   - 处理：验收脚本预置 `localStorage.proof-share-viewer-name = 'Codex QA'` 后再打开文档。
   - 后续建议：自动化验证目录 hover 前，先确保显示名称弹窗已关闭，否则会误判为目录交互失败。

## 6. 本轮验证结果

1. `npm run test:account-ui`
2. `npm run test:ai-human-collab-ui`
3. `npm run test:mobile-comment-ux`
4. `npm run test:editor-navigation`
5. `npm test`
6. `npm run build`
7. Playwright 桌面渲染验收：
   - 右侧缩略条：5 个标题 tick，透明背景，`borderWidth=0px`，`boxShadow=none`。
   - hover 目录浮层：打开成功，5 个目录项，浮层宽度 184px。
   - 历史栏颜色图例：0 个。
   - 正文颜色条：宽度 6px，渲染 10 个 segment。
   - 评论输入框：832px / 1040px = 0.8，居中偏差 0。
   - 建议输入框：832px / 1040px = 0.8，居中偏差 0。
   - 发布建议后：正文左侧颜色条出现修改金色 `rgb(232, 201, 125)`。
   - 追加验证：hover 后再点击缩略条，目录仍保持打开，不会被 click toggle 误关。
8. Playwright 移动端烟测：
   - 390px 视口下右侧目录隐藏。
   - 历史文档入口为移动抽屉按钮。
   - 正文左侧颜色条隐藏。
   - 历史栏颜色图例仍为 0 个。
