# TODOS

小而清晰的清单，不适合开 issue 也还没到 PR 的事情堆在这里。按主题归组，解决了就删掉对应条目。

## Collab

### Comment popover draft snapshot 冗余化（PR #18 后遗留）

`src/editor/index.ts:2413` 的 `refreshCollabSessionAfterDocumentUpdated` 用
`captureCommentPopoverDraftSnapshot` / `restoreCommentPopoverDraftWithRetry`
包住 `refreshCollabSessionAndReconnect(false)`，原因是老 hard reconnect 会
重建 Y.Doc + 重 bindDoc，评论抽屉里正在打字的草稿被清掉。

PR #18 加了 soft-first 之后，`onDocumentUpdated` 触发的刷新 99% 走 soft path
（仅 token 续期），provider / Y.Doc / PM 绑定原地复用，抽屉里的草稿天然保留。
只有在 docId / slug / role / shareState / accessEpoch 真变化、fallback 到
hard path 时才需要这段 snapshot/restore。

**动作：** 把 snapshot/restore 下沉到 `refreshCollabSessionAndReconnect` 的
hard 分支（`resetShareMarksSyncState()` 之前抓、`reconnectWithSession` 之后
放），让 soft path 完全零额外开销。顺手删 `refreshCollabSessionAfterDocumentUpdated`
这层 wrapper，两个 callsite（`src/editor/index.ts:1551`、`:2728`）直接调
`refreshCollabSessionAndReconnect(false)`。

**优先级：** 低。不是 bug，只是 soft path 上的一次 dead work。等哪次再碰
collab 刷新路径时一起清。
