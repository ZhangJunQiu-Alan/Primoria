# Primoria 本地浏览器 QA 未解决问题清单

首轮测试：2026-07-09。最近复测：2026-07-11。

本文件只保留尚未解决、复测仍失败或需要继续确认的问题；已经修复且复测通过的项目不再记录。

## 当前问题

### BQA-2026-07-11-01：Composer 图标按钮缺少可访问名称

严重程度：低。

主输入框右侧发送按钮、禁用态按钮以及左侧附件按钮在浏览器 accessibility/DOM snapshot 中显示为无名称的 `button`。视觉用户仍可通过图标完成操作，本轮坐标点击已验证消息能发送并收到回答；但屏幕阅读器和自动化测试无法稳定识别这些按钮的用途。

复现路径：

1. 打开 `http://localhost:3000`，进入 Messages 首页。
2. 查看输入框区域的 DOM/accessibility snapshot。
3. 观察输入框前后的图标按钮缺少 `aria-label` 或文本名称。

建议修复：给发送、停止、附件等 composer 图标按钮补充明确 `aria-label`，例如 `Send message`、`Stop response`、`Attach file`。

---

## 已关闭项备注

- N-3 的 stale-pending 超时兜底已落地；长期的 job 表模型（lease/heartbeat）仍是后续可选演进，不算未解决缺陷。
- 问题 4 经 `Server-Timing` 打点实测关闭：goal 提交 handler ~15–20ms、后台定位 4–10s（外部 embedding/LLM，已是异步轮询）、background+同步建课 handler ~140–175ms——旧的 45s/90s 是 dev 首次编译产物，不改 `after()` 对称模式。打点保留在两个 route 上。
- N-5 已修复：`refreshedRef` 改为 fetch 成功后再标记，失败会在下一轮 jobs 轮询重试。
- 问题 8 已修复：Library 空状态在 onboarding 未完成时显示"继续入门设置"引导 CTA（`checkingBuilds` 分支优先级不变）。
- 问题 9 已实现：新课创建后 `after()` 里一次 best-effort LLM 调用批量改写 lesson 描述，fence UPDATE 防覆盖，失败保留模板；kill switch `PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1`。方案与落地记录见 `temple/outline-description-enrichment-plan.md`。

## 本地记录

测试账号、密码和截图路径见 `temple/local-browser-qa-2026-07-09.md`。
