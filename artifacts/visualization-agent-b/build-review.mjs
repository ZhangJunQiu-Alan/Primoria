import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(path.join(root, "apps/web/package.json"));
const esbuild = require("esbuild");
const batchDirectory = path.join(root, "data/visualization-components/batches");
const batches = readdirSync(batchDirectory).filter((name) => /^agent-b-\d{3}\.json$/.test(name)).sort().map((name) => JSON.parse(readFileSync(path.join(batchDirectory, name), "utf8")));
const components = batches.filter((batch) => batch.changeKind !== "existing-widget-refinement").flatMap((batch) => batch.components);
if (new Set(components.map((entry) => entry.componentId)).size !== components.length) throw new Error("Duplicate review component ID");
const destination = path.join(root, "artifacts/visualization-agent-b/quality-review");
const imports = components.map((entry, index) => `import { ${entry.widgetExport} as Widget${index} } from ${JSON.stringify(path.join(root, entry.widgetPath))};`).join("\n");
const scenes = components.map((entry, index) => `{id:${JSON.stringify(entry.componentId)},Widget:Widget${index},samples:${JSON.stringify(entry.samples)}}`).join(",\n");
const source = `import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {I18nProvider} from ${JSON.stringify(path.join(root, "apps/web/src/lib/i18n/client.tsx"))};
import {getDictionary} from ${JSON.stringify(path.join(root, "apps/web/src/lib/i18n/dictionaries.ts"))};
${imports}
const scenes=[${scenes}];
function Demo({scene,sample}){const[config,setConfig]=useState(scene.samples[sample]);return <scene.Widget config={config} onChange={setConfig}/>}
function App(){const[index,setIndex]=useState(0),[sample,setSample]=useState(0),[language,setLanguage]=useState("zh");const scene=scenes[index];return <I18nProvider key={language} initialLanguage={language} initialDictionary={getDictionary(language)}><header><span>PRIMORIA · SCENE QUALITY REVIEW</span><h1>让概念变得可观察</h1><p>Agent B 场景检查 · ${components.length}个新组件 · ${components.reduce((n,e)=>n+e.samples.length,0)}组配置 · 非20条实测报告</p></header><nav><label>场景<select aria-label="场景" value={index} onChange={e=>{setIndex(Number(e.target.value));setSample(0)}}>{scenes.map((s,i)=><option key={s.id} value={i}>{s.id}</option>)}</select></label><label>样例<select aria-label="样例" value={sample} onChange={e=>setSample(Number(e.target.value))}>{["默认","变化","边界","其他模式"].map((name,i)=><option key={i} value={i}>{name}</option>)}</select></label><label>语言<select aria-label="语言" value={language} onChange={e=>setLanguage(e.target.value)}><option value="zh">中文</option><option value="en">English</option></select></label></nav><main><Demo key={index+"-"+sample} scene={scene} sample={sample}/></main><footer><p>组件与计算模型均复用仓库代码。参考能力的完整覆盖仍在核实，不以本页面代替最终验收。</p></footer></I18nProvider>}createRoot(document.getElementById("root")).render(<App/>);`;
const entryPoint = path.join(destination, "review-entry.jsx");
writeFileSync(entryPoint, source);
writeFileSync(path.join(destination, "scenarios.json"), `${JSON.stringify({ components }, null, 2)}\n`);
esbuild.buildSync({ entryPoints: [entryPoint], bundle: true, outfile: path.join(destination, "preview.js"), format: "esm", jsx: "automatic", alias: { "@": path.join(root, "apps/web/src") }, nodePaths: [path.join(root, "apps/web/node_modules"), path.join(root, "node_modules")], define: { "process.env.NODE_ENV": '"production"' }, minify: true });
const existingDirectory = path.join(root, "artifacts/visualization-agent-b/existing-library-review");
esbuild.buildSync({ entryPoints: [path.join(existingDirectory, "review-entry.tsx")], bundle: true, outfile: path.join(existingDirectory, "preview.js"), format: "esm", jsx: "automatic", alias: { "@": path.join(root, "apps/web/src") }, nodePaths: [path.join(root, "apps/web/node_modules"), path.join(root, "node_modules")], define: { "process.env.NODE_ENV": '"production"' }, minify: true });
console.log(`Built ${components.length} production widgets for local review. Browser verification must be rerun after changes.`);
