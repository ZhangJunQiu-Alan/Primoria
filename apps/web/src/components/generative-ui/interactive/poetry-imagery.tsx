"use client";

import { useState, type ReactNode } from "react";
import { gradePoetryClassification, POETRY_SCENES, type PoetryImageryConfig } from "@/lib/interactive/components/poetry-imagery";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

function PoetryLandscape({ poemId, active, onSelect }: { poemId: PoetryImageryConfig["poemId"]; active: string; onSelect: (id: string) => void }) {
  const t = useSceneLocale(), poem = POETRY_SCENES[poemId];
  const image = (id: string, children: ReactNode) => <g key={id} role="button" tabIndex={0} aria-label={poem.phrases.find((phrase) => phrase.id === id)?.quote} aria-pressed={active === id} onClick={() => onSelect(id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(id); } }} style={{ color: active === id ? C.accent : C.series1, cursor: "pointer", outlineOffset: 5 }}>{children}</g>;
  return <svg viewBox="0 0 680 300" role="group" aria-label={t("诗词意象的解释性绘景，可选中对应原句", "Interpretive poetry landscape with selectable textual images")} style={{ display: "block", width: "100%", background: C.surfaceSoft }}>
    <path d="M0,232Q170,190 340,228T680,210V300H0Z" fill={C.series1} fillOpacity={0.07} />
    {poemId === "autumn-thoughts" ? <>
      {image("sun", <circle cx={545} cy={95} r={42} fill="currentColor" fillOpacity={active === "sun" ? 0.45 : 0.15} stroke="currentColor" strokeWidth={2} />)}
      {image("tree", <path d="M118,228L126,115M126,156L87,117M126,136L157,99M123,186L84,165M125,151L174,150" fill="none" stroke="currentColor" strokeWidth={active === "tree" ? 6 : 4} strokeLinecap="round" />)}
      {image("vine", <path d="M126,113C100,145 151,169 122,198M105,136Q86,150 101,170" fill="none" stroke="currentColor" strokeWidth={3} />)}
      {image("crow", <path d="M169,100Q177,86 185,100Q193,86 201,100M208,124Q215,112 222,124Q229,112 236,124" fill="none" stroke="currentColor" strokeWidth={4} />)}
      {image("stream", <path d="M250,187Q310,219 289,252T339,300" fill="none" stroke="currentColor" strokeWidth={15} strokeOpacity={0.22} />)}
      {image("bridge", <path d="M216,216Q269,150 321,216M224,225Q269,176 313,225M228,202V218M246,188V204M268,183V199M289,188V204M308,202V218" fill="none" stroke="currentColor" strokeWidth={3} />)}
      {image("house", <><path d="M330,159L366,129L402,159M339,157V202H394V157M357,202V177H375V202" fill="none" stroke="currentColor" strokeWidth={3} /><path d="M363,117Q349,104 365,93" fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={2} /></>)}
      {image("road", <path d="M680,272Q521,248 419,207Q450,236 535,300" fill="currentColor" fillOpacity={0.13} stroke="currentColor" strokeWidth={1.5} />)}
      {image("wind", <path d="M435,138H492Q515,138 510,126M455,152H536Q556,152 551,165" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" />)}
      {image("horse", <path d="M445,234L469,233L481,213L491,218L483,233L477,245L478,265M448,244L442,263M454,237L449,248L460,261M443,233L435,224" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />)}
      {image("person", <><circle cx={522} cy={228} r={5} fill="currentColor" /><path d="M521,234L519,252M519,252L510,268M519,252L527,267M520,240L504,245" fill="none" stroke="currentColor" strokeWidth={3} /></>)}
      {image("distance", <path d="M570,199L608,169L647,197L680,176" fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={2} />)}
    </> : poemId === "stork-tower" ? <>
      {image("mountain", <path d="M0,194L108,84L180,153L247,96L348,199" fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth={2} />)}
      {image("sun", <circle cx={199} cy={100} r={32} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={2} />)}
      {image("river", <path d="M204,175Q286,188 249,221T300,300M225,182Q308,195 276,226T345,300" fill="none" stroke="currentColor" strokeWidth={6} strokeOpacity={0.55} />)}
      {image("sea", <path d="M320,177Q405,160 490,178T680,175M360,190H680M391,203H680" fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.4} />)}
      {image("tower", <><path d="M442,127L510,91L578,127ZM452,127V237H568V127M441,171H579M441,210H579M474,127V237M546,127V237" fill={C.surface} stroke="currentColor" strokeWidth={3} /><path d="M486,237V221H501V205H516V188H532" fill="none" stroke="currentColor" strokeWidth={3} /></>)}
      {image("view", <><circle cx={509} cy={141} r={5} fill="currentColor" /><path d="M509,147V162M509,152L494,149M494,145L372,104M494,150L351,151" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" /></>)}
    </> : <>
      <path d="M103,44V247H592M115,57H306V176H115M210,57V176M115,117H306" fill="none" stroke={C.line} strokeWidth={3} />
      {image("moon", <circle cx={263} cy={87} r={23} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={2} />)}
      {image("light", <path d="M272,113L455,248H258L203,176Z" fill="currentColor" fillOpacity={0.12} />)}
      {image("frost", <path d="M315,238H391M330,226H364M357,250H417" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="3 6" />)}
      {image("bed", <path d="M121,205H242V246M121,191V246M121,218H242M128,205V193H156V205" fill="none" stroke="currentColor" strokeWidth={4} />)}
      {image("raise", <path d="M423,173Q421,149 408,141M408,141L410,154M408,141L421,144" fill="none" stroke="currentColor" strokeWidth={3} />)}
      {image("lower", <><circle cx={444} cy={169} r={11} fill={C.surface} stroke="currentColor" strokeWidth={3} /><path d="M444,181L447,215L433,247M447,215L464,247M445,194L423,204M463,176Q481,182 477,199M477,199L470,189M477,199L487,193" fill="none" stroke="currentColor" strokeWidth={3} /></>)}
      {image("home", <><path d="M513,85Q541,60 576,90V127H511ZM524,107L540,95L556,107V122H524Z" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="4 4" /><path d="M476,152L508,125" fill="none" stroke="currentColor" strokeDasharray="3 5" /></>)}
    </>}
  </svg>;
}

function PoetryImageryScene({ config, onChange }: { config: PoetryImageryConfig; onChange: (next: PoetryImageryConfig) => void }) {
  const t = useSceneLocale(), poem = POETRY_SCENES[config.poemId];
  const [activeId, setActive] = useState(poem.phrases[0].id), [question, setQuestion] = useState(0), [answers, setAnswers] = useState<Record<string, string>>({}), [completion, setCompletion] = useState<string | null>(null);
  const active = poem.phrases.find((phrase) => phrase.id === activeId) ?? poem.phrases[0], target = poem.phrases[question % poem.phrases.length];
  const selectedAnswer = answers[target.id], classified = selectedAnswer ? gradePoetryClassification(config.poemId, target.id, selectedAnswer) : null;
  const correctCount = Object.entries(answers).filter(([phraseId, groupId]) => gradePoetryClassification(config.poemId, phraseId, groupId)).length;
  const set = <K extends keyof PoetryImageryConfig>(key: K, value: PoetryImageryConfig[K]) => onChange({ ...config, [key]: value });
  const nextQuestion = () => { setQuestion((value) => (value + 1) % poem.phrases.length); setCompletion(null); };
  const textButton = { border: 0, borderRadius: 5, padding: "5px 7px", font: "inherit", cursor: "pointer", color: C.ink, background: C.surfaceSoft };
  const evidence = (phrase: typeof active) => <><b style={{ color: C.accent }}>“{phrase.quote}”</b><div style={{ marginTop: 6 }}>{t(...phrase.observation)}</div><div style={{ marginTop: 6, color: C.muted }}>{t(...phrase.effect)}</div></>;
  const verse = (line: string, index: number) => {
    const phrases = poem.phrases.filter((phrase) => phrase.line === index).sort((a, b) => line.indexOf(a.quote) - line.indexOf(b.quote));
    let cursor = 0; const parts: ReactNode[] = [];
    for (const phrase of phrases) { const at = line.indexOf(phrase.quote); parts.push(line.slice(cursor, at)); parts.push(<button key={phrase.id} aria-pressed={activeId === phrase.id} onClick={() => setActive(phrase.id)} style={{ ...textButton, color: activeId === phrase.id ? C.accent : C.ink, borderBottom: `2px solid ${activeId === phrase.id ? C.accent : "transparent"}`, background: "transparent", padding: "5px 2px" }}>{phrase.quote}</button>); cursor = at + phrase.quote.length; }
    parts.push(line.slice(cursor)); return parts;
  };
  return <SceneFrame id="chinese.poetry-imagery" title={t(...poem.title)} description={`${t(...poem.author)} · ${t("从原句观察意象，再用文本证据解释表达效果。绘景只作解读示意。", "Observe images in the original lines, then explain their effects with textual evidence. The drawing is interpretive.")}`}
    readouts={[{ label: t("意象与关键词", "Images and key phrases"), value: poem.phrases.length }, { label: t("解读分组", "Reading groups"), value: poem.groups.length }, { label: t("归类练习已答对", "Classification correct"), value: `${correctCount} / ${poem.phrases.length}` }]}
    controls={<>
      <SegmentedControl label={t("作品", "Poem")} value={config.poemId} options={Object.entries(POETRY_SCENES).map(([id, scene]) => [id as PoetryImageryConfig["poemId"], t(...scene.title)] as const)} onChange={(v) => set("poemId", v)} />
      <SegmentedControl label={t("学习方式", "Activity")} value={config.view} options={[["scene", t("诗景联动", "Landscape")], ["evidence", t("文本证据", "Evidence")], ["classify", t("意象归类", "Classify")], ["complete", t("词语补全", "Complete")]]} onChange={(v) => set("view", v)} />
      <SegmentedControl label={t("观察角度", "Reading focus")} value={config.focus} options={[["imagery", t("意象", "Imagery")], ["structure", t("结构", "Structure")], ["emotion", t("情感", "Emotion")]]} onChange={(v) => set("focus", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showTranslation} onChange={(event) => set("showTranslation", event.target.checked)} /> {t("英文释义", "English translation")}</label>
    </>}
    explanation={config.focus === "structure" ? t(...poem.structure) : config.focus === "emotion" ? t(...poem.interpretation) : t("意象不是“一个词对应一种固定情绪”。先指出原句和可观察特征，再结合并置、动作与结尾解释；归类是一种教学读法，可据文本讨论其他合理理解。", "An image does not carry one fixed emotion. Identify the words and observable details, then interpret their juxtaposition, gestures and ending. These groups are a teaching reading; other text-supported readings can be discussed.")}>
    {(config.view === "scene" || config.view === "evidence") ? <>
      {config.view === "scene" ? <PoetryLandscape poemId={config.poemId} active={activeId} onSelect={setActive} /> : null}
      <div style={{ padding: "18px", display: "grid", gap: 12, lineHeight: 1.7 }}>
        <div aria-label={t("诗词原文", "Original poem")} style={{ fontFamily: "serif", fontSize: 21, color: C.ink }}>
          {poem.lines.map((line, index) => <div key={line} style={{ marginBottom: 8 }}>{verse(line, index)}{config.showTranslation ? <div style={{ fontFamily: "sans-serif", fontSize: 12, color: C.muted }}>{poem.translation[index]}</div> : null}</div>)}
        </div>
        {config.view === "scene" ? <div aria-live="polite" style={{ padding: 14, borderLeft: `3px solid ${C.accent}`, background: C.surfaceSoft, fontSize: 13 }}>{evidence(active)}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
          {poem.groups.map((group) => <section key={group.id} style={{ minWidth: 0, padding: 12, border: `1px solid ${C.line}`, borderRadius: 8 }}><h3 style={{ margin: "0 0 6px", fontSize: 14, color: C.accent }}>{t(...group.label)}</h3><p style={{ margin: 0, color: C.muted, fontSize: 12 }}>{t(...group.description)}</p>{config.view === "evidence" ? poem.phrases.filter((phrase) => phrase.group === group.id).map((phrase) => <div key={phrase.id} style={{ marginTop: 14, fontSize: 12 }}>{evidence(phrase)}</div>) : <p style={{ margin: "8px 0 0", color: C.ink, fontSize: 12 }}>{poem.phrases.filter((phrase) => phrase.group === group.id).map((phrase) => phrase.quote).join(" · ")}</p>}</section>)}
        </div>
      </div>
    </> : <div style={{ padding: 18, display: "grid", gap: 16 }}>
      <div style={{ color: C.muted, fontSize: 12 }}>{t("本地练习", "Local practice")} · {question + 1} / {poem.phrases.length}</div>
      <p style={{ margin: 0, color: C.ink, fontSize: 23, fontFamily: "serif", lineHeight: 1.8 }}>{config.view === "classify" ? `“${target.quote}”` : poem.lines[target.line].replace(target.quote, "＿＿")}</p>
      <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>{config.view === "classify" ? t("结合原句，它在这组解读中属于哪一类？", "Using the line as evidence, which reading group fits this phrase?") : t("选出原句中缺少的词语。", "Choose the missing phrase from the original line.")}</p>
      {config.view === "classify" ? <>
        <p style={{ margin: 0, color: C.ink, fontSize: 14 }}>{poem.lines[target.line]}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{poem.groups.map((group) => <button key={group.id} aria-pressed={selectedAnswer === group.id} onClick={() => setAnswers((previous) => ({ ...previous, [target.id]: group.id }))} style={{ ...textButton, padding: "10px 12px", border: `1px solid ${selectedAnswer === group.id ? C.accent : C.line}` }}>{t(...group.label)}</button>)}</div>
        <div role="status" style={{ fontSize: 13, color: classified === false ? C.warn : C.accent }}>{classified === null ? t("先选一项，再对照原句观察。", "Choose a group, then check its textual evidence.") : <>{classified ? t("与本组读法一致。", "Consistent with this reading.") : t("再看词语与语境：", "Revisit the wording and context:")} {t(...target.observation)} {t(...target.effect)}</>}</div>
      </> : <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[target, ...poem.phrases.filter((phrase) => phrase.id !== target.id).slice(0, 2)].sort((a, b) => a.quote.localeCompare(b.quote, "zh")).map((phrase) => <button key={phrase.id} aria-pressed={completion === phrase.id} onClick={() => setCompletion(phrase.id)} style={{ ...textButton, padding: "10px 14px", border: `1px solid ${completion === phrase.id ? C.accent : C.line}` }}>{phrase.quote}</button>)}</div>
        <div role="status" style={{ color: completion === null || completion === target.id ? C.accent : C.warn, fontSize: 13 }}>{completion === null ? t("选词后核对原句。", "Choose a phrase to check the line.") : completion === target.id ? `${t("正确：", "Correct:")} ${poem.lines[target.line]}` : t("这不是该处的原词，再结合上下文选择。", "This is not the original phrase here. Use the context and try again.")}</div>
      </>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button onClick={nextQuestion} style={textButton}>{t("下一题", "Next item")}</button><button onClick={() => { setQuestion(0); setAnswers({}); setCompletion(null); }} style={textButton}>{t("重置练习", "Reset practice")}</button></div>
    </div>}
  </SceneFrame>;
}

export function PoetryImageryWidget(props: { config: PoetryImageryConfig; onChange: (next: PoetryImageryConfig) => void }) {
  return <PoetryImageryScene key={props.config.poemId} {...props} />;
}
