# Primoria 本地浏览器 QA 未解决问题清单

首轮测试：2026-07-09。最近复测：2026-07-10。

本文件只保留尚未解决、复测仍失败或需要继续确认的问题；已经修复且复测通过的项目不再记录。

## 当前问题

（无。2026-07-09 首轮清单的全部问题已修复或经复测关闭。）

---

## 已关闭项备注

- N-3 的 stale-pending 超时兜底已落地；长期的 job 表模型（lease/heartbeat）仍是后续可选演进，不算未解决缺陷。
- 问题 4 经 `Server-Timing` 打点实测关闭：goal 提交 handler ~15–20ms、后台定位 4–10s（外部 embedding/LLM，已是异步轮询）、background+同步建课 handler ~140–175ms——旧的 45s/90s 是 dev 首次编译产物，不改 `after()` 对称模式。打点保留在两个 route 上。
- N-5 已修复：`refreshedRef` 改为 fetch 成功后再标记，失败会在下一轮 jobs 轮询重试。
- 问题 8 已修复：Library 空状态在 onboarding 未完成时显示"继续入门设置"引导 CTA（`checkingBuilds` 分支优先级不变）。
- 问题 9 已实现：新课创建后 `after()` 里一次 best-effort LLM 调用批量改写 lesson 描述，fence UPDATE 防覆盖，失败保留模板；kill switch `PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1`。方案与落地记录见 `temple/outline-description-enrichment-plan.md`。

## 本地记录

测试账号、密码和截图路径见 `temple/local-browser-qa-2026-07-09.md`。
