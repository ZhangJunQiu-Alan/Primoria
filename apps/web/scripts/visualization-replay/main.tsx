import { createRoot } from "react-dom/client";
import { useState } from "react";
import { InteractiveVisualization } from "../../src/components/generative-ui/interactive-visualization";
import { I18nProvider } from "../../src/lib/i18n/client";
import { dictionaries } from "../../src/lib/i18n/dictionaries";
import type { AcceptanceManifest } from "../../src/lib/interactive/acceptance";
import type { InteractiveComponentPayload } from "@primoria/contracts/artifacts/schemas";
import type { ReferenceCoverageReport } from "@primoria/contracts/artifacts/visualization-reference";
import "./style.css";

type ReplayData = { manifest: AcceptanceManifest; gallery: { title: string; subject: string; description: string; payload: InteractiveComponentPayload }[]; coverage: ReferenceCoverageReport | null; fallbackWidgets?: Record<string, { title: string; url: string }[]>; rendererSource?: { exportedAt: string; codeRevision: string; workingTreeHash: string; catalogHash: string } };
const subjectLabels: Record<string, string> = { physics: "物理", chemistry: "化学", "computer-science": "计算机", mathematics: "数学", math: "数学", history: "历史", "cross-disciplinary": "跨学科", philosophy: "哲学", literature: "文学", language: "语言", civics: "公民与政策", geography: "地理", arts: "艺术", music: "音乐", psychology: "心理学", astronomy: "天文", biology: "生物" };
const subjectLabel = (value: string) => subjectLabels[value] ?? value;
const data: ReplayData = JSON.parse(document.getElementById("replay-data")!.textContent!);

function App() {
  const [tab, setTab] = useState<"cases" | "library" | "evidence">(data.manifest.cases.length ? "cases" : "library");
  const [subject, setSubject] = useState("all");
  const [active, setActive] = useState(data.manifest.cases[0]?.caseId ?? "");
  const [galleryId, setGalleryId] = useState(data.gallery[0]?.payload.componentId ?? "");
  const [reset, setReset] = useState(0);
  const [attemptIndex, setAttemptIndex] = useState(-1);
  const current = data.manifest.cases.find((entry) => entry.caseId === active);
  const attempt = attemptIndex < 0 ? current?.attempts.at(-1) : current?.attempts[attemptIndex];
  const capturedFallbacks = current ? data.fallbackWidgets?.[`${current.caseId}:${attemptIndex < 0 ? current.attempts.length - 1 : attemptIndex}`] ?? [] : [];
  const gallery = data.gallery.find((entry) => entry.payload.componentId === galleryId);
  const passed = data.manifest.cases.filter((entry) => entry.attempts.at(-1)?.status === "passed").length;
  const subjects = [...new Set(data.gallery.map((entry) => entry.subject))].sort();
  return <>
    <header><a className="brand" href="#">Primoria<span>学习的形状</span></a><span className="edition">VISUALIZATION / LAB RECORD</span><span className="offline">本地回放 · 无需重新生成</span></header>
    <section className="intro"><div><p className="eyebrow">教学可视化 · 验收记录</p><h1>把理解，<br /><em>放进画面里。</em></h1><p className="lead">从一句提问，到一个可以操作的解释。保留原始输入与实际输出，让每次生成都有据可查。</p></div><div className="metrics"><div><b>{data.manifest.cases.length ? passed : "—"}<small>{data.manifest.cases.length ? ` / ${data.manifest.cases.length}` : ""}</small></b><span>{data.manifest.cases.length ? "最新尝试通过" : "本页仅含默认样例"}</span></div><div><b>{data.gallery.length}</b><span>可浏览组件</span></div><div><b>{data.coverage ? `${data.coverage.verifiedCases}/${data.coverage.totalCases}` : "待盘点"}</b><span>参考案例已核实</span></div></div></section>
    {data.manifest.scope === "platform-baseline" ? <p className="scope-note">平台基线验证：本页证明当前组件与运行链路，参考网站全量覆盖仍以冻结清单及逐项验收为准。</p> : null}
    <nav aria-label="验收内容">{([['cases', 'Prompt 实测'], ['library', '组件全库'], ['evidence', '验证证据']] as const).map(([key, label]) => <button key={key} type="button" aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>{label}</button>)}<span>{data.manifest.runId}</span></nav>
    {tab === "cases" ? <main className="workspace"><aside><p className="sidebar-title">原始输入 / {data.manifest.cases.length}</p>{data.manifest.cases.map((entry, index) => <button type="button" key={entry.caseId} className={`case-link ${active === entry.caseId ? "active" : ""}`} onClick={() => { setActive(entry.caseId); setReset(0); setAttemptIndex(-1); }}><span className="case-number">{String(index + 1).padStart(2, "0")}</span><span><small>{subjectLabel(entry.subject)} · {entry.kind}</small><span>{entry.prompt}</span></span><i className={`dot ${entry.attempts.at(-1)?.status ?? "pending"}`} /></button>)}</aside><article>
      {current ? <><div className="scene-meta"><span>{current.caseId} / {current.kind}</span><span>{attempt?.status ?? "not_run"}</span></div><h2 className="prompt">{current.prompt}</h2><p className="explanation">{attempt?.explanation || (attempt?.payload ? "本次未采集到独立说明文字，下方保留实际可视化。" : attempt ? "本次未采集到说明文字。未使用模拟输出补充。" : "尚未执行真实模型测试。")}</p>
      {current.attempts.length > 1 ? <label className="attempt-select">尝试记录 <select value={attemptIndex} onChange={(event) => setAttemptIndex(Number(event.target.value))}><option value={-1}>最新尝试</option>{current.attempts.map((item, index) => <option key={index} value={index}>第 {index + 1} 次 · {item.status}</option>)}</select></label> : null}
      {attempt?.payload ? <div className="scene"><InteractiveVisualization key={`${active}:${attemptIndex}:${reset}`} payload={attempt.payload} /><button type="button" className="reset" onClick={() => setReset((value) => value + 1)}>恢复捕获参数 ↺</button></div> : <div className="empty-scene">{attempt?.error ?? "待执行真实模型测试"}</div>}
      {capturedFallbacks.map((widget) => <section key={widget.url} className="scene"><p className="scope-note">实际自定义回退输出 · 本次未通过模板命中验收</p><iframe title={widget.title} src={`./${widget.url}`} sandbox="allow-scripts" style={{ width: "100%", height: 760, border: 0, display: "block" }} /></section>)}
      {attempt?.screenshot ? <p><a href={`./${attempt.screenshot}`} target="_blank" rel="noreferrer">查看本次生产页面截图 ↗</a></p> : null}
      <div className="case-evidence"><p>预期组件：{current.expectedComponentIds.join(" / ")}</p><p>实际组件：{attempt?.payload?.componentId ?? "—"} · 配置版本 {attempt?.payload?.configVersion ?? "—"}</p><p>耗时：{attempt ? `${(attempt.latencyMs / 1000).toFixed(2)}s` : "—"} · 模型：{attempt?.model ?? "未记录"}</p>{attempt?.assertions.map((text, index) => <p key={index}>✓ {text}</p>)}{attempt?.error ? <p role="alert">{attempt.error}</p> : null}</div></> : <p>此运行尚未保存实测案例。</p>}
    </article></main> : null}
    {tab === "library" ? <main className="workspace"><aside><label className="filter">学科 <select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">全部学科</option>{subjects.map((item) => <option key={item} value={item}>{subjectLabel(item)}</option>)}</select></label>{data.gallery.filter((entry) => subject === "all" || entry.subject === subject).map((entry) => <button key={entry.payload.componentId} className={`case-link ${galleryId === entry.payload.componentId ? "active" : ""}`} onClick={() => { setGalleryId(entry.payload.componentId); setReset(0); }}><span><small>{subjectLabel(entry.subject)}</small><span>{entry.title}</span></span></button>)}</aside><article>{gallery ? <><p className="eyebrow">生产组件 · 默认样例</p><h2>{gallery.title}</h2><p className="explanation">{gallery.description}</p><div className="scene"><InteractiveVisualization key={`${galleryId}:${reset}`} payload={gallery.payload} /><button type="button" className="reset" onClick={() => setReset((value) => value + 1)}>重置样例 ↺</button></div></> : null}</article></main> : null}
    {tab === "evidence" ? <main className="report"><h2>让结论与证据对应。</h2><dl><dt>范围</dt><dd>{data.manifest.scope}</dd><dt>输入冻结</dt><dd>{data.manifest.frozenAt} · seed {data.manifest.seed}</dd><dt>代码基线</dt><dd>{data.manifest.codeRevision}</dd><dt>工作树 hash</dt><dd>{data.manifest.workingTreeHash}</dd><dt>Catalog hash</dt><dd>{data.manifest.catalogHash}</dd><dt>全量覆盖</dt><dd>{data.coverage?.complete ? "通过" : "未通过 / 尚未完成核实"}</dd></dl><table><thead><tr><th>检查</th><th>状态</th><th>证据</th></tr></thead><tbody>{data.manifest.checks.map((check, index) => <tr key={index}><td>{check.name}</td><td>{check.status}</td><td>{check.detail}</td></tr>)}</tbody></table><a href="./results.json">下载完整脱敏记录</a>{data.coverage?.gaps.length ? <p>尚有 {data.coverage.gaps.length} 项参考能力未核实；详情见结果文件。</p> : null}</main> : null}
    <footer><span>PRIMORIA · EXPLORE TO UNDERSTAND</span><span>场景使用已保存参数，可自由操作；本页不会重新调用模型。</span></footer>
  </>;
}
createRoot(document.getElementById("root")!).render(<I18nProvider initialLanguage="zh" initialDictionary={dictionaries.zh}><App /></I18nProvider>);
