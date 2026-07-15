"use client";

import { useI18n } from "@/lib/i18n/client";

const interactiveDictionaries = {
  zh: {
    card: {
      unsupported: "暂不支持该互动组件，请换一种说法试试。",
      preparing: "正在为你准备互动组件…",
      generationFailed: "互动组件生成失败：{message}",
      configFailed: "配置生成失败",
      requestFailed: "请求失败",
    },
    common: {
      generatedContentNotice: "AI 生成的学习辅助内容；涉及史实、日期和材料主张时，请与课程原始来源交叉核验。",
      studentAnnotation: "我的标注",
      annotationPlaceholder: "记录你的判断、疑问或需要核验的地方…",
    },
    timeline: {
      aria: "因果时间线：{title}",
      subtitle: "选择事件，区分时间先后与直接因果",
      causes: "{count} 个原因",
      effects: "{count} 个后果",
      noLinks: "没有声明与该事件直接相连的因果关系。",
      ignoredLinks: "已忽略 {count} 条失效引用。",
    },
    sourceComparison: {
      title: "材料来源比较",
      aria: "材料来源比较",
      focusAria: "比较维度",
      provenance: "出处",
      claims: "主张",
      corroboration: "互证",
      limitations: "局限",
      provenanceLabel: "出处与语境",
      claimsLabel: "核心主张",
      corroborationLabel: "证据与互证",
      limitationsLabel: "局限与偏差",
      sourceNumber: "材料 {number}",
      evidencePrefix: "证据：{evidence}",
      currentFocus: "当前比较维度：{focus}。材料并列不等于它们同样可靠。",
    },
    widgets: {
      acidBaseTitle: "强酸强碱滴定 · 交互曲线", titrationAria: "滴定 pH 曲线", addedBaseAxis: "加入碱的体积 / mL", currentPh: "当前 pH", equivalencePoint: "等当点", region: "区域", acidExcess: "酸过量", baseExcess: "碱过量", addedBaseVolume: "加碱体积", acidConcentration: "酸浓度", acidVolume: "酸体积", baseConcentration: "碱浓度", indicator: "指示剂", phenolphthalein: "酚酞", methylOrange: "甲基橙", none: "无",
      angleTitle: "角度测量 · 拖动射线端点", angle: "角度", classification: "分类", showClassification: "显示分类", showProtractor: "显示量角器刻度", zeroAngle: "零角", acuteAngle: "锐角", rightAngle: "直角", obtuseAngle: "钝角", straightAngle: "平角",
      argumentTitle: "论证结构图", argumentSubtitle: "理由与证据不是同一层；反对意见也不等于反例已经成立", reason: "理由", evidence: "证据", objection: "反对意见", reply: "回应", supportChain: "支持链", challengeResponse: "质疑与回应", centralClaim: "中心主张", noNodeRelations: "没有有效关系连接到当前节点。", supports: "支持 {count}", challenges: "质疑 {count}", invalidRelations: "失效关系 {count}", supportsRelation: "支持", challengesRelation: "质疑",
      characterSuffix: "人物关系", characterAria: "{phase}阶段人物关系图", role: "角色", goal: "目标", ignoredRelationships: "忽略失效关系",
      climateTitle: "气候特征 · 月度比较", climateAria: "地点月度气温与降水比较", temperature: "温度", precipitation: "降水", meanTemperature: "年均温", temperatureRange: "年温差", annualPrecipitation: "年降水", hemisphere: "半球", northernHemisphere: "北半球", southernHemisphere: "南半球", comparisonFocus: "比较重点", precipitationSeasonality: "降水季节", continentality: "大陆性",
      closeReadingAria: "文本细读", closeReadingTitle: "文本细读 · 证据先于解释", closeReadingSubtitle: "点击高亮短语，查看“观察 → 效果”的推理链", closeReadingFocus: "细读维度", diction: "措辞", imagery: "意象", syntax: "句法", structure: "结构", voice: "声音", observation: "观察", effect: "产生的效果", noAnnotations: "当前维度没有标注。", ignoredAnnotations: "{count} 条标注引用未在原文中找到，已安全忽略。",
      colorTitle: "色彩和声 · 色轮关系", colorWheel: "色轮", harmony: "和声关系", complementary: "互补", analogous: "类似", triadic: "三角", baseHue: "基础色相", saturation: "饱和度", lightness: "明度",
      experimentTitle: "实验设计 · 因果链与控制", hypothesis: "假设", independentVariable: "自变量", dependentVariable: "因变量", sample: "样本", control: "控制", reminder: "提醒", noControlGroup: "未识别到明确对照组", totalSampleSize: "总样本量",
      functionTitle: "函数变换 · y = a·f(b(x-h)) + k", functionAria: "原函数与变换后函数图象", baseFunction: "母函数", verticalA: "纵向 a", horizontalB: "横向 b", horizontalH: "水平 h", verticalK: "垂直 k", showBaseFunction: "显示母函数虚线",
      narrativeSuffix: "叙事弧线", narrativeAria: "叙事张力曲线", tension: "张力", narrativeModel: "叙事模型", fivePart: "五段式", threeAct: "三幕式", episodic: "章节式",
      policyTitle: "政策权衡 · 多视角比较", stakeholders: "利益相关者", principle: "原则", policyPrinciple: "权重帮助提问，不自动判定赢家",
      step: "步骤", input: "输入", change: "变化", output: "输出", feedback: "反馈", ignoredFeedback: "忽略失效反馈",
      rhythmTitle: "节奏型 · 构建与播放", accentBeat: "重音", hitBeat: "击拍", restBeat: "休止", play: "播放", stop: "停止", stepsPerMeasure: "每小节", duration: "时长", soundedSteps: "发声步", timeSignature: "拍号", subdivision: "细分", quarter: "四分", eighth: "八分", sixteenth: "十六分", tempo: "速度",
      sentenceTitle: "句子结构 · 语序与依存", dependsOn: "依存于 → {id}", syntaxRoot: "句法根", observationLevel: "观察层级", clause: "分句", phrase: "短语", wordOrder: "语序", dependency: "依存", language: "语言", invalidDependency: "失效依存",
      sortingTitle: "排序算法 · 分步执行", previousStep: "上一步", nextStep: "下一步", comparison: "比较", movesSwaps: "移动/交换", algorithm: "算法", bubble: "冒泡", selection: "选择", insertion: "插入",
      waveTitle: "波的叠加 · 动态观察", waveAria: "两列简谐波和合成波", pause: "暂停", superposition: "叠加关系", constructive: "相长", destructive: "相消", mixed: "混合", beatFrequency: "拍频", showComponents: "显示分波", amplitude1: "振幅 A₁", amplitude2: "振幅 A₂", frequency1: "频率 f₁", frequency2: "频率 f₂", phaseDifference: "相位差",
      lensTitle: "透镜成像 · 交互演示", lensAria: "透镜成像光路图", object: "物", image: "像", distantImage: "像（很远）", rayLegend: "━ 平行光线（橙）/ 过光心（蓝）/ 过焦点（紫）；虚线 = 虚像反向延长", objectDistance: "物距", focalLength: "焦距", imageDistance: "像距", magnification: "放大率", noImageAtFocus: "u = f：折射光平行射出，不成像", realInverted: "实像 · 倒立", virtualUpright: "虚像 · 正立", enlarged: "放大", reduced: "缩小", sameSize: "等大", objectHeight: "物高", lensType: "透镜类型", convexLens: "凸透镜", concaveLens: "凹透镜", lensInteractionTip: "直接拖动物体箭头可改变物距——拖拽、滑块与自然语言指令写入同一个 config。"
    },
  },
  en: {
    card: {
      unsupported: "This interactive component is not supported yet. Try describing it another way.",
      preparing: "Preparing your interactive component…",
      generationFailed: "Interactive component generation failed: {message}",
      configFailed: "Configuration generation failed",
      requestFailed: "Request failed",
    },
    common: {
      generatedContentNotice: "AI-generated study aid. Verify historical facts, dates, and source claims against the original course materials.",
      studentAnnotation: "My annotation",
      annotationPlaceholder: "Record your judgment, question, or something to verify…",
    },
    timeline: {
      aria: "Causal timeline: {title}",
      subtitle: "Select an event to separate chronology from direct causation",
      causes: "{count} causes",
      effects: "{count} effects",
      noLinks: "No direct causal relationship is declared for this event.",
      ignoredLinks: "Ignored {count} invalid references.",
    },
    sourceComparison: {
      title: "Source comparison",
      aria: "Source comparison",
      focusAria: "Comparison dimension",
      provenance: "Provenance",
      claims: "Claims",
      corroboration: "Corroboration",
      limitations: "Limitations",
      provenanceLabel: "Provenance and context",
      claimsLabel: "Core claims",
      corroborationLabel: "Evidence and corroboration",
      limitationsLabel: "Limitations and bias",
      sourceNumber: "Source {number}",
      evidencePrefix: "Evidence: {evidence}",
      currentFocus: "Current focus: {focus}. Placing sources side by side does not make them equally reliable.",
    },
    widgets: {
      acidBaseTitle: "Strong acid–base titration · Interactive curve", titrationAria: "Titration pH curve", addedBaseAxis: "Base added / mL", currentPh: "Current pH", equivalencePoint: "Equivalence", region: "Region", acidExcess: "Excess acid", baseExcess: "Excess base", addedBaseVolume: "Base volume", acidConcentration: "Acid concentration", acidVolume: "Acid volume", baseConcentration: "Base concentration", indicator: "Indicator", phenolphthalein: "Phenolphthalein", methylOrange: "Methyl orange", none: "None",
      angleTitle: "Angle measure · Drag the ray", angle: "Angle", classification: "Classification", showClassification: "Show classification", showProtractor: "Show protractor ticks", zeroAngle: "Zero angle", acuteAngle: "Acute", rightAngle: "Right", obtuseAngle: "Obtuse", straightAngle: "Straight",
      argumentTitle: "Argument map", argumentSubtitle: "Reasons and evidence occupy different levels; an objection is not automatically a proven counterexample", reason: "Reason", evidence: "Evidence", objection: "Objection", reply: "Reply", supportChain: "Support chain", challengeResponse: "Challenges and replies", centralClaim: "Central claim", noNodeRelations: "No valid relationship connects to this node.", supports: "Supports {count}", challenges: "Challenges {count}", invalidRelations: "Invalid relations {count}", supportsRelation: "supports", challengesRelation: "challenges",
      characterSuffix: "Character relationships", characterAria: "Character relationships during {phase}", role: "Role", goal: "Goal", ignoredRelationships: "Ignored invalid relationships",
      climateTitle: "Climate patterns · Monthly comparison", climateAria: "Monthly temperature and precipitation comparison", temperature: "Temperature", precipitation: "Precipitation", meanTemperature: "Mean annual temp.", temperatureRange: "Annual range", annualPrecipitation: "Annual precipitation", hemisphere: "Hemisphere", northernHemisphere: "Northern", southernHemisphere: "Southern", comparisonFocus: "Comparison focus", precipitationSeasonality: "Rainfall seasonality", continentality: "Continentality",
      closeReadingAria: "Close reading", closeReadingTitle: "Close reading · Evidence before interpretation", closeReadingSubtitle: "Select a highlighted phrase to inspect the observation → effect chain", closeReadingFocus: "Close-reading lens", diction: "Diction", imagery: "Imagery", syntax: "Syntax", structure: "Structure", voice: "Voice", observation: "Observation", effect: "Effect", noAnnotations: "No annotations for this lens.", ignoredAnnotations: "Safely ignored {count} annotations not found in the passage.",
      colorTitle: "Color harmony · Color-wheel relationships", colorWheel: "Color wheel", harmony: "Harmony", complementary: "Complementary", analogous: "Analogous", triadic: "Triadic", baseHue: "Base hue", saturation: "Saturation", lightness: "Lightness",
      experimentTitle: "Experiment design · Causality and controls", hypothesis: "Hypothesis", independentVariable: "Independent variable", dependentVariable: "Dependent variable", sample: "Sample", control: "Control", reminder: "Reminder", noControlGroup: "No explicit control group identified", totalSampleSize: "Total sample size",
      functionTitle: "Function transforms · y = a·f(b(x-h)) + k", functionAria: "Original and transformed function graph", baseFunction: "Parent function", verticalA: "Vertical a", horizontalB: "Horizontal b", horizontalH: "Horizontal h", verticalK: "Vertical k", showBaseFunction: "Show parent function as a dashed line",
      narrativeSuffix: "Narrative arc", narrativeAria: "Narrative tension curve", tension: "Tension", narrativeModel: "Narrative model", fivePart: "Five-part", threeAct: "Three-act", episodic: "Episodic",
      policyTitle: "Policy trade-offs · Multiple perspectives", stakeholders: "Stakeholders", principle: "Principle", policyPrinciple: "Weights guide questions; they do not automatically declare a winner",
      step: "Step", input: "Input", change: "Change", output: "Output", feedback: "Feedback", ignoredFeedback: "Ignored invalid feedback",
      rhythmTitle: "Rhythm pattern · Build and play", accentBeat: "Accent", hitBeat: "Hit", restBeat: "Rest", play: "Play", stop: "Stop", stepsPerMeasure: "Per measure", duration: "Duration", soundedSteps: "Sounded steps", timeSignature: "Time signature", subdivision: "Subdivision", quarter: "Quarter", eighth: "Eighth", sixteenth: "Sixteenth", tempo: "Tempo",
      sentenceTitle: "Sentence structure · Order and dependency", dependsOn: "Depends on → {id}", syntaxRoot: "Syntax root", observationLevel: "Analysis level", clause: "Clause", phrase: "Phrase", wordOrder: "Word order", dependency: "Dependency", language: "Language", invalidDependency: "Invalid dependency",
      sortingTitle: "Sorting algorithm · Step by step", previousStep: "Previous", nextStep: "Next", comparison: "Comparisons", movesSwaps: "Moves/swaps", algorithm: "Algorithm", bubble: "Bubble", selection: "Selection", insertion: "Insertion",
      waveTitle: "Wave superposition · Dynamic view", waveAria: "Two harmonic waves and their resultant", pause: "Pause", superposition: "Superposition", constructive: "Constructive", destructive: "Destructive", mixed: "Mixed", beatFrequency: "Beat frequency", showComponents: "Show component waves", amplitude1: "Amplitude A₁", amplitude2: "Amplitude A₂", frequency1: "Frequency f₁", frequency2: "Frequency f₂", phaseDifference: "Phase difference",
      lensTitle: "Lens imaging · Interactive demo", lensAria: "Ray diagram for lens imaging", object: "Object", image: "Image", distantImage: "Image (far away)", rayLegend: "━ Parallel ray (orange) / central ray (blue) / focal ray (purple); dashed = backward extension of a virtual image", objectDistance: "Object distance", focalLength: "Focal length", imageDistance: "Image distance", magnification: "Magnification", noImageAtFocus: "u = f: refracted rays emerge parallel, so no finite image forms", realInverted: "Real · inverted", virtualUpright: "Virtual · upright", enlarged: "Enlarged", reduced: "Reduced", sameSize: "Same size", objectHeight: "Object height", lensType: "Lens type", convexLens: "Convex", concaveLens: "Concave", lensInteractionTip: "Drag the object arrow to change its distance. Dragging, sliders, and natural-language commands all update the same config."
    },
  },
} as const;

export function useInteractiveT() {
  const { language } = useI18n();
  return interactiveDictionaries[language];
}
