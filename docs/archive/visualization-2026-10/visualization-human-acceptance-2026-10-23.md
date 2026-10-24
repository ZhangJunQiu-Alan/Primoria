# 人工验收与发布记录 · 2026-10-23

用户在本对话明确回复：“都通过吧 然后给我commit and push”。

据此记录本轮展示内容的人工验收通过，并授权提交、推送本轮相关代码与验收材料。未重新模拟用户逐项操作，也不伪造其逐项意见。

人工认可与工程事实分别保留：45项生产注册，另4项已交付待集成；固定20条真实模型实测最新16通过/4失败；参考清单1018案例/2296能力未冻结，正式verified映射0；全链路usage关联与完整性能测量仍待补证。人工认可不会改写这些原始记录。

提交包括本轮可视化平台、Agent B场景与盘点、模型分层调整、Supabase连接池修复、回归与离线验收材料。不包含本地密钥、实际环境文件、Next生成的next-env.d.ts或非验收临时日志。发布仅限Git提交与推送，不包含部署。

最终提交前检查结果以本轮实际执行日志和Git提交为准；此前45项回归结果仍保留为其原代码基线的历史证据。

## 提交前依赖修复

`pnpm audit:prod`首次发现7条high/critical公告，涉及Next.js、DOMPurify和follow-redirects。已将Next.js / eslint-config-next / bundle-analyzer统一到16.4.2，并固定DOMPurify最低3.4.17、follow-redirects最低1.16.1；修复后审计退出0，仅余2 moderate和1 low。

首轮回归的全部业务及回放断言通过，但最后next typegen与依赖安装重叠，整轮退出1，不计为通过；修复后的完整回归独立串行重跑，以最终日志为准。

移除Git对Next自动生成的`apps/web/next-env.d.ts`的追踪，保留本机文件并遵守已有ignore规则；typecheck仍负责生成该文件。原始来源快照及模型HTML证据保留字节与哈希，不为清除原文空白而修改；源码diff whitespace检查通过。

## 最终本地检查

修复后完整回归日志已执行至fast/build/db/browser全部层及最后typegen、隔离DB清理：Web927 passed、18 skipped；Agent单元/集成、1718路由、31KG、Catalog同步、生产构建/bundle、隔离Web/Agent DB、四条业务旅程、Widget沙箱及45组件×3宽度全部检查通过。

日志：`/tmp/primoria-publish-regression-fixed-20261023.log`。浏览器子进程结束时的143为测试主动SIGTERM清理，不是业务断言失败。新依赖审计见`/tmp/primoria-publish-audit-fixed-20261023.log`，无high/critical，保留2 moderate和1 low。

此处不将未集成4组件、参考全量覆盖或固定20条模型实测改记为工程通过。
