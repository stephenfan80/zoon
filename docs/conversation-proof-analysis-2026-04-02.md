# Proof SDK 项目深度分析 — 对话记录

**日期**：2026-04-02  
**工具**：Claude Code  
**项目**：Proof — 开源 AI-native 协作文档编辑器  
**源码**：https://github.com/danshipper/proof  
**参考**：https://x.com/danshipper/status/2031795800670683334

---

## 一、项目概览分析

### 结论

**Proof 是一个针对 AI 写作协作场景的基础设施工具**，定位不是"更好的 Notion"，而是"AI agent 的首选文档格式"。核心赌注：未来大量文档由 AI 生成，人需要一个原生支持 AI 协作的编辑器。

### 三个真正差异化的能力

**1. Provenance 追踪（出处轨迹）**

每段文字都带有元数据标记谁写的：左侧彩色 rail 是结构化数据——绿色=人类，紫色=AI。不只是 CSS 颜色，是完整数据模型。

**2. HTTP-first Agent 集成**

Agent 无需 WebSocket，用 HTTP 就能完全参与协作：
```http
GET  /documents/:slug/bridge/state
POST /documents/:slug/bridge/suggestions
POST /documents/:slug/bridge/presence
```

**3. 建议-审批工作流（Suggestion != Edit）**

AI 不直接改文档，而是发出 suggestion（带 quote + content），人看到后 Accept/Reject。代码里有完整的 `pending → accepted/rejected` 状态机。

---

## 二、技术架构

### 分层架构

```
proof-sdk/
├── packages/                    # 可复用核心包
│   ├── doc-core               # 文档和 Provenance 类型定义
│   ├── doc-editor             # 编辑器运行时和插件
│   ├── doc-server             # Express 路由
│   ├── doc-store-sqlite       # SQLite 持久化层
│   └── agent-bridge           # Agent HTTP 协议和客户端
├── src/                        # 运行时代码
│   ├── editor/                # ProseMirror + Milkdown 编辑器
│   ├── agent/                 # Orchestrator、Sub-agent、工具
│   ├── bridge/                # Agent HTTP bridge 实现
│   ├── formats/               # Marks、Provenance 序列化
│   └── ui/                    # React UI 组件
└── server/                    # Express 路由处理器
    ├── routes.ts              # 文档创建、编辑、共享
    ├── bridge.ts              # Agent bridge 路由
    ├── collab.ts              # YJS + Hocuspocus 协调
    ├── canonical-document.ts  # 规范文档状态机
    └── db.ts                  # SQLite 模式和查询
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 编辑器 | ProseMirror + Milkdown + YJS CRDT |
| 服务端 | Express 5 + Hocuspocus + SQLite |
| Agent API | HTTP Bridge（无需 WebSocket）|
| 内置 AI | Orchestrator（Claude Opus）+ Sub-agents（Claude Haiku）|

---

## 三、Provenance 追踪实现全链路

### 4 层架构

**第 1 层：数据存储 — `StoredMark` + `authored` kind**

所有出处信息统一用 Marks 数据模型表达：
```typescript
interface StoredMark {
  kind: 'authored';
  by: string;          // "human:alice" | "ai:claude" | "unknown:pasted"
  createdAt: string;
  quote?: string;      // 语义锚点（比位置偏移更稳定）
  range?: { from, to };
}
```

命名空间格式：`human:alice` / `ai:claude` / `unknown:pasted` / `system:proof`

**第 2 层：编辑器追踪 — ProseMirror Mark + Plugin**

Authored 信息以 inline HTML span 嵌入文档：
```html
<span data-proof="authored" data-by="human:alice">人类写的</span>
<span data-proof="authored" data-by="ai:claude">AI 写的</span>
```

`authored-tracker.ts` 插件监听三类事件：
- `handleTextInput`：每次键盘输入 → 记录 `{ from, to, by: actor }`
- `handlePaste`：粘贴内容 → 标记为 `unknown:pasted`
- `appendTransaction`：批量提交时，检查 `ai-authored` meta 决定是否追踪

关键：AI agent 写入时在 transaction 打 `ai-authored` 标记，追踪器看到就跳过。

**第 3 层：服务端同步 — `proof-authored-mark-sync.ts`**

每次文档保存时重新提取并同步：
- 遍历 ProseMirror 文档树，找所有 `proofAuthored` mark
- 用 `fingerprint = \`${by}::${quote}\`` 做去重
- 新增写 DB，消失的删 DB
- 用内容（quote）匹配而非位置（range），避免编辑漂移

**第 4 层：UI 渲染 — Heatmap Gutter**

颜色优先级：`flagged > comment > authored > 默认灰`

```typescript
// 按字符比例决定块颜色
const unmarked = blockTextLength - (human + ai + system);
ai += unmarked;  // 未标记默认算 AI（保守策略）
return ai >= human ? '#A5B4FC' : '#6EE7B7'; // 紫 vs 绿
```

性能：桌面端只有滚动时更新 CSS `transform: translateY()`，不触发 layout。

---

## 四、Marks 数据模型

### 统一系统 — 7 种 kind

```typescript
export type MarkKind =
  | 'authored'    // 出处追踪（自动维护）
  | 'comment'     // 评论/讨论线程
  | 'insert'      // 建议插入内容
  | 'delete'      // 建议删除内容
  | 'replace'     // 建议替换内容
  | 'approved'    // 已签署确认
  | 'flagged';    // 需要关注（最高优先级）
```

颜色系统（Soft Focus 调色板）：
```typescript
const KNOWN_COLORS = {
  human: '#6EE7B7',   // 薄荷绿
  ai: '#A5B4FC',      // 薄紫
  comment: '#FCD34D', // 软金
  flagged: '#FCA5A5', // 尘玫瑰
  approved: '#2DD4BF', // 青绿
};
```

### 每种 kind 的使用场景

| kind | 核心价值 | 典型场景 |
|------|----------|---------|
| `authored` | 永远知道责任人是谁 | 内容归属审计、声音追踪 |
| `comment` | 不打断文档流的异步讨论 | Agent 审查 + 人类回应；@mention 给 agent |
| `insert` | 建议"加东西"而不直接加 | Agent 补充遗漏章节、插入标准条款 |
| `delete` | 建议"删东西"而不直接删 | 冗余内容清理、合规删除 |
| `replace` | 最精确的内容改进建议 | 措辞优化、数据更新、翻译审校 |
| `approved` | 工作流里的关卡签署 | 多层审核流水线、逐条确认 |
| `flagged` | 强制引起注意 | 事实核查失败、合规风险、TODO 追踪 |

---

## 五、Human + Agent 协作实现

### 三层通道架构

```
Agent（HTTP 请求）
    ↓
服务端 Express（bridge.ts）
    ├─ 直接操作 DB（读状态、写 marks）
    └─ 转发到浏览器（WebSocket → browser）
         ↓
浏览器前端（ProseMirror/YJS 实时更新）
    ↓
用户看到的界面
```

### Agent 加入文档流程

无需建立长连接，每次 HTTP 请求即是一次"出现"：

```bash
# 1. 读文档状态
GET /api/agent/:slug/state

# 2. 宣告在线（可选，显示在 UI）
POST /api/agent/:slug/presence
Body: { "agentId": "ai:claude", "name": "Claude", "status": "reviewing" }

# 3. 开始操作
POST /documents/:slug/bridge/suggestions
```

用户点击 "Add agent" 按钮，会生成邀请文本复制到剪贴板，包含完整的 API URL 和 token，粘贴到 Claude Code 对话框即可让 AI 接入。

### Presence 机制

- 存储在 YJS 共享文档的 `agentPresence` Map
- **TTL = 60 秒**：agent 必须每隔 <60 秒 POST 一次 presence 才能持续"显示在线"
- Status：`active` / `reviewing` / `idle` / `disconnected`
- Agent 光标：通过伪造 YJS awareness 状态实现，视觉上和人类光标完全一样

### Bridge 路由权限

```typescript
// 不需要 token（任何人可调用）
GET  /bridge/state
POST /bridge/comments     // by + text + quote
POST /bridge/suggestions  // kind + quote + by + content
POST /bridge/rewrite

// 需要 bridge-token（所有者才能用）
POST /bridge/marks/accept
POST /bridge/marks/reject
POST /bridge/presence     // status
```

### 发建议的完整链路

```
Agent POST /bridge/suggestions { kind: "replace", quote: "旧文字", content: "新内容" }
    ↓ 服务端检查是否有活跃浏览器连接
    ├─ 有 → WS 转发：{ type: "bridge.request", method: "POST", path: "/marks/suggest-replace" }
    │        浏览器执行 → 插入 proofSuggestion mark → YJS 同步
    └─ 没有 → 直接写 DB（server-side marks）

用户看到：
  - 原文金黄色高亮
  - 右侧建议卡片（before/after 对比）
  - [Accept] [Reject] 按钮

Accept 后：
  - 原文替换为新内容
  - authored mark 更新为 ai:claude
  - Gutter 变紫色
```

---

## 六、内置 AI 三层架构

**Orchestrator（Claude Opus）**：把 skill prompt 拆解为 1-10 个 FocusArea，每个区域生成细致的 system prompt

**Sub-agent（Claude Haiku）**：接收 FocusArea，使用工具库执行：
- `read_document()` — 读全文
- `search()` — 正则搜索
- `get_marks()` — 检查现有注释
- `propose_change()` — 提议修改（**不直接应用**）

**Response Handler**：去重、冲突检测、预览、最终应用

关键：Sub-agent 只能 `propose_change`，不能直接修改文档，所有提议都需要人类 Accept/Reject。

---

## 七、市场定位

**不是 Notion 的竞品**：

| 维度 | Notion/Google Docs | Proof |
|------|-------------------|-------|
| 目标用户 | 人类写作者 | AI agent + 人类协作 |
| AI 接入 | 侧边栏/魔法棒 | 原生 HTTP API |
| 出处追踪 | 无 | 结构化数据 |
| 开放性 | 封闭 API | 开源 + 免登录 |

更准确的对比对象：GitHub（代码协作的基础设施）。Proof 的目标是成为**文档协作的基础设施**，尤其是 AI 驱动的工作流。

---

## 八、当前局限

1. **多 agent 并发冲突**仍然混乱——有冲突检测但没优雅的解决策略（直接 409 重试）
2. **SQLite 单机瓶颈**——生产大规模需要换 PostgreSQL
3. **NLP 库未用**——`wink-nlp` 已导入但没实际功能
4. **移动端 gutter 暂时隐藏**——长文档滚动性能问题未解决
5. **无 Dockerfile / CI**——需要自行搭建

---

*本文档由 Claude Code 根据对话内容整理，源码分析基于 proof-sdk 开源项目。*
