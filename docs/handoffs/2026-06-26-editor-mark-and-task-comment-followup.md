# Zoon 编辑页标记与任务评论交互修复记录

日期：2026-06-26

## 本轮目标

这轮只解决“标记 / 评论 / 右键菜单”的交互边界，不改变“交给 Zoon”的执行模型。

- 普通点击正文，不弹出右侧“AI 写入 / 人类写入”来源框。
- 选区工具条里的“标记”成为独立阅读标记，不混入评论或建议。
- 独立标记使用红色波浪下划线，表达“需要重点阅读”，对人类内容和 Agent 内容都有效。
- 点击已标记文本时，只出现极简面板：取消标记 / 关闭。
- 右键“添加 @zoon 任务评论”和快捷键入口不再静默创建评论，而是打开评论框并预填 `@zoon 请看这里`。

## 产品边界

1. 来源标记和阅读标记分离：
   - 来源标记只回答“这段是谁写的”，主要服务左侧颜色条。
   - 阅读标记只回答“这段需要重点看”，不触发 Agent、不生成评论、不进入建议流程。

2. 任务评论和立即执行分离：
   - “添加 @zoon 任务评论”是可见、可编辑、可提交的评论任务。
   - “交给 Zoon”是否要立即执行，用户本轮尚未定稿，后续单独设计。

## 本轮修改

1. `src/editor/plugins/mark-popover.ts`
   - 普通桌面点击不再通过 pointerdown 打开来源框，避免点正文时右侧框误弹。
   - authored 来源标记不响应普通正文 click。
   - 新增 flagged 独立面板，只保留“取消标记 / 关闭”。
   - 评论输入框支持 `initialText`，给右键任务评论和快捷键复用。

2. `src/editor/plugins/marks.ts`
   - flagged 从原来的块状/背景式标识改为红色波浪下划线。
   - authored decoration 不再写入 `data-mark-id/data-mark-kind`，改用 `data-authored-by`，避免来源标记抢占评论/标记/建议的点击身份。
   - 取消 flagged 时，增加按当前正文 quote 重新定位的删除兜底，解决 authored 和 flagged 叠加后取消不干净的问题。

3. `src/ui/context-menu.ts`
   - “添加 @zoon 任务评论”改为打开评论框。
   - 默认预填 `@zoon 请看这里`，用户提交后才创建评论。

4. `src/editor/plugins/keybindings.ts`
   - 快捷键任务评论路径同步改为打开同一个预填评论框。

5. 静态测试补充：
   - `src/tests/ai-human-collab-ui-static.test.ts`
   - `src/tests/agent-command-branding-static.test.ts`

## 过程问题

1. 匿名名称提示会挡住 Playwright 点击，需要验证脚本里先处理“匿名继续”。
2. authored 和 flagged 重叠时，DOM decoration 会合并；如果 authored 也写 `data-mark-id`，会把 flagged 的点击身份覆盖掉。
3. 桌面 pointerdown 先开框，外部 pointerdown 又关框，随后 click 被去重吞掉，导致点击标记时表现不稳定；桌面改由 click 打开，touch 仍保留 pointerdown 路径。
4. 取消标记不能只依赖历史 range；正文经过 authored span 或协同同步后，必须按当前 quote 重新定位并删除内联标记。

## 验证结果

已通过：

- `npm run test:ai-human-collab-ui`
- `npm run test:agent-command-branding`
- `npm run build`

本地浏览器回放通过，验证内容：

- 普通正文点击不弹“AI 写入 / 人类写入”来源框。
- `window.proof.markFlag('需要标记的文本', 'human:qa')` 生成红色波浪下划线。
- 点击标记文本只出现“取消标记 / 关闭”。
- 点击“取消标记”后，DOM 中 `.mark-flagged` 消失，`window.proof.getAllMarks()` 中不再有 flagged mark。
- 右键“添加 @zoon 任务评论”会打开评论框，并预填 `@zoon 请看这里`。

未通过但非本轮新增：

- `npx tsc --noEmit`

失败原因仍是项目级历史类型债，包括：

- `server/*` 和 `packages/*` 被纳入 `src` rootDir 导致大量 `TS6059`。
- 多个旧测试存在重复声明、可空类型、旧类型签名不匹配。
- 这些错误不来自本轮新增的标记/评论交互改动。

## 后续建议

1. 如果下一轮要改“交给 Zoon”，先确定产品心智：
   - 是立即执行选区任务；
   - 还是继续作为可追踪评论任务；
   - 或者两者并存，但入口文案明确区分。

2. 建议新增正式 Playwright 用例，覆盖：
   - 普通 authored 正文点击不弹框。
   - selection toolbar 标记、取消标记。
   - 右键任务评论预填。

