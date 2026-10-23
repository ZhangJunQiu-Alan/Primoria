# Visualization 接口约定 v1

状态：Agent A 已提出并按本约定实施。尚未收到 Agent B 的批次交接或确认；不得据此宣称全站组件已实现。

## 不变接口

- 保留现有 `componentId`、`ImplementedComponent`、完整 config/最小 patch 的 Zod Schema，以及 `WidgetRenderProps = { config, onChange }`。组件的注册版本来自活动 `catalog.v1.json` 的 `version`。
- Agent 只读紧凑语义目录，选择组件并传达用户原始请求；Web 生成与验证配置。完整 config 不进入主 Tutor/Agent 上下文。
- B 的组件模块继续导出 `xxxComponent`、完整/patch Schema 和计算函数；React 模块导出 `XxxWidget`。新组件交接提供精确路径及导出名，A 统一登记 registry 和 widget map。
- 可信组件的本地控件即时计算；自然语言调整走 Web。每个配置输出绑定 owner + instance ID + component ID + configVersion，不跨账号复用。调整生成新实例，保留原实例。

## Catalog 可选语义扩展

原字段保留，增加可选 `search` 对象：`aliases`、`concepts`、`stages`、`supports`、`excludes`、`referenceIds`，均为有界字符串数组，`stages` 使用实际学段文字或既有英文标记。现有中英文名称、描述、教学目标、标签和例句已参与检索；新条目应补充自然用户别名及不适用边界。

`catalog.v1.json` 仍由 B 独占条目写入。A 扩展 Schema 和生成程序，从该文件产生 `packages/contracts/src/artifacts/interactive-catalog.mjs`。生成物不手改；实施新组件后同时更新生产 registry/widget map，只有三处一致的 implemented 条目才通过验收。

## 课程与回放格式

课程新增 `engine: "interactive"`，payload key 为 `interactive`：

```json
{
  "componentId": "physics.lens-imaging",
  "configVersion": 1,
  "config": {"lensType":"convex","focalLength":10,"objectDistance":30,"objectHeight":8,"showRays":true}
}
```

课程 `title`、`description` 和原有教学元数据照常保存。未知组件/版本或非法 config 不回退成已通过的通用 HTML。旧 engines 保持可读，不批量改写历史数据。回放使用同一 payload 和生产 widget，不重新调用模型。

## 参考清单与覆盖约定

`reference-inventory.v1.json` 顶层：`schemaVersion: 1`、`snapshot: { startedAt, completedAt?, entryUrls, frozen }`、`cases`。每例：`referenceId`、`url`、`subject`、`stage`、`title`、`status: verified|unverified|blocked`、`capabilities: [{ capabilityId, description }]`、`evidence: string[]`。

`reference-coverage.v1.json` 顶层：`schemaVersion: 1`、`mappings`。每行：`referenceId`、`capabilityId`、`componentId`、`configVersion`、`status: verified|unverified|blocked`、`testIds: string[]`、`evidence: string[]`、`notes?`。一个能力对应多个组件时分别登记，能力覆盖计数不重复。未冻结/未完成盘点不显示全量通过。

B 可补充来源、控制/读数、公式和观察信息，不删除稳定 ID 和以上必需字段。涉及字段调整先更新此约定和校验测试。

## 批次交接

```text
reference IDs / capability IDs:
componentId / version:
module path / component export / config schema export:
widget path / widget export:
catalog entry:
default / changed / boundary / mode sample configs:
tests / evidence / known issues:
```

A 不直接编辑 B 的具体场景模块和 primitives；B 不编辑共享 contracts、types、registry、widget map、全局脚本和配置。未交接的新场景不标为已集成。
