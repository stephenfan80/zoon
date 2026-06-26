# Handoff: Zoon suggestion “确认替换”点击无反应

日期：2026-06-24  
项目：`/Users/stephenfan/个人项目/zoon`  
线上文档：`https://zoon.up.railway.app/d/frhq7rwh?token=dd5830ef-27a2-4fc9-a59b-1601c37b9935`

## 背景

用户在 Zoon 共享文档中查看 AI replace suggestion，点击底部弹窗里的“确认替换”后，页面没有任何可见反应。弹窗仍停留在原处，文档内容未替换，建议状态也未变更。

这不是金融文档内容问题，而是 Zoon suggestion accept 交互/同步链路问题。

## 复现步骤

1. 打开线上文档：
   `https://zoon.up.railway.app/d/frhq7rwh?token=dd5830ef-27a2-4fc9-a59b-1601c37b9935`
2. 点击第 2 部分“当前合作设想”中的 AI 替换建议。
3. 弹出底部确认面板，文案为“确认 AI 替换？”。
4. 点击“确认替换”。

预期：

- 建议被接受。
- 原文被替换为 AI 建议文本。
- suggestion mark 状态变成 `accepted`，或被移出 pending。
- 弹窗关闭；如果失败，应显示明确错误。

实际：

- 页面没有明显变化。
- 事件流里没有新增 `suggestion.accepted` / `marks.accept` 相关事件。
- snapshot 中 suggestion 仍是 `pending`。
- UI 没有错误提示，用户体感是“点了没反应”。

## 当前线上状态

用 API 查过，服务端不是只读恢复态：

```bash
curl -s "https://zoon.up.railway.app/documents/frhq7rwh/snapshot" \
  -H "Authorization: Bearer <token>" \
  -H "X-Agent-Id: Codex"
```

关键状态：

- `mutationReady: true`
- `repairPending: false`
- `projectionFresh: true`
- `/health` 返回正常
- 文档仍有 pending replace suggestion

事件流检查：

```bash
curl -s "https://zoon.up.railway.app/documents/frhq7rwh/events/pending?after=0&limit=200" \
  -H "Authorization: Bearer <token>" \
  -H "X-Agent-Id: Codex"
```

现有事件里能看到 `suggestion.replace.added`，但点击“确认替换”后没有对应 accept 事件。

## 相关 mark

第一个待接受建议示例：

- `markId`: `842113d8-7801-4b18-a4bd-833bcc9dbc4d`
- `kind`: `replace`
- `status`: `pending`
- `quote`: `一期不做完整金融审批，也不做多机构实时比价，先做效果验证。`
- `content`: `一期做同车系/车型下的多机构分期方案对比，但不做完整金融审批、授信和最终贷款承诺，先验证金融方案对比对留资和独号的提升。`

注意：不要直接在该线上文档接受真实建议来做破坏性验证，除非用户明确同意。建议新建测试文档或复制一份复现。

## 关键代码路径

### 前端弹窗

文件：`src/editor/plugins/mark-popover.ts`

重点函数：

- `renderSuggestion(mark: Mark)`
- `installTouchSafeButton(...)`

当前“确认替换”按钮逻辑大意：

```ts
installTouchSafeButton(applyButton, () => {
  if (!canEdit) return;
  const proof = getProofEditorApi();
  if (proof?.markAccept) {
    proof.markAccept(mark.id);
  } else {
    acceptSuggestion(this.view, mark.id);
  }
  this.close();
});
```

观察点：

- 如果 click handler 真执行，理论上会 `this.close()`。
- 用户截图里弹窗未关闭，可能是 click handler 没触发、`canEdit` 变成 false 后提前 return，或上层 overlay/touch-safe 逻辑吞掉事件。
- 即使 handler 执行并调用 `proof.markAccept`，当前也没有 loading / error UI。

### 前端 accept 实现

文件：`src/editor/index.ts`

重点函数：

- `markAccept(markId: string): boolean`
- `markReject(markId: string): boolean`

共享文档模式下，`markAccept` 会先检查本地 pending mark，然后异步调用：

```ts
shareClient.acceptSuggestion(markId, actor).then((result) => {
  if (!result || 'error' in result || result.success !== true) return;
  ...
}).catch((error) => {
  console.error('[markAccept] Failed to persist suggestion acceptance via share mutation:', error);
});
```

问题：

- `ShareRequestError` 被静默 return，没有展示给用户。
- `catch` 只打 `console.error`，没有 UI 反馈。
- `markAccept` 对外仍然是同步 boolean，弹窗层无法知道异步成功/失败。

### share client

文件：`src/bridge/share-client.ts`

重点函数：

- `acceptSuggestion(...)`
- `rejectSuggestion(...)`
- `performMarkMutationWithRetry(...)`
- `getMutationBase(...)`

`performMarkMutationWithRetry` 已包含对 `STALE_BASE`、`PROJECTION_STALE`、`MARK_NOT_HYDRATED`、`COLLAB_SYNC_FAILED` 等 transient error 的 retry 逻辑。需要确认失败是否最终返回 `ShareRequestError` 后被 UI 吞掉。

### 服务端

文件：

- `server/document-ops.ts`
- `server/document-engine.ts`
- `server/agent-routes.ts`

相关路由：

- `/documents/:slug/ops` with `type: suggestion.accept`
- `/api/agent/:slug/marks/accept`
- `/api/agent/:slug/marks/reject`

## 疑似根因

高概率不是服务端不可写，因为当前 snapshot 是 `mutationReady=true`。

更可能是前端体验链路问题：

1. 弹窗按钮点击没有成功触发，或被 `canEdit` / touch-safe / overlay 状态提前 return。
2. `proof.markAccept` 触发了异步请求，但失败被静默吞掉，用户没有任何反馈。
3. 本地 editor mark metadata 与服务端 marks 短暂不一致，`markAccept` 里的 pending 检查失败后返回 `false`，但弹窗不展示失败原因。
4. 接受建议失败时，当前 UI 没有“处理中 / 失败 / 重试”状态，导致用户只能看到“无反应”。

## 建议修复

优先做最小可用修复：

1. 在 `renderSuggestion` 的“确认替换 / 保留原文”按钮上增加 loading 状态：
   - 点击后按钮 disabled。
   - 文案改成“正在替换...”或“正在处理...”。
2. 不要在调用后立刻无条件关闭弹窗。
   - 成功后关闭。
   - 失败后保留弹窗并显示错误。
3. 让弹窗层能拿到异步结果：
   - 增加 `window.proof.markAcceptAsync(markId)` / `markRejectAsync(markId)`；或
   - 修改现有 `markAccept` 返回 Promise；或
   - 通过事件回调把 accept 成功/失败通知给 popover。
4. `markAccept` / `markReject` 遇到 `ShareRequestError` 时不要静默 return。
   - 至少显示 toast：`接受失败，请刷新后重试`
   - 对 `COLLAB_SYNC_FAILED` / `MARK_NOT_HYDRATED` 提示：`文档同步中，请稍后重试`
5. 如果本地 pending mark 检查失败，应提示“建议状态已变化，请刷新”，不要无声返回。

更稳的产品行为：

- 成功：弹窗关闭，建议高亮消失或变成 accepted 状态，内容更新。
- 失败：弹窗不关闭，按钮恢复可点，展示失败原因和“重试”。
- 网络慢：按钮 loading，避免用户多次点击。

## 验证清单

建议新建测试文档验证，不要直接改用户这份真实文档。

1. 创建一个包含 replace suggestion 的测试 doc。
2. 打开 human 页面，点击“确认替换”。
3. 验证：
   - 有 accept 请求发出。
   - 成功后服务端 marks 状态变为 accepted 或 pending mark 被正确处理。
   - 事件流出现 accept 事件。
   - 文档正文确实替换。
   - UI 弹窗关闭。
4. 模拟失败：
   - 使用错误 markId。
   - 制造 stale base / transient error。
   - 断网或让接口返回 404/503。
5. 验证失败时：
   - UI 有错误提示。
   - 按钮恢复可点击。
   - 不会让用户误以为已成功。

## 当前用户侧临时处理

告诉用户：

- 这不是操作问题。
- 刷新页面后可以再试一次。
- 如果仍无反应，需要修复 Zoon 的 suggestion accept 交互反馈。

