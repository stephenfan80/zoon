# 2026-06-26 Zoon Codex Browser Plugin Plan

## 背景

用户希望参考 Cowart，把 Zoon 和 Codex 连接起来，让 Zoon 文档能在 Codex 内置浏览器中打开并互动。

当前 Zoon 已经有 HTTP 协作协议和独立的 `zoon-codex-plugin` 仓库，但现有 skill 仍然把 Codex 浏览器交互描述为“手动右键打开”。这会让体验停在“复制链接”层面，没有形成 Cowart 那种“插件负责打开可视界面，协议负责稳定操作”的闭环。

## 产品目标

1. Codex 看到 Zoon 文档 URL 或创建 Zoon 文档后，可以优先通过插件 skill 打开 Codex 内置浏览器。
2. 浏览器只承担“可视化互动”职责，文档读取、写入、评论、建议仍然走 Zoon HTTP 协议。
3. 保留旧路径兜底：如果 Codex 浏览器工具链不可用，仍展示 URL 并提示用户右键打开。

## V1 范围

- 在 `zoon-codex-plugin` 中新增 `zoon-open-doc` skill。
- 更新插件 manifest，让默认提示覆盖“打开 Zoon 文档”。
- 更新 Zoon canonical skill：从“不要自动化浏览器 UI”改为“不要自动化编辑器 DOM 写入”，允许浏览器打开用于可视互动。
- 更新 agent invite：告诉 Codex 插件用户可用 `zoon-open-doc` 打开文档。
- 增加静态测试，锁定插件结构、skill 同步和浏览器打开边界。

## 暂不做

- 暂不增加 MCP 写入工具。
- 暂不做 `@codex` 任务事件桥。
- 暂不让浏览器 DOM 承担编辑写入。

## 验收标准

1. `docs/zoon-agent.skill.md` 明确说明：浏览器用于打开和人类互动，写入仍走 HTTP。
2. `zoon-codex-plugin` 里存在 `zoon-open-doc` skill，并包含 Codex Browser 打开流程。
3. 插件校验通过，且 bundled `zoon` skill 与 Zoon 主仓 canonical skill 保持一致。
4. Zoon 主仓相关 skill/invite 测试通过。

## 后续 V2

下一阶段可以增加 MCP 工具，把 `state`、`snapshot`、`edit/v2`、`ops`、`presence` 封装成 Codex 可直接调用的工具。这样用户既能在 Codex 浏览器里看文档，又能让 Codex 通过工具稳定写入。

## 执行记录

- 已在 Zoon 主仓创建分支：`codex/zoon-codex-browser-plugin`。
- 已更新 canonical skill：浏览器打开用于可视互动，写入仍走 HTTP。
- 已更新 agent invite：Codex + Zoon plugin 场景优先提示使用 `zoon-open-doc`。
- 已在 `zoon-codex-plugin` 仓库新增 `zoon-open-doc` skill，并同步 bundled `zoon` skill。

## 验证记录

- Zoon 主仓：`npm test` 通过。
- Zoon 主仓：`npm run build` 通过；仅保留既有 Vite chunk size / `web-haptics` module directive 警告。
- 插件仓：`npm test` 通过。
- 插件仓：`ZOON_SOURCE_ROOT=/Users/stephenfan/个人项目/zoon npm test` 通过，确认 bundled skill 与主仓 canonical skill 一致。
- Codex Browser 实测：用 `zoon-open-doc` skill 同款 Browser bootstrap 流程打开 `https://zoon.up.railway.app/d/8jcxyiw6` 成功，返回 URL 与目标一致。
