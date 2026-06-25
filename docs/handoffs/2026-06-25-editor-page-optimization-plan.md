# Zoon 编辑页面优化方案

> 状态：已确认并已实现，等待部署验证。
> 基线：当前仓库 `main`，`package.json` 版本 `0.1.1`。
> 参考：Belinda 在 X 发布的 Sundial 编辑器视频（2026-06-24）。我已能读取到帖子元信息和视频封面，视觉上是白色文档编辑窗口、轻量顶部工具区、面向 Agent 协作的写作场景；本方案只吸收“白底文档编辑器 + 清爽工作台 + Agent 协作感”，不复制终端/视频里的其他产品结构。

## 1. 我对需求的理解

本次只优化 Zoon 的编辑页面，不碰首页、后端文档协议、Agent 能力、协同同步主链路。

目标是把当前偏品牌化、米色背景、顶部菜单入口较重的编辑页面，调整成更像文档编辑产品的工作台：

- 背景改白，正文默认字号改为 14px。
- 历史文档从顶部入口/菜单迁移到页面最左侧，成为常驻文档列表。
- 历史文档的排序、登录、账号文档/本机最近文档逻辑保持不变。
- 未登录时明确提示登录价值：登录后内容会跟账号绑定，其他设备也能看到。
- 左侧历史文档列表点击卡片后，右侧编辑区显示对应文档。
- 顶部去掉“我的文档”入口。
- 文档左侧来源颜色条继续保留，但视觉更窄、更克制。
- 文档里普通图片 URL 可以预览为图片，但 Markdown 内容仍保存为原始 URL。
- 目录从文档左侧迁到文档右侧，默认只显示标题缩略图，鼠标滑过缩略图区域时弹出目录浮层。

## 2. 需要你确认的产品口径

这些是我不会默默替你定死的地方：

1. 点击左侧文档卡片的切换方式

   推荐：当前标签页跳转到该文档的 `webUrl`，让右侧编辑区加载对应文档。这样最稳，因为当前协同、权限、token、slug、Yjs 会话都和 URL 绑定。

   不推荐第一期做“无刷新热切换”。那会绕过现有 shareClient/collab 初始化边界，风险明显更高。

2. 未登录时是否显示本机最近文档

   推荐：顶部显示登录提示，下面继续展示本机最近文档兜底。这样符合“登录逻辑不变”，也不让用户突然找不到本机打开过的文档。

3. 顶部更多菜单是否保留“最近文档”

   推荐：左侧栏上线后，顶部“我的文档”按钮删除，更多菜单里的“最近文档”也移除，避免历史入口重复。更多菜单保留“邀请 Agent”等非历史入口。

4. 图片 URL 预览范围

   推荐一期支持 `http/https` 的图片直链和常见图片 query（jpg/jpeg/png/webp/gif/avif/svg，以及 `?format=jpg` 这类）。不做远程 HEAD 探测，避免每次编辑都打外部网络请求。

5. 移动端左侧历史文档

   推荐：桌面常驻最左侧；窄屏折叠为一个“文档”按钮/抽屉，避免挤压正文。

## 3. 当前代码现状

### 3.1 编辑页样式集中在 `src/index.html`

当前默认背景不是白色，而是 `--bg-color: #fcfaf2`，默认字号是 `16px`，编辑容器也继承这个背景。关键位置：

- `src/index.html`：默认主题变量、背景、字号、编辑容器。
- `--bg-color` 当前是米色。
- `--font-size` 当前是 16px。
- `#editor-container` 当前是居中 `max-width: 1220px`。
- `#editor` 当前顶部/左右 padding 较大。

### 3.2 左侧颜色条是 provenance gutter

当前颜色条来自：

- `src/index.html` 的 `--provenance-bar-width: 6px`。
- `#provenance-gutter` fixed 定位。
- `src/editor/plugins/heatmap-decorations.ts` 负责把 marks 渲染成 gutter segments。

这说明“收窄颜色展示”优先改 CSS token，不需要动 marks 数据结构。

### 3.3 目录导航已经存在，但在左侧

当前目录逻辑来自 `src/ui/editor-navigation.ts`：

- `collectEditorOutline()` 从 ProseMirror heading node 生成目录。
- 标题数少于 4 个时不展示目录。
- 当前会记住展开状态到 `localStorage`。
- 点击目录项会选择并平滑滚动到对应标题。

当前样式在 `src/index.html`：

- `.editor-outline-nav` 位于左侧。
- `.editor-outline-toggle` hover 时显示“目录”文字。
- `.editor-outline-panel` 从左侧弹出。

所以这次不需要重建目录能力，只需要调整位置、默认形态和展开触发。

### 3.4 顶部“我的文档”入口和历史文档逻辑在 `src/editor/index.ts`

当前编辑页顶部 banner 会创建：

- 分享按钮
- 新建按钮
- `createAccountMenuButton()` 生成“我的文档/登录”
- 更多按钮

`createAccountMenuButton()` 里已经实现：

- 未登录打开登录/注册弹窗。
- 登录后加载 `loadAccountDocuments(50)`。
- 搜索标题。
- 按创建时间排序。
- 删除/移除。
- 本机最近文档兜底。

`createMoreMenuButton()` 里还有一个“最近文档”区块，使用 `loadRecentDocs()` 和 `loadAccountRecentDocs()`。

### 3.5 文档列表的数据能力在 `src/ui/recent-docs.ts`

可以直接复用：

- `loadRecentDocs()`：本机 localStorage 最近文档，按最新打开时间倒排。
- `recordRecentDoc()`：当前文档写入本机最近文档，并尝试记录账号访问。
- `loadAccountMe()`：读取当前账号。
- `loadAccountDocuments(50)`：读取账号文档库。
- `sortAccountDocumentsByCreatedAtDesc()`：账号文档按创建时间倒排。
- `filterAccountDocumentsByTitle()`：标题搜索。
- `deleteOwnedDocument()` / `removeAccountDocumentVisit()`：删除/移除。
- `loginAccount()` / `registerAccount()` / `logoutAccount()`：登录注册退出。

这正好满足“排序和登录逻辑不变”的约束。

## 4. 推荐的目标页面结构

桌面端结构：

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [最左侧历史文档栏] │              [白底文档编辑区]              │ [目录缩略] │
│  约 248-280px      │              正文 14px                     │  右侧常驻  │
│                    │              左侧细 provenance 色条        │  hover浮层 │
└──────────────────────────────────────────────────────────────────────────────┘
```

顶部保留轻量文档操作条，但去掉“我的文档”：

```text
文档标题 · 同步状态 · 协作者/Agent · 分享 · 新建 · 更多
```

左侧历史栏常驻，负责承接“我的文档/最近文档”的全部入口。

## 5. 交互方案

### 5.1 左侧历史文档栏

签入状态：

- 顶部显示“文档”和当前账号信息。
- 右侧或下方保留“退出”。
- 搜索框：沿用“搜索文档标题”。
- 排序说明：沿用“按创建时间排序”。
- 文档卡片展示：
  - 标题。
  - “我创建的文档”或“打开过的文档”。
  - 创建时间。
  - 当前文档 active 高亮。
  - 删除/移除操作保留，但视觉弱化，避免误触。

未登录状态：

- 顶部显示登录提示：

  `登录后内容会跟账号绑定，其他设备端也能看到。`

- 主按钮：登录。
- 次按钮：注册。
- 下方显示“本机最近文档”，继续复用 localStorage 兜底。
- 如果账号接口不可用，也显示本机最近文档，并提示“暂时显示本机最近文档”。

点击文档卡片：

- 推荐使用当前标签页跳转到卡片的 `webUrl`。
- 这样右侧编辑区会通过现有 share 初始化流程加载对应文档，保留权限、token、协同同步、最近访问记录。
- 当前文档卡片高亮，不重复跳转。

### 5.2 顶部入口清理

- 从 `renderShareBannerContent()` 中移除 `accountBtn`。
- 顶部不再出现“我的文档”。
- 推荐同时移除更多菜单里的“最近文档”区块，避免历史入口一边常驻、一边藏在菜单里。
- 更多菜单只保留“邀请 Agent”等非历史动作。

### 5.3 白色编辑区

样式方向：

- 编辑页背景统一为 `#fff`。
- 正文字号 `14px`。
- 行高建议保持 1.6 左右，中文和英文都更稳。
- 正文最大宽度建议收敛到 760-860px，不做过宽阅读行。
- 顶部 banner 继续悬浮，但视觉上更像文档工具条，不压正文。
- 不改变首页和营销页。

### 5.4 provenance 左侧颜色条收窄

目标：

- 保留“人/AI/混合来源”的识别能力。
- 从当前 6px 收窄到 3-4px。
- 颜色条靠近正文左侧，但不和正文贴太紧。
- 移动端继续隐藏，沿用当前策略。

建议改动：

- `--provenance-bar-width: 4px`（如想更克制可 3px）。
- 适当缩小 `--provenance-text-gap`。
- 确认 `heatmap-decorations.ts` 不覆盖 CSS left，保持现有 desktop CSS 驱动定位。

### 5.5 图片 URL 预览

产品定义：

- 用户输入/粘贴普通图片 URL。
- Markdown 保存结果仍是 URL 文本。
- 编辑器视图中在 URL 附近展示图片预览。
- 用户仍然可以选中、编辑、删除原 URL。

推荐实现：

- 新增一个 ProseMirror/Milkdown 插件，例如 `src/editor/plugins/image-url-preview.ts`。
- 插件扫描文本节点中的图片 URL。
- 对符合规则的 URL 在视图层插入 decoration widget。
- 不改 ProseMirror doc，不改 serializer，不把 URL 改成 `![](...)`。
- 跳过 code/code_block。
- 支持 `loading="lazy"`、`decoding="async"`、`referrerpolicy="no-referrer"`。
- 图片加载失败时显示低干扰的“图片无法预览”，但保留 URL。

安全边界：

- 只允许 `http:` / `https:`。
- 拒绝 `javascript:`、`data:`、`file:`。
- 不做后台抓取，不代理图片。
- 不主动 HEAD 探测，避免编辑时产生大量外部请求。

### 5.6 右侧目录：标题缩略图 + hover 浮层

保留当前目录数据来源：

- 继续使用 `collectEditorOutline(view.state.doc)`。
- 继续点击滚动到标题。
- 继续高亮当前阅读位置。
- 标题数少于 4 个时不展示目录，这个逻辑建议先保留。

交互改法：

- `.editor-outline-nav` 从左侧改到文档右侧。
- 默认状态展示一个细窄的“标题缩略图”轨道：
  - 不是文字按钮。
  - 展示若干条短横线/刻度，表示标题层级。
  - 当前标题刻度高亮。
- 鼠标 hover 或键盘 focus 到缩略图区域时，自动打开目录浮层。
- 鼠标移出浮层后延迟关闭，避免抖动。
- 点击缩略图也可固定打开，保证可访问性。
- Esc 关闭。

浮层位置：

- 在右侧缩略轨道左边弹出。
- 宽度建议 260-320px。
- 使用白底、浅边框、轻阴影。
- 标题层级缩进保持，但字号比当前 17px 更克制，建议 13-14px。

移动端：

- 继续底部浮动按钮/抽屉，不强行右侧常驻。

## 6. 实施拆解

### Phase 1：编辑页基础布局和视觉 token

改动范围：

- `src/index.html`
- 少量 `src/editor/index.ts` banner 定位样式

内容：

- 引入编辑页 shell：左侧历史栏、正文区、右侧目录区。
- 默认背景改白。
- 正文字号改 14px。
- 调整正文宽度和 padding。
- 收窄 provenance gutter。

验证：

- 桌面：白底、左栏在最左、正文不被压扁。
- 移动：不出现横向滚动。
- provenance 颜色条仍能显示。

### Phase 2：左侧历史文档栏

改动范围：

- 新增 `src/ui/editor-document-sidebar.ts`（推荐）
- 复用 `src/ui/recent-docs.ts`
- `src/editor/index.ts` 初始化/销毁 sidebar

内容：

- 抽出左侧文档列表 UI。
- 复用账号登录、注册、退出、加载账号文档、搜索、排序、删除/移除。
- 未登录显示登录提示 + 本机最近文档。
- 登录成功后刷新账号文档，并记录当前文档访问。
- 当前文档高亮。
- 卡片点击当前 tab 跳转到 `webUrl`。

验证：

- 未登录能看到登录提示。
- 登录后能看到账号文档。
- 排序仍是创建时间倒排。
- 删除/移除仍走原 helper。
- 点击卡片右侧显示对应文档。

### Phase 3：顶部入口清理

改动范围：

- `src/editor/index.ts`
- 相关静态测试

内容：

- 从 share banner 删除 `accountBtn`。
- 顶部不出现“我的文档”。
- 更多菜单移除“最近文档”区块（推荐，待确认）。
- 登录弹窗由左侧历史栏触发。

验证：

- 顶部没有“我的文档”按钮。
- 分享、新建、更多、Agent 入口仍正常。
- 现有账号测试更新为“账号入口在左侧栏”。

### Phase 4：右侧目录交互

改动范围：

- `src/ui/editor-navigation.ts`
- `src/index.html`
- `src/tests/editor-navigation-static.test.ts`

内容：

- 左侧 outline 改为右侧 outline。
- 用标题缩略轨道替换文字型“目录”按钮。
- hover/focus 打开浮层。
- 点击目录项后滚动到对应标题并关闭浮层。
- 保留外部点击、Esc、滚动边界保护。

验证：

- 4 个以上标题显示右侧缩略图。
- hover 出目录浮层。
- 当前标题高亮。
- 点击标题滚动准确。
- 移动端仍可用。

### Phase 5：图片 URL 预览

改动范围：

- 新增 `src/editor/plugins/image-url-preview.ts`
- `src/editor/index.ts` 注册插件
- 新增测试

内容：

- 扫描文本节点图片 URL。
- 创建 decoration preview。
- 跳过代码块和行内代码。
- 不改变 Markdown 序列化。

验证：

- 输入 `https://example.com/a.png` 显示图片预览。
- 序列化结果仍是原 URL。
- `javascript:` / `data:` 不展示。
- code block 内 URL 不展示。
- 图片加载失败有轻提示，不破坏编辑。

### Phase 6：验收与回归

建议跑：

- `npm run test:editor-navigation`
- `npm run test:account-ui`
- `npm run test:recent-docs`
- 新增 `test:image-url-preview`
- 必要时补 Playwright 视觉检查：
  - 桌面宽屏。
  - 13 寸宽度。
  - 移动宽度。

本次方案阶段我已跑过：

- `npm run test:editor-navigation`：通过。
- `npm run test:account-ui`：通过。
- `npm run test:recent-docs`：通过。

## 7. 验收标准

1. 页面视觉

- 编辑页背景是白色。
- 正文默认字号是 14px。
- 顶部没有“我的文档”入口。
- 历史文档栏位于页面最左侧。
- 左侧 provenance 颜色条明显变窄。

2. 历史文档

- 未登录时出现登录提示：

  `登录后内容会跟账号绑定，其他设备端也能看到。`

- 未登录仍能看到本机最近文档兜底。
- 登录后加载账号文档。
- 账号文档按创建时间倒排。
- 搜索标题可用。
- 删除/移除可用。
- 点击文档卡片后，右侧编辑区显示对应文档。

3. 图片 URL

- 普通图片 URL 能展示图片预览。
- Markdown 保存/同步内容仍是 URL，不被改写成图片 Markdown。
- 不安全 URL 不展示。
- 预览失败不影响编辑。

4. 目录

- 目录在文档右侧。
- 默认只展示标题缩略图。
- hover/focus 后自动弹出目录浮层。
- 点击目录项可以跳转到对应标题。
- 当前标题高亮。

5. 回归

- 现有协同编辑、分享、新建、Agent 邀请入口不受影响。
- 登录弹窗仍是顶层 modal，不塞回暗色下拉菜单。
- 移动端无横向溢出。

## 8. 不做的事

本次不做：

- 不重构 shareClient/collabClient。
- 不改变文档存储协议。
- 不改变账号/权限模型。
- 不做文档热切换。
- 不改首页、Blog、法律页。
- 不新增复杂主题系统。
- 不对外部图片做服务端代理。

## 9. 最大风险与规避

1. 左侧文档栏挤压正文

   规避：桌面使用固定宽度 + 正文 max-width；窄屏折叠。

2. 文档切换如果做热切换会影响协同状态

   规避：一期使用当前 tab URL 跳转，走现有完整初始化。

3. 图片 URL 预览造成内容被改写

   规避：只用 Decoration 视图层，不改 doc，不改 serializer。

4. 目录 hover 浮层抖动

   规避：hover/focus 双触发，移出延迟关闭，Esc 关闭。

5. 现有静态测试锁定左侧目录/顶部账号按钮

   规避：同步更新测试契约，让测试表达新的产品逻辑。

## 10. 等你确认的决策清单

请确认这 5 点后，我再开始代码开发：

1. 左侧文档卡片点击：是否同意用当前标签页跳转 `webUrl`，而不是无刷新热切换？
2. 未登录左侧栏：是否同意“登录提示 + 本机最近文档兜底”？
3. 顶部更多菜单：是否同意移除里面的“最近文档”，只保留非历史动作？
4. 图片 URL 预览：一期是否按图片直链/常见图片 query 识别，不做远程探测？
5. 移动端：是否同意左侧历史文档改为折叠抽屉？
