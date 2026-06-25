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

## 11. 第四次根治记录：编辑页工作台切换与来源色条

> 状态：本地实现完成，已通过本地真实浏览器工作台切换烟测；等待部署后线上真实路径复验。
> 背景：用户线上反馈第三轮后仍出现历史文档切换空白、整页刷新、账号自有文档误只读、正文左侧无真实颜色、顶部工具栏没有按右侧编辑区居中。

### 11.1 这次暴露的根因

产品现象：

1. 左侧历史文档点击后会刷新整个页面，右侧内容有时空白。
2. 切换到账号自己的文档后，顶部出现 `Read-only mode — changes will not be saved`。
3. 状态点长时间黄/红，用户不能确认“自己的文档正在正常保存”。
4. 正文左侧只有灰色底轨，看不到人类/Agent/修改来源。
5. 顶部功能栏视觉上按整个页面居中，而不是按右侧编辑工作区居中。
6. 第一次实现后，本地真实浏览器复现出一个更深问题：右侧内容能切换成功，但旧文档的异步请求/刷新链路晚返回后，仍可能把新文档状态覆盖成只读。

根因判断：

1. 历史文档卡片仍是普通 `<a href>`，没有工作台内切换生命周期。
2. 前端在协作同步前会先把编辑器清空；如果协作会话慢、失败或权限降级，右侧就会留白。
3. share context 依赖当前 URL 和旧 runtime config，clean URL 切换时存在旧 token / 旧 slug 串联风险。
4. 来源 marks 的锚点补水被 `collabCanEdit` 挡住，连接中或只读时来源显示也会被一起挡掉。
5. 完全没有 authored marks 的老文档只剩灰色底轨，用户会误认为颜色体系消失。
6. `initFromShare`、collab token refresh、pending event poll、marks refresh 都是异步链路；文档切换时如果旧请求晚回来，缺少“当前 slug / 当前 session”校验，就会把当前文档误判成权限失败或只读。

### 11.2 本轮修复

已处理：

1. 左侧历史文档点击改为工作台内切换：
   - 正常点击 `preventDefault()`。
   - 使用 `history.pushState` 更新地址栏。
   - 调用编辑器 `switchShareDocument()`，只更新右侧文档内容。
   - 保留 `href`，便于复制链接或特殊浏览器操作。

2. 文档切换增加完整生命周期：
   - 切换前 best-effort flush 当前文档。
   - 清理旧文档 WebSocket、协作会话、刷新定时器、只读横幅、权限状态。
   - 从目标 URL 重建 share context，避免旧 token/旧 slug 串到新文档。
   - 新文档先渲染 `open-context` 返回的正文和 marks，再连接协作。

3. 自有文档误只读的前端链路修复：
   - 正常阅读/评论型只读不再弹橙色 `Read-only mode` 横幅。
   - 可编辑文档连接中使用黄点，完成同步后应回到绿点。
   - 红点继续只留给权限失效、文档不可用、离线且有未保存风险。

4. 正文左侧颜色体系恢复：
   - 来源 marks 显示不再依赖 `collabCanEdit`。
   - 有真实 Agent / 人类 / 修改 marks 的文档继续按真实颜色显示。
   - 完全没有 authored marks 的老文档补一层 `human:legacy-owner` 显示基线，避免只看到灰色底轨；这不伪造 Agent 来源。

5. 顶部功能栏居中：
   - 从 `left + transform` 猜中心点，改成固定在右侧编辑工作区边界内，用 auto margin 居中。
   - 左侧历史栏展开、收起、改宽时，居中范围不再包含左侧栏。

6. 旧异步请求防污染：
   - `initFromShare` 记录启动时的 slug，`open-context`、文档内容、`collab-session` 每一步返回后都先校验仍是当前文档。
   - `refreshCollabSessionAndReconnect` 记录启动时的 session 和 slug；如果用户已经切到其他文档，晚返回结果直接丢弃。
   - pending event poll、document updated refresh、marks refresh 都绑定触发时的 slug，避免旧文档 401/403 或旧 marks 覆盖当前文档。

### 11.3 新增回归测试

新增：

- `src/tests/editor-workspace-document-switch-static.test.ts`

覆盖口径：

1. 历史文档普通点击必须走工作台切换，不能整页刷新。
2. 切换时必须更新 URL，但不能依赖浏览器 reload。
3. `ShareClient` 必须能从目标链接重建当前文档上下文，并清掉 stale token。
4. `open-context` 正文必须先渲染，再等待协作连接。
5. 来源 marks 显示不能被编辑权限挡住。
6. 工具栏必须在右侧编辑工作区内居中。
7. share 初始化和协作刷新必须包含 stale-guard，避免旧文档请求晚返回后污染当前文档。

同步更新：

- `src/tests/account-ui-static.test.ts`
- `src/tests/mobile-comment-ux.test.ts`
- `package.json` 总测试链路加入 `test:editor-workspace-switch`

### 11.4 本地验证结果

已通过：

1. `npm run test:editor-workspace-switch`
2. `npm run test:account-ui`
3. `npm run test:share-status-ui`
4. `npm run test:ai-human-collab-ui`
5. `npm run test:mobile-comment-ux`
6. `npm run test:account-library`
7. `npm run test:server-routes-share`
8. `npm run test:recent-docs`
9. `npm run test:editor-navigation`
10. `npm run build`
11. `npm test`

构建备注：

- Vite 仍提示 `web-haptics` 的 `"use client"` 被忽略，以及主 chunk 超过 500 kB。
- 这是既有构建提示，本轮没有新增构建失败。

真实浏览器烟测补充：

1. 启动方式：`PORT=4178 npm run serve`，基于最新 `npm run build` 产物。
2. 流程：注册临时账号 -> 创建 A/B 两篇本账号文档 -> 打开 A clean URL -> 点击左侧历史栏 B 卡片 -> 只更新右侧工作区。
3. 结果：
   - 当前路径从 A 变为 `/d/ncqkeu5t`，`performance.navigation` entries 仍为 1，页面内 marker 未丢失，证明没有整页刷新。
   - 编辑区只包含 B 内容，不再残留 A 内容。
   - `debugCollab()` 显示 `enabled=true`、`canEdit=true`、`canComment=true`、`connectionStatus=connected`、`isSynced=true`、`role=owner_bot`。
   - 顶部状态为绿点 `Saved`，没有 `Read-only mode — changes will not be saved`。
   - 正文左侧来源色条出现两种颜色：人类 `rgb(136, 194, 160)`、Agent `rgb(185, 165, 232)`。
   - 左侧栏宽 272px 时，顶部功能栏中心点和右侧编辑区中心点一致，偏差 0px。

### 11.5 线上复验必须看真实页面

上线后不要只看 `/health` 和 bundle 字符串，必须用浏览器路径验证：

1. 登录账号后打开一个账号自有文档。
2. 点击左侧历史文档中的另一个文档卡片。
3. 地址栏应变化，但页面不能整页刷新。
4. 右侧正文应更新为目标文档内容，不能空白。
5. 自有文档最终应可编辑，状态点从黄点连接态回到绿点。
6. 不应出现长期 `Read-only mode — changes will not be saved`。
7. 正文左侧应看到来源颜色条：有真实 Agent marks 显示 Agent 色；老文档至少显示人类基线色，不应只有灰色底轨。
8. 顶部功能栏应在右侧编辑区居中，不把左侧历史栏宽度算入居中范围。

### 11.6 线上复验结果

部署记录：

1. 代码修复提交：`5e4b50d fix(editor): switch account documents in workspace`。
2. Railway `/health` 已从旧 sha `0b214c7` 切到 `5e4b50d053d3d1f77d343f10c98ebacc57871e75`。
3. 部署切换期间出现过一次 SSL 抖动和一次 502，随后连续恢复正常；这是发布切实例时的瞬态，不是最终线上状态。

真实浏览器线上烟测：

1. 使用线上临时账号创建 A/B 两篇本账号文档，并在 `finally` 中删除测试文档。
2. 从 A clean URL 打开，点击左侧历史栏 B 卡片。
3. 验证结果：
   - 当前路径变为 `/d/x4twjxsk`。
   - `performance.navigation` entries 从 1 到 1，页面内 marker 未丢失，证明不是整页刷新。
   - 编辑区包含 B 内容，不包含 A 内容。
   - 输入 `线上最终绿点验证 ...` 后，内容可出现在编辑区，说明本账号文档可编辑。
   - 最终状态点为绿点：`Saved` / `rgb(52, 211, 153)`。
   - `debugCollab()`：`enabled=true`、`canEdit=true`、`canComment=true`、`connectionStatus=connected`、`isSynced=true`、`unsyncedChanges=0`、`pendingLocalUpdates=0`、`role=owner_bot`。
   - `Read-only mode — changes will not be saved` 未出现。
   - 正文左侧来源色条出现两种颜色：人类 `rgb(136, 194, 160)`、Agent `rgb(185, 165, 232)`。
   - 左侧栏宽 272px 时，顶部功能栏中心点和右侧编辑区中心点偏差约 `0.0078px`。

结论：这轮线上复验覆盖了用户反馈的 5 个关键问题；运行时代码满足“本账号历史文档工作台内切换、非只读、最终绿点、正文来源色条、顶部右侧工作区居中”。

## 12. 真实长文档线上回归失败后的根因修复

时间：2026-06-25 晚间

用户指定线上真实文档：

- `https://zoon.up.railway.app/d/8jcxyiw6`
- 文档标题：`播客转录：雨森创投观察第2集——Harness、下一个字节、2026大机会`

### 12.1 真实问题

这次不能再用短文档或临时文档代表线上效果。真实长文档暴露出 3 个核心偏差：

1. 正文几乎整篇变成浅绿色背景，用户要的是“左侧来源颜色条”，不是正文全文铺色。
2. 右侧目录缩略条仍然压在正文长句上，说明之前只给控件宽度让位不够，而且派生 padding 变量没有实际生效。
3. clean URL / 未登录匿名访问时，文档明明可编辑，却很快出现 `Read-only mode — changes will not be saved`。

### 12.2 根因

1. 作者来源 marks 有两层正文视觉：
   - `marks.ts` 的 ProseMirror decoration 给 `.mark-authored-human/.mark-authored-ai` 加了背景。
   - `index.html` 又给持久化的 `span[data-proof="authored"]` 加了背景。
   - 长文档有大量 authored spans，因此整篇正文被染色。

2. 目录安全区变量没有真正进入 `#editor`：
   - `body.editor-outline-visible` 只改了 `--editor-outline-reserve`。
   - `--editor-right-padding` 在 `:root` 上已按 `0px` reserve 派生，后续 body 改 reserve 时，实际 padding 仍是 92px。
   - 真实长句仍可排到目录缩略条下面。

3. 事件轮询误伤主文档权限：
   - clean URL 没有 share token，`/api/agent/:slug/events/pending` 可能返回 401。
   - 这个 pending event feed 只是跨实例刷新增强通道，不应决定文档是否可编辑。
   - 旧代码把 pending event 的 401/403 当成终止性文档访问失败，调用 `handleTerminalShareAccessFailure()`，主动断开协作并显示只读横幅。

### 12.3 修复口径

1. 正文 authored marks 保留交互和 metadata，但视觉保持透明：
   - 人类/Agent/修改的颜色体系继续放在正文左侧颜色条。
   - 正文不再用 authored 背景展示来源，避免长文档整片变绿/变紫。

2. 目录缩略条继续常驻 + hover 浮层，但正文右侧留真实安全区：
   - 新增 `--outline-nav-safe-gap: 112px`。
   - `body.editor-outline-visible` 同时重写 `--editor-outline-reserve` 和 `--editor-right-padding`。
   - 真实长文档下 `#editor` 右 padding 从 92px 变为 262px，正文右边界避开目录缩略条。

3. pending event feed 降级为增强能力：
   - 401/403：停止事件轮询，不影响主文档可读/可写状态。
   - 404/410：仍按真实文档不可用处理。
   - share runtime 启动/切换时清理旧 `isReadOnly` 和本地编辑门禁，避免旧文档状态带入新文档。

### 12.4 回归测试补充

更新测试：

1. `src/tests/share-status-dot-static.test.ts`
   - 锁定 pending event 401/403 不能进入终止性只读。
   - 只有 404/410 才允许从事件轮询终止分享页。

2. `src/tests/ai-human-collab-ui-static.test.ts`
   - 锁定 authored human / authored ai 正文样式为透明。
   - 防止再次把来源颜色铺到正文文本背景。

3. `src/tests/editor-navigation-static.test.ts`
   - 锁定目录缩略图安全区。
   - 锁定 outline-visible 状态必须同步更新实际 editor right padding token。

4. `src/tests/editor-workspace-document-switch-static.test.ts`
   - 锁定切换/激活分享运行时时清理旧只读状态。

### 12.5 本地真实长文档视觉验证

验证方式：

1. 启动本地 Vite：`npm run dev -- --host 127.0.0.1 --port 5173`。
2. 用带客户端版本头的线上 `open-context` 拉取 `8jcxyiw6` 真实长文档数据：
   - `X-Proof-Client-Version: 0.31.2`
   - `X-Proof-Client-Build: web`
   - `X-Proof-Client-Protocol: 3`
3. Playwright 打开本地新代码，注入 `/d/8jcxyiw6` 路径并调用 `window.proof.activateShareRuntime({ promptForName: false })`。
4. 将 `/api/agent/8jcxyiw6/events/pending` mock 成 401，验证它不再污染主编辑状态。

验证结果：

1. `debugCollab()`：
   - `label: Saved`
   - `enabled: true`
   - `canEdit: true`
   - `canComment: true`
   - `connectionStatus: connected`
   - `isSynced: true`
   - `role: editor`
2. `Read-only mode — changes will not be saved`：未出现。
3. authored spans：
   - `backgroundColor: rgba(0, 0, 0, 0)`
   - `borderBottomWidth: 0px`
4. 目录缩略条与正文文字相交数：
   - 修复前：`overlapCount = 4`
   - 修复后：`overlapCount = 0`
5. 目录安全区：
   - 修复后 `#editor padding-right = 262px`
   - `editorRightPadVar = calc(clamp(44px, 6vw, 92px) + calc(34px + 24px + 112px))`

### 12.6 验证命令

已通过：

1. `npm run test:share-status-ui`
2. `npm run test:ai-human-collab-ui`
3. `npm run test:editor-navigation`
4. `npm run test:editor-workspace-switch`
5. `npm test`
6. `npm run build`

构建备注：

- Vite 仍提示 `web-haptics` 的 `"use client"` 被忽略。
- Vite 仍提示主 chunk 超过 500 kB。
- 两者是既有提示，本轮没有新增构建失败。

### 12.7 后续 agent 注意事项

1. 验证 Zoon 编辑页不能只看短文档。必须至少用一个真实长文档验证正文宽度、目录缩略条、来源 marks。
2. 调线上 API 时必须带客户端版本头；裸 curl 会得到 `CLIENT_UPGRADE_REQUIRED / 426`，这不是文档权限问题。
3. `/api/agent/:slug/events/pending` 是增强刷新通道，不能把它的 401/403 当成主文档权限失效。
4. authored marks 的颜色展示位置是正文左侧来源色条，不是正文文字背景。

### 12.8 视频参考后的目录视觉二次校准

用户补充了右侧目录参考视频（2026-06-25 19:04 左右）。视频里的关键不是一个常驻白色容器，而是：

1. 默认态只出现轻量标题缩略条。
2. 缩略条不压正文文本。
3. hover 后出现较宽的目录浮层。
4. 浮层不需要额外“目录”标题行。
5. 当前标题用蓝色文字提示，而不是绿色块或黑色标题覆盖。

对应调整：

1. `--outline-aside-width` 从 `184px` 调整为 `320px`，让 hover 浮层接近视频中的宽目录。
2. `.editor-outline-panel-header` 保留 DOM hook，但视觉隐藏，避免多一行白色标题。
3. `.editor-outline-item[data-active="true"][data-level]` 追加高优先级蓝色样式，修复一级标题规则覆盖 active 蓝色的问题。
4. 继续保留 `--outline-nav-safe-gap: 112px` 和 `#editor padding-right = 262px` 的长文档安全区，避免默认缩略条遮挡正文。

本地长文档验证结果：

1. 验证文档：`/d/8jcxyiw6`，标题为 `播客转录：雨森创投观察第2集——Harness、下一个字节、2026大机会`。
2. 默认态：`overlapCount = 0`，目录缩略条没有压正文。
3. hover 态：浮层宽度 `320px`，header `display: none`，当前项颜色 `rgb(37, 99, 235)`。
4. 同一轮验证中 `debugCollab().derived.label = Saved`，绿点；`Read-only mode` 横幅未出现。
5. authored 正文背景为 `rgba(0, 0, 0, 0)`，来源颜色继续走正文左侧色条。

验证截图临时路径：

- `/tmp/zoon-local-long-doc-outline-hover.png`

已知本地验证噪音：

1. Vite 本地入口直接访问 `/d/:slug` 会代理到本地后端；未启动本地后端时会返回 500。因此本轮本地视觉验证采用 `/` 加 `history.replaceState('/d/8jcxyiw6')` 的方式激活前端。
2. 本地 Vite 仍会出现 Prism TSX 初始化报错；这不是本轮目录/只读/来源色条问题的触发条件。
3. mocked `/api/agent/8jcxyiw6/events/pending` 返回 401 是本轮回归点，用于证明事件增强通道失败不会再把主文档打成只读。
