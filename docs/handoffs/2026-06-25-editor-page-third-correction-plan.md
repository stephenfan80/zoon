# Zoon 编辑页第三轮纠偏方案

> 状态：已确认并进入实现。本文先记录需求理解和方案，后续追加实现记录，方便其他 agent 接手。
> 日期：2026-06-25。
> 范围：只处理 Zoon 编辑页面的右侧目录、正文左侧来源颜色条、左侧历史文档切换后的编辑状态。
> 关系：本文覆盖 `2026-06-25-editor-page-correction-implementation.md` 中仍未达到用户预期的部分。

## 1. 本轮需求理解

这次不是继续加新功能，而是修正三个“工作台可用性”问题：

1. 右侧目录缩略图仍然需要保留。
   - 需要保留收起状态的标题缩略图。
   - 标题缩略图不能有额外白色容器。
   - 鼠标滑到标题缩略图位置时，继续弹出目录浮层。
   - 但缩略图必须在正文文本区右侧空白区域，不允许盖住标题或正文。

2. “人类 + Agent + 修改”的颜色体系要回到正文左侧色条。
   - 不是历史文档侧边栏里的图例。
   - 不是全灰色轨道。
   - 需要在正文文本左侧，按内容段落展示作者来源和修改状态。
   - 人类写、Agent 写、评论/建议/修改要有清楚区分。

3. 左侧历史文档切换后不能错误进入只读状态。
   - 用户在侧边栏切到其他文档后，顶部出现 `Read-only mode — changes will not be saved`，这是错误体验。
   - 同时顶部状态点变成红点，也会让用户误以为文档异常或无法保存。
   - 对用户拥有编辑权限的文档，应进入可编辑状态，并最终显示绿色同步状态。
   - 真正只有只读权限的共享文档，可以保留只读提示，但不能误伤账号内可编辑文档。

## 2. 当前代码阅读结论

### 2.1 右侧目录遮挡正文

已读文件：

- `src/index.html`
- `src/ui/editor-navigation.ts`
- `src/tests/editor-navigation-static.test.ts`

关键现状：

- 目录缩略图现在由 `.editor-outline-nav` 固定在右侧。
- `.editor-outline-toggle` 已经是透明缩略条，没有白色额外容器，这一方向是对的。
- 但 `body.editor-outline-visible` 仍把 `--editor-outline-reserve` 设为 `0px`。
- 正文右侧 padding 没有为缩略图预留安全区，所以长中文标题或长段落会延伸到缩略条下面。

产品结论：

- 问题不是目录形态错了，而是“正文可写区域”和“右侧目录缩略图区”没有边界。
- 不能把目录改成常驻完整目录，也不能给缩略图加白色盒子。
- 要给正文建立一个很窄的右侧安全区，让文本自动换行避开缩略图。

### 2.2 正文左侧颜色条只有灰色

已读文件：

- `src/editor/plugins/heatmap-decorations.ts`
- `src/editor/plugins/marks.ts`
- `src/formats/marks.ts`
- `src/index.html`

关键现状：

- 来源色条仍由 `#provenance-gutter` 渲染。
- 颜色源仍存在：人类 `#88c2a0`，Agent `#b9a5e8`，评论/修改为金色等。
- 当前色条逻辑会先按 `authored` mark 判断人类/Agent，再被评论、建议、修改状态覆盖。
- 如果当前文档没有命中 `authored` mark，或者 marks 在切换文档后没有被成功应用，色条会落到默认灰色。
- 当前渲染还会把段落之间、顶部、底部空白用相邻颜色填满，灰色默认值会变得很显眼。

产品结论：

- 不能把灰色当成“Agent 写”的替代色，也不能伪造来源。
- 需要先确认每个文档是否真的拿到了 authored marks；有数据就显示人类/Agent色，没有数据才保留未知灰。
- 色条应靠近正文文本左侧，且彩色段落优先级要高于默认灰色轨道。

### 2.3 侧边栏切换文档后进入只读

已读文件：

- `src/ui/editor-document-sidebar.ts`
- `src/ui/recent-docs.ts`
- `src/editor/index.ts`
- `src/bridge/share-client.ts`
- `server/routes.ts`
- `src/tests/account-library.test.ts`

关键现状：

- 侧边栏卡片点击仍是当前标签页跳转 `webUrl`，符合此前确认。
- 账号文档接口返回 clean `webUrl`，测试明确要求不能包含 `token=`，这是合理的安全约束。
- 编辑器只读提示来自 `showReadOnlyBanner()`。
- 只读提示会在访问失败、协同会话刷新失败、协同不可用等路径触发。
- 顶部红点不是单独的装饰问题，而是当前同步/协同状态被判断为不可用或断开。

产品结论：

- 这里不能只把红点改绿，也不能隐藏只读提示。
- 应先区分三种文档：
  - 当前账号拥有的文档：必须用登录会话或 owner 身份恢复编辑能力。
  - 当前账号打开过但不拥有的可编辑文档：如果有有效 token/cookie，应恢复可编辑能力。
  - 真正只读或权限失效文档：可以提示只读，但需要明确这是权限状态。
- 目标是“有权限就可写，没权限才只读”，而不是让 clean URL 天生变成只读。

## 3. 推荐优化方案

### 3.1 右侧目录：保留缩略图，但给正文让出安全区

推荐方案：

1. 保留当前目录结构：
   - 默认显示透明标题缩略图。
   - hover/focus 打开目录浮层。
   - 浮层仍从缩略图旁边展开。

2. 新增右侧安全区：
   - 当目录存在时，正文右侧预留约 `56px - 72px`。
   - 只预留缩略图安全宽度，不预留完整目录浮层宽度。
   - 这样不会大幅缩窄正文，也能保证长文本不会被缩略图遮挡。

3. 缩略图定位：
   - 桌面宽屏：放在正文内容右边界之外的空白处。
   - 桌面窄屏：贴近编辑工作区右侧，但仍由正文 padding 避开。
   - 移动端：继续隐藏右侧目录，避免挤压小屏正文。

4. 浮层行为：
   - hover 缩略图后弹出目录浮层。
   - 浮层可以覆盖右侧空白区，但不能覆盖用户正在阅读的正文主体。
   - 如果视口不足，浮层向内 clamp，优先保证不超出屏幕。

验收标准：

- 长中文标题不能被缩略图盖住。
- 长段落右侧不能穿到缩略图下面。
- 缩略图没有白色外框或白色容器。
- hover 后目录浮层正常出现，点击目录项仍能跳转。
- 不把目录改成常驻完整列表。

### 3.2 正文左侧颜色条：恢复真实来源，而不是灰色兜底

推荐方案：

1. 数据诊断先行：
   - 在本地用一个带 human authored、ai authored、suggestion/comment marks 的测试文档验证。
   - 确认 `getMarks()`、`resolveMarks()`、`applyRemoteMarks()` 是否能拿到并解析 authored marks。
   - 如果侧边栏切换后 marks 为空，要顺着 open-context / collab marks 同步路径查，而不是只改 CSS。

2. 渲染策略调整：
   - 默认灰色只表示“未知来源”，不能铺满整条轨道抢走注意力。
   - 人类 authored 段落显示绿色段。
   - Agent authored 段落显示紫色段。
   - 评论/建议/修改显示金色或对应修改色，并优先于作者色。
   - 无 marks 的段落可显示很弱的中性色，但不能让用户误以为颜色体系丢了。

3. 位置和宽度：
   - 色条必须绑定正文文本区左侧，而不是历史文档栏左侧。
   - 左侧历史栏展开、收起、拖宽时，色条跟随正文移动。
   - 宽度维持 `6px` 左右，重点是颜色可辨识和位置正确，不再盲目加粗。

4. 老文档兼容：
   - 如果文档里有 `data-proof="authored"` 或 stored marks，就迁移/应用到当前 marks。
   - 如果老文档确实没有任何作者来源数据，保留未知灰，不伪造人类或 Agent。

验收标准：

- 带 human authored 的段落左侧出现绿色段。
- 带 Agent authored 的段落左侧出现紫色段。
- 带建议/修改的段落左侧出现修改色。
- 未知来源可以灰，但不能所有内容都灰。
- 历史文档侧边栏里不出现颜色图例。

### 3.3 侧边栏切换文档：恢复正确编辑权限和同步状态

推荐方案：

1. 先定位只读触发路径：
   - 打开侧边栏文档后，记录 open-context 返回的 capabilities。
   - 记录 collab-session / collab-refresh 是否返回 canEdit。
   - 记录 `showReadOnlyBanner()` 是由 401/403、collab unavailable，还是 session refresh failure 触发。

2. 保持 clean webUrl 安全策略：
   - 账号文档列表继续返回不带 token 的 `webUrl`。
   - 不把 token 暴露到历史列表数据里。
   - 优先用登录会话、owner cookie、已有 share token cookie 恢复权限。

3. 对拥有者文档的处理：
   - 如果账号确认 `isOwned=true`，打开 clean URL 时应通过账号会话拿到 owner/editor 能力。
   - 前端不应因为 URL 没 token 就直接降级为只读。
   - 如果服务端没有给到 editor capability，要补服务端 open-context / collab-session 的账号拥有者识别。

4. 对打开过的共享文档：
   - 如果本机有历史 token/cookie，继续用它恢复对应权限。
   - 如果没有有效权限，才进入只读或访问失败状态。
   - 侧边栏可以在后续补充“只读/可编辑”状态提示，但本次不做大范围列表重设计。

5. 顶部状态点：
   - 绿色：可编辑且同步完成。
   - 黄色：连接中、同步中、保存中。
   - 红色：访问被撤销、文档不可用、离线且存在未保存风险。
   - 只读但正常可读的文档，不应该用红点制造故障感；应使用中性提示或明确权限文案。

验收标准：

- 从左侧历史文档切到账号拥有的文档后，不出现 `Read-only mode — changes will not be saved`。
- 同步完成后顶部状态点为绿色。
- 文档标题、正文、评论/建议操作和编辑能力符合权限。
- 真正无编辑权限的文档仍能明确显示只读，不伪装可写。

## 4. 开发顺序

确认后建议按以下顺序执行：

1. 右侧目录避让。
   - 修改最小，影响最直观。
   - 先保证缩略图不遮挡正文。

2. 颜色条真实恢复。
   - 先用测试文档验证 marks 数据。
   - 再修渲染和位置，不盲目改颜色。

3. 侧边栏切换权限。
   - 先抓实际触发只读的响应和状态。
   - 再修账号/owner 权限恢复链路。
   - 最后调整顶部状态点语义。

4. 回归验证。
   - 静态测试锁结构。
   - Playwright 验证截图同类场景。
   - 如果需要部署，部署后验证 Railway `/health` SHA 和真实编辑页路径。

## 5. 预计涉及文件

可能修改：

- `src/index.html`
  - 目录安全区、目录缩略图定位、来源色条位置与样式。

- `src/ui/editor-navigation.ts`
  - 目录缩略图/浮层的 open、close、clamp 行为。

- `src/editor/plugins/heatmap-decorations.ts`
  - 来源色条的颜色优先级、默认灰色策略、段落分段渲染。

- `src/editor/plugins/marks.ts`
  - 如发现 authored marks 没有正确解析或应用，再做最小修复。

- `src/editor/index.ts`
  - 只读 banner、协同能力、顶部状态点语义。

- `src/ui/editor-document-sidebar.ts`
  - 如需要在点击前做权限恢复或保留本机 token/cookie，只做很窄的辅助。

- `src/ui/recent-docs.ts`
  - 如需要为本机最近文档补充权限兜底，只做兼容层，不改变账号文档 clean URL 约束。

- `server/routes.ts`
  - 如果账号拥有者打开 clean URL 不能拿到 canEdit，需要修服务端 open-context / collab-session 的拥有者识别。

可能补充测试：

- `src/tests/editor-navigation-static.test.ts`
- `src/tests/ai-human-collab-ui-static.test.ts`
- `src/tests/account-ui-static.test.ts`
- `src/tests/account-library.test.ts`
- 必要时增加一个 Playwright 渲染检查脚本。

## 6. 风险与取舍

1. 右侧目录不能用“隐藏缩略图”解决。
   - 用户明确要保留缩略图和 hover 浮层。
   - 正确做法是让正文避开，而不是删除目录入口。

2. 颜色条不能靠伪造来源解决。
   - 如果真实文档缺少 authored 数据，强行染成 Agent 或人类会误导用户。
   - 正确做法是恢复 marks 读取和渲染；数据确实缺失时才显示未知灰。

3. 只读问题不能只改 UI 文案。
   - 如果用户拥有文档却被降级只读，这是权限链路问题。
   - 正确做法是让可编辑文档恢复可写，再让状态点反映真实同步状态。

4. clean webUrl 是既定安全约束。
   - 测试已经要求账号文档 webUrl 不含 token。
   - 方案不能回退成在账号列表里暴露 token。

## 7. 本轮确认点

请确认以下口径后再进入开发：

1. 右侧目录：保留透明标题缩略图 + hover 目录浮层，同时为正文预留窄安全区，避免遮挡。
2. 颜色体系：正文左侧色条恢复真实来源颜色；未知来源保留弱灰，不伪造人类/Agent。
3. 文档切换：账号拥有或有编辑权限的文档必须可写；真正只读文档才显示只读。
4. 顶部红点：不单独“涂绿”，而是修真实同步/权限状态，绿色只表示可编辑且同步完成。

## 8. 小红点状态语义迭代记录

> 状态：已完成实现与验证。
> 用户确认口径：红点只留给真正异常，连接中/同步中用黄点，正常只读用中性状态，有编辑权限的文档最终应变绿。

### 8.1 本次要解决的产品问题

顶部状态点此前把多种状态都压成红色：

- 协同暂不可用。
- 离线但没有未保存内容，正在重连。
- 正常只读/评论权限文档。
- 权限失效、文档不可用、离线且存在未保存风险。

这会造成两个误导：

1. 用户会把正常等待连接或正常只读理解成“文档坏了”。
2. 账号拥有的可编辑文档如果正在恢复权限，会先显示红点，体验上像保存失败。

### 8.2 本次实现口径

状态点语义改为：

- 绿色：可编辑，并且协同已连接、已同步、没有未保存内容。
- 黄色：连接中、同步中、保存中、协同降级、无未保存风险的离线重连。
- 中性灰：正常可读但不可编辑，例如只读或评论权限。
- 红色：权限失效、文档不可用、离线且存在未保存风险。

同时新增一条安全处理：

- 如果之前出现过只读横幅，但后续协同能力恢复为可编辑，要自动清掉只读横幅，避免“已经可写但顶部还提示只读”。

### 8.3 涉及文件

- `src/editor/index.ts`
  - 调整 `getShareSyncStatus()` 的状态分类。
  - 增加可编辑恢复时清理只读横幅的逻辑。

- `src/tests/share-status-dot-static.test.ts`
  - 锁定红/黄/灰/绿的产品语义。

- `package.json`
  - 把 `test:share-status-ui` 接入总测试。

### 8.4 后续验证点

1. 新建或打开拥有编辑权限的文档：
   - 初始化可短暂黄点。
   - 同步完成后应变绿点。
   - 不应长期红点。

2. 打开正常只读或仅评论权限文档：
   - 顶部状态点应是中性灰。
   - 不应以红点暗示异常。

3. 模拟离线但没有未保存内容：
   - 顶部状态点应是黄点。

4. 模拟离线且有未保存内容、权限撤销、文档取消共享：
   - 顶部状态点应保持红点。

### 8.5 本轮验证结果

已通过：

1. `npm run test:share-status-ui`
2. `npm run test:editor-navigation`
3. `npm run test:account-ui`

## 9. 第三轮纠偏实现记录

> 状态：已完成本轮实现与本地验证。
> 执行顺序：右侧目录避让 → 正文左侧颜色条 → 历史文档切换权限兜底 → 回归验证。

### 9.1 右侧目录避让

已处理：

- 保留透明标题缩略图和 hover 目录浮层。
- 当目录存在时，只给正文右侧增加缩略图安全区：`outline-nav-width + outline-aside-gap`。
- 不预留完整目录浮层宽度，避免正文被过度压窄。
- 移动端继续不展示右侧目录。

验收口径：

- 长标题和长段落不应进入右侧缩略图区域。
- 缩略图仍然没有白色外容器。
- hover 后目录浮层仍可弹出。

涉及文件：

- `src/index.html`
- `src/tests/editor-navigation-static.test.ts`

### 9.2 正文左侧来源颜色条

已处理：

- 去掉“未标记内容默认算 Agent 写”的逻辑，避免伪造来源。
- 去掉 block 级默认灰色回退，未知来源只保留很弱的底轨，不再铺成一整条灰色段。
- 人类、Agent、系统、评论/建议/修改仍走已有 marks 颜色体系。
- 彩色段只跟随真实 authored/comment/edit marks 命中的文本块渲染。

产品结论：

- 如果一个文档确实没有 authored marks，它不能被强行染成 Agent 或人类。
- 如果一个文档有 authored marks，左侧正文色条会显示绿色/紫色/修改色，而不是历史文档区图例。

涉及文件：

- `src/editor/plugins/heatmap-decorations.ts`
- `src/index.html`
- `src/tests/ai-human-collab-ui-static.test.ts`

### 9.3 历史文档切换后的编辑权限

已处理：

- `open-context` 原本已支持登录账号 owner 识别。
- 补齐 `collab-session` 路由，让它也复用同一套 owner / 登录会话 / share token 权限判断。
- 这样从 clean `webUrl` 打开账号拥有文档时，后续协同会话刷新不应把 owner 降级成普通访问。
- 增加账号文档测试：登录账号打开自己的 clean URL，必须保留 `canEdit=true` 和 `canComment=true`。

保留约束：

- 历史文档列表继续返回 clean `webUrl`，不把 token 暴露回列表。
- 真正只读或权限失效仍按只读/异常处理，不伪装成可写。

涉及文件：

- `server/routes.ts`
- `src/tests/account-library.test.ts`

### 9.4 本轮验证结果

已通过：

1. `npm run test:editor-navigation`
2. `npm run test:ai-human-collab-ui`
3. `npm run test:account-library`
4. `npm run test:share-status-ui`
5. `npm run test:account-ui`
6. `npm run test:server-routes-share`
7. `npm run build`
8. `git diff --check`
9. `npm test`

构建备注：

- Vite 仍提示 `web-haptics` 里的 `"use client"` 被忽略，以及主 chunk 超过 500 kB。这是现有构建警告，本轮没有新增构建失败。

### 9.5 本轮仍需线上观察的点

1. 真实历史文档如果本身没有 authored marks，只会显示弱灰底轨，不会伪造人类或 Agent 颜色。
2. 有 authored marks 的文档，应在正文左侧显示人类绿色、Agent 紫色、修改/建议色。
3. 从左侧历史文档切到账号拥有文档后，应先短暂黄点连接，完成同步后变绿，不应长期红点或保留只读横幅。

## 10. 部署验证记录

> 状态：已部署并完成线上验证。
> 版本：`package.json` `0.1.2`，Web client 默认版本 `0.31.2`。
> 代码提交：`c251f7511003d9d501819879e1dd47073c5c036e`。

### 10.1 部署前本地验证

已通过：

1. `npm test`
2. `npm run build`
3. `git diff --check`

构建备注：

- Vite 仍提示 `web-haptics` 里的 `"use client"` 被忽略，以及主 chunk 超过 500 kB。
- 这是既有构建提示，不是本轮新增失败。

### 10.2 线上验证

已确认：

1. Railway `/health` 从旧 SHA `ed671640405197c5dddfea4d1a0274ed7c7cdada` 切换到本轮 SHA。
2. `/health` 返回 `env=production`，`collab.enabled=true`，`wsUrlBase=wss://zoon.up.railway.app/ws`。
3. `/web-artifact-manifest.json` 返回 `bundleVersion=0.1.2`。
4. 首页 HTML 包含客户端兼容版本 `0.31.2`。
5. 线上 `assets/editor.js` 包含 `0.31.2`、`hideReadOnlyBanner`、`Comment-only`，说明小红点和只读横幅修复已进入线上 bundle。
6. 临时线上文档的 `open-context` 和 `collab-session` 均返回 `canEdit=true`、`canComment=true`、`syncProtocol=pm-yjs-v1`，临时文档已删除。
7. 使用浏览器 UA 访问临时 `/d/:slug`，编辑器 HTML 中包含目录安全区 CSS 和正文左侧色条底轨 CSS。

### 10.3 过程问题记录

本轮线上 HTML 烟测第一次使用了非浏览器请求头，服务端按产品设计返回 agent-friendly HTML，而不是浏览器编辑器壳，因此不能用它判断编辑器 CSS 是否上线。

后续验证编辑器页面时应使用以下任一方式：

1. 带浏览器 UA 和 HTML accept 头访问 `/d/:slug?token=...`。
2. 直接检查线上 `dist/index.html` 暴露出的编辑器 CSS。
3. 直接检查线上 `assets/editor.js` 中的关键客户端逻辑。

临时线上文档烟测要把删除逻辑放在 `finally`，避免中途断言失败时遗留测试文档。
