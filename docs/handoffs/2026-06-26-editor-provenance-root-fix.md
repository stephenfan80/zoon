# Zoon 编辑页来源颜色与布局容器根修复记录

日期：2026-06-26

## 本轮目标

把编辑页左侧来源条从“多状态颜色”收敛为“人类 / Agent 两类身份颜色”：

- 人类写入：绿色。
- Agent / AI / 系统默认模板：紫色。
- 不再让 suggestion、comment、flagged 等状态在左侧来源条上产生蓝色、金色、珊瑚色等额外颜色。

同时把历史文档栏和编辑工作区拆成独立容器，避免历史栏遮挡或影响正文来源条的显示区域。

## 根因判断

1. `heatmap-decorations.ts` 的来源条逻辑混合了两套语义：
   - authored marks 用来表达“谁写的”；
   - comment / suggestion / flagged 又用状态色覆盖来源色。

   结果是左侧来源条出现多余颜色，用户看到的不是“人类 vs Agent”，而是“状态色 + 来源色”的混杂体系。

2. 创建文档时，多个入口仍然传空 marks：
   - `/api/public/documents`
   - `/new`
   - `POST /documents`
   - `/share/markdown`

   默认模板和 Agent 推送内容没有在服务端落 authored marks，前端只能靠临时推断，导致新文档左侧没有稳定紫色来源条。

3. 编辑页历史栏和正文区之前通过 `#app padding-left` 粗略错位，历史栏和编辑容器不是清晰的兄弟工作区，后续再调整来源条/目录时容易互相遮挡。

## 本轮修改

1. 来源颜色规则：
   - `system` 颜色归并到 Agent 紫色。
   - `agent:` 前缀和 `ai:` 前缀都算 Agent。
   - 左侧来源条只通过 actor 身份取色：`human:` 为绿色，`ai:` / `agent:` / `system:` 为紫色。
   - suggestion / comment / flagged 不再给来源条引入第三种状态色。

2. 初始 authored marks：
   - 新增 `server/initial-authored-marks.ts`。
   - 用项目现有 Milkdown headless parser 解析 markdown。
   - 按真实 ProseMirror textblock 位置生成 block-level authored marks。
   - 如果请求已经带 authored marks，不覆盖。
   - 如果只有评论/建议等非 authored marks，会保留它们并补齐 authored marks。

3. 创建入口接入：
   - 公共首页默认文档：`ai:zoon-template`。
   - Agent push：`ai:agent-push`。
   - `/new`：`ai:zoon-template`。
   - API 创建：优先使用请求中的 agent 身份，否则 `ai:zoon-template`。

4. 布局容器：
   - `#document-sidebar-root` 和 `#editor-workspace` 成为 `#app` 下的兄弟容器。
   - `#editor-workspace` 用 `margin-left: var(--editor-workspace-left)` 承接历史栏宽度。
   - `#app` 不再承担历史栏宽度 padding。

## 验证重点

- 新文档默认模板应出现紫色来源条。
- Agent 推送的新内容应出现紫色来源条。
- 人类编辑内容应继续显示绿色来源条。
- 左侧来源条不应再出现蓝色 system 色、金色 suggestion 色、珊瑚色 flagged 色。
- 历史文档栏展开或收起时，编辑工作区和来源条不应被历史栏遮挡。

## 回归测试

新增：

- `npm run test:initial-authored-marks`

建议联动执行：

- `npm run test:ai-human-collab-ui`
- `npm run test:editor-navigation`
- `npm run build`

