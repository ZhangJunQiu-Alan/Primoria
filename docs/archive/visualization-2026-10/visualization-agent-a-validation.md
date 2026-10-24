# Agent A 平台验收记录 · 2026-10-22

平台、索引、聊天/课程接入及离线回放已实现；本记录不代表参考网站全量覆盖验收通过。原有未提交修改保留，未执行 commit、push 或部署。应用继续使用 Supabase。

## 可验收入口

- 当前本机地址：<http://127.0.0.1:4179/>
- 文件：`artifacts/visualization-acceptance/platform-baseline-20261022/index.html`
- 工程证据：同目录 `verification.json`，各日志的 SHA-256 见其 `evidence`。
- 原始固定输入：`apps/web/tests/fixtures/visualization-acceptance.baseline.v2.json`。

重启静态验收服务：

```bash
python3 -m http.server 4179 --bind 127.0.0.1 --directory artifacts/visualization-acceptance/platform-baseline-20261022
```

网页无需登录、数据库、模型调用或新 Prompt。真实20条回放与45项组件默认样例分开显示；控件可以离线操作。历史38项目录的模型实测不冒充45项目录的实测。

## 已实现

- Catalog 单源生成、版本/hash 校验、双语有界本地索引；超过40项时先给主模型学科目录，按需检索。
- Agent 保持只读选型信号；Web 生成/校验 config 或最小 patch。自然语言调整之外的滑块、拖拽及播放在组件内即时计算。
- 聊天配置按用户持久化，恢复先读后生成；请求幂等、乐观锁、失败预算释放和最后有效配置保护。
- 课程可信组件直接显示，课程规划读取有限模板能力与排除项；旧 HTML 等引擎、保存和不可变分享快照兼容。
- 组件懒加载，聊天、课程、gallery 和回放复用生产组件。
- 真实 Prompt 运行器保留输入、实际工具调用、config/patch、错误和所有重试；离线导出保留来源指纹与哈希。
- 实测修复 Supabase session pool 耗尽、SSE 中文乱码、iframe 初始 load 导致脚本丢失、截断 JSON 误取内部对象、课程 thinking 输出耗尽及进程退出后 Agent 遗留等问题。

## 工程检查

`pnpm test:regression` 退出0；完整日志封存在验收目录的 `reports/fullRegression.log`。

| 检查 | 实际结果 |
| --- | --- |
| Web 单元 | 901 passed，18 skipped；skip 不计通过 |
| Agent 单元/集成、Web/Agent typecheck、Web lint | 通过 |
| 永久学习目标路由、KG、Catalog/schema/registry 同步 | 1,718条、31图及同步检查通过 |
| 生产构建与 bundle budget | 通过；home 158.8 KiB gzip，course 284.5 KiB gzip |
| 隔离 Web/Agent DB | 通过；测试数据库清理完成 |
| 生产业务浏览器旅程 | 四条通过 |
| Widget 沙箱浏览器检查 | 通过 |
| 离线组件回放 | 45项 × 390/768/1440宽度通过，无生成API请求 |
| 后续检索归一化、进程退出、结构化writer针对性检查 | 21项通过 |

收尾再次执行 Web typecheck、根目录 lint 和 `git diff --check`，均退出0。当前 Supabase/Web/Agent health为ok；健康检查仍如实报告既有6条extractor失败任务警告，未清除其历史记录。

以上是本机环境的工程证据，不证明绝对无BUG、生产部署或所有教学模式均通过人工验收。

## 真实模型结果

固定20条已全部实际执行：12条新建、4条调整、4条课程；最新结果16通过、4未通过。输入未替换，失败和重试未删除。课程17与19均已实际生成、保存并在真实课程页导航到直接显示的可信组件。

| 案例 | 未通过原因 |
| --- | --- |
| viz-08 句子成分 | 输入没有提供句子，模型追问，未产生规定的可视化 |
| viz-10 住房补贴比较 | 定量预算模型超过可信模板能力；实际 HTML fallback 可离线查看，仍保留模板未命中失败 |
| viz-18 Ideal gases 课程 | 实际链路澄清，未调用预期课程/组件工具 |
| viz-20 函数变换课程 | KG 定位返回 fallback，未生成课程 |

另在当前45项目录做了两条独立真实链路检查：弱酸缓冲、二次方程均通过 `search_interactive_components` → `open_interactive_component`。仅两条额外检查，不计作另一组20条验收。

## 未满足的总任务门槛

参考清单当前发现1,018个候选案例、2,275个来源教学要点，尚未冻结；verified映射为0。因此不能认定参考网站全量覆盖、全量学科验收或20条全部成功。后续B批次仍需按接口交接再集成；009尚未包含在本记录45项中。

配置模型 usage 已捕获，但 Tutor/planner/worker 全链路关联尚不完整，不提供完整总token/费用结论。正式全量验收需要冻结来源清单、逐项建立有证据的能力映射并重新执行对应门槛。
