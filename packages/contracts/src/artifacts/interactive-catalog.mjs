// Interactive-component catalog shared by the agent (plain ESM) and the web
// app. One line per component — this is the stage-1 routing prior the tutor
// LLM sees, so keep descriptions to a single teaching-scene sentence. The web
// registry (apps/web/src/lib/interactive/components/registry.ts) owns the full
// config schemas; apps/web/tests/interactive-catalog-sync.spec.ts guards that
// both sides list exactly the same componentIds.

export const INTERACTIVE_COMPONENT_CATALOG = [
  { componentId: "physics.lens-imaging", name: "透镜成像", description: "凸/凹薄透镜成像:物距、焦距、三条特殊光线、实虚像与放大率" },
  { componentId: "general.timeline-causality", name: "因果时间线", description: "按时间排列事件,区分先后关系、直接因果与转折点" },
  { componentId: "humanities.source-comparison", name: "材料来源比较", description: "按出处、主张、证据互证与局限比较两到四份材料" },
  { componentId: "literature.close-reading", name: "文本细读", description: "引用短文本证据并解释措辞、意象、句法、结构或声音效果" },
  { componentId: "humanities.argument-map", name: "论证结构图", description: "围绕中心主张组织理由、证据、反对意见与回应关系" },
  { componentId: "chem.acid-base-titration", name: "强酸强碱滴定", description: "强酸强碱滴定曲线、等当点与指示剂变色区间" },
  { componentId: "physics.wave-superposition", name: "波的叠加", description: "两列简谐波及其合成波,振幅、频率和相位可调" },
  { componentId: "cs.sorting-steps", name: "排序分步", description: "逐步执行冒泡、选择或插入排序并显示比较与交换" },
  { componentId: "math.function-explorer", name: "函数变换探索", description: "探索 y=a·f(b(x-h))+k 的平移、伸缩与翻折" },
  { componentId: "math.angle-measure", name: "角度测量", description: "拖动射线或滑块观察角度、分类与量角器刻度" },
  { componentId: "general.process-sequence", name: "过程序列", description: "展示跨学科过程中的输入、变化、输出与反馈回路" },
  { componentId: "literature.narrative-arc", name: "叙事弧线", description: "把情节节点、叙事功能与张力变化放在同一条弧线上" },
  { componentId: "literature.character-relationships", name: "人物关系", description: "按叙事阶段查看人物目标、角色与关系变化" },
  { componentId: "language.sentence-structure", name: "句子结构", description: "比较语序、短语角色与依存关系,支持六种语言标记" },
  { componentId: "social.policy-tradeoff", name: "政策权衡", description: "并列政策选项、判断标准与利益相关者,不自动宣告赢家" },
  { componentId: "geography.climate-comparison", name: "气候特征比较", description: "比较两到三个地点的月度气温、降水与季节性" },
  { componentId: "arts.color-harmony", name: "色彩和声", description: "在色轮上探索互补、类似与三角色彩关系" },
  { componentId: "music.rhythm-pattern", name: "节奏型探索", description: "用拍号、细分、重音与休止构建并播放有限节奏型" },
  { componentId: "psychology.experiment-design", name: "实验设计", description: "用假设、变量、控制条件、分组和样本量构建受控研究" },
];

export const INTERACTIVE_COMPONENT_IDS = INTERACTIVE_COMPONENT_CATALOG.map((entry) => entry.componentId);

export function formatInteractiveCatalogLines() {
  return INTERACTIVE_COMPONENT_CATALOG
    .map((entry) => `- ${entry.componentId}(${entry.name}):${entry.description}`)
    .join("\n");
}
