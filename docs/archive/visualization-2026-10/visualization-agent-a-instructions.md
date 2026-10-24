# Agent A 执行指令：平台、索引、集成与实测

状态：平台已实现并完成45项集成，继续按此责任边界推进；全量参考验收未完成。最新证据见 [Agent A交接](visualization-agent-a-handoff.md)。完整要求见 [总任务书](../../visualization-full-coverage-execution.md)。

## 任务

在 `/Users/zhangjunqiu/Documents/Project/Primoria` 实际编码，和 Agent B 同时推进。负责全量可视化库的运行基础、同源语义索引、真实 Tutor/课程接入、保存与兼容、20 条真实 Prompt 测试和无需重新输入的验收网页。不得将任务止于方案建议。

先遵守仓库 `AGENTS.md`，读取当前相关源文件和规范，保护现有脏工作树。应用保留 Supabase，保留现有模型配置；不 commit/push/deploy。不得再启动额外编码 Agent。

## 你的独占写入范围

- `packages/contracts/` 中本任务的共享协议、紧凑目录、只读索引及工具 Schema。
- `apps/agent/src/` 中必要的提示词、只读检索/现有交互工具和 graph 组合；保持 plain ESM，不引入 Web 依赖或产品 DB 写入。
- `apps/web/src/lib/interactive/` 的 configure、select、公共类型、registry 等平台文件；不修改 B 拥有的具体组件模块。
- `apps/web/src/components/generative-ui/interactive/index.tsx`、`interactive-component-card.tsx` 等入口；不修改 B 拥有的场景、primitives 和场景控件。
- 课程 VisualBlock 类型、生成/编译、持久化、block renderer、课程分享/导入兼容所需的最小改动。
- Catalog JSON Schema、生成/验证脚本、package scripts、必要 lockfile 和共享全局配置；活动 Catalog 条目由 B 写。
- 平台/契约/路由/保存/分享回归、20 条实测运行器、Prompt fixture、回放导出器及静态网页壳。
- 接口约定、运行规范、测试报告、集成回归和项目入口文档。

如路径不明确，先发给主 Agent 确认所有权；不要让确认阻止其他独立工作。

## 第一阶段必须完成

1. 记录已有修改、当前 19 组件和入口，明确本任务新增路径；不覆盖此前模型切换。
2. 提出并和 B 确认最小接口，写入 `docs/visualization-interface-contract.md`：稳定组件 ID、版本、config/patch、现有 widget props、课程分支、旧数据兼容、样例/导出/批次交接格式。
3. 沿用 Web-as-brain：Agent 选择组件和表达意图，Web 配置并校验。完整 config 不经 Agent 读写。
4. 在 B 盘点期间开始平台实现。先让一个旧组件和 B 首个新组件贯通普通对话、课程及回放，不等全库齐备才集成。

## 实现要求

- 活动 Catalog 是运行元数据的单一权威来源。扩展 Schema 后由 B 填写；你生成紧凑 Agent 目录、只读检索数据和一致性检查。
- 层级目录/有界检索支持全量库，避免把全库 Schema 塞进每次提示。优先静态本地检索，不新增外部向量数据库。
- 保留现有 `open_interactive_component` 生产信号。只读检索工具如需新增，从 contracts 定义，不能用 QA helper 代替主 Tutor。
- chat、course、gallery、replay 共用同一组件及计算模型。课程新增可信组件分支，旧 engines、旧 JSONB、旧分享快照仍可读取。
- 直接显示说明、场景和必要控件；不增加展开按钮，不显示内部实现 ID。正常对话保留原有输入框。
- 为调整、连续请求、版本冲突、取消、超时、失败和乱序响应建立明确处理。保留最后有效配置，避免重复生成和跨账号串用。
- 原生滑块、拖拽、播放和模式切换在可信组件中即时响应，不逐次请求模型；自然语言调整由 Web 配置模型处理，完整配置不回流主 Tutor/Agent。
- 分享继续使用不可变、已净化的快照；新增字段必须经过导出/导入校验。不得批量重写用户课程。
- 未实现组件不进入可调用集合。B 每批交付后再同步 registry、widget map、Catalog 和索引检查。
- 建立参考清单/覆盖映射校验，输出真实分母和未覆盖项，不手写 100%。
- 平台工作完成后向主 Agent 申请独立场景批次，按明确路径接手，不与 B 同文件编辑。

## 20 条真实测试与网页

严格执行总任务书固定分配：12 条 chat 新建、4 条复用已有输出的调整、4 条真实课程生成；长度 6/8/6，语言 14/4/2，学科/学段分层抽样。你生成随机种子和 Prompt，冻结预期后才调用真实模型；无需用户提供输入。

保存原始 Prompt、期望、真实说明、选型、验证 config/patch、模型、时间、请求链 ID、usage、延迟、错误及全部重试。失败不能被换题、删记录或模拟结果掩盖。真实生产链路与 deterministic/scripted 测试分开标记。

导出 `artifacts/visualization-acceptance/<run-id>/index.html` 及本地资源/证据包。页面加载捕获结果并使用生产组件，提供 20 案例回放、全库浏览、覆盖面板和工程报告。无需 API/DB/登录/密钥；没有 Prompt 输入框或重新生成入口。真实验证静态服务资源、控件和刷新，给出可点击地址及准确启动命令。

## 验证责任

负责公共契约同步、检索正反例、生产 Tutor 工具调用、课程生成/保存/分享/导入、旧数据、权限隔离、异常恢复、回放不调用生成 API，以及完整回归集成。

新增 Web 测试用原生 Vitest `.spec.ts`；Agent 用 ESM。保留 1,718 条永久路由语料及所有 gold policies。协调串行运行完整构建、typegen、DB/browser gate，避免与 B 争用环境。

最终运行总任务书的完整回归，在报告中保留命令、代码基线、退出状态和日志路径；不把 skip、guarded 或外部阻塞标为 pass。性能必须有环境和测量数据，资源按场景懒加载。

## 交接给主 Agent

每批报告：

```text
批次 / 完成能力：
修改路径 / 新增脚本：
接口版本 / 与 B 的依赖：
已集成组件及覆盖变化：
实际运行检查 / 结果 / 日志：
未解决问题 / 下一批：
```

完成后交付代码、可重复脚本、实测记录、网页绝对路径/URL、完整回归和缺陷清单。只有总任务书全部门槛满足后，才能建议主 Agent 报告完整通过。
