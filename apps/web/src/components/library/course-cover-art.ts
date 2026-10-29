// Deterministic line-art course covers: the library's fallback until (or
// instead of) a generated cover image. Same subject text, same picture. The
// markup is static SVG built from constants, never from user input.

export type CoverKind =
  | "algebra" | "calculus" | "statistics" | "physics" | "chemistry" | "biology"
  | "computing" | "history" | "economics" | "materials" | "general";

type Point = [number, number];

const C = { cream: "#F8F3E9", grid: "#E8E3D9", ink: "#1E1B16", olive: "#9E9E77", amber: "#D29C38", blue: "#5E7F96", taupe: "#B7A693", sheet: "#FFFDF8" };
const r1 = (n: number) => Math.round(n * 10) / 10;
const pts = (list: Point[]) => list.map(([x, y], i) => `${i ? "L" : "M"}${r1(x)} ${r1(y)}`).join("");
function arrow(x1: number, y1: number, x2: number, y2: number, color = C.ink, w = 1.6) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 8, s = 0.42;
  const p1 = [x2 - h * Math.cos(a - s), y2 - h * Math.sin(a - s)];
  const p2 = [x2 - h * Math.cos(a + s), y2 - h * Math.sin(a + s)];
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="${w}"/><path d="M${r1(p1[0])} ${r1(p1[1])}L${x2} ${y2}L${r1(p2[0])} ${r1(p2[1])}" stroke="${color}" stroke-width="${w}"/>`;
}
const DOT = `stroke-dasharray="1.5 5" stroke-linecap="round"`;
const DASH = `stroke-dasharray="5 5"`;

const MOTIFS: Record<CoverKind, () => string> = {
  algebra() {
    return `
      <path d="M96 140L176 124L206 72L126 88Z" fill="${C.taupe}" fill-opacity=".28"/>
      <path d="M176 124L206 72M126 88L206 72" stroke="${C.ink}" stroke-width="1.2" ${DASH}/>
      <path d="M115.6 136.1A20 20 0 0 0 106.9 123.3" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      ${arrow(96, 140, 176, 124, C.amber, 2)}
      ${arrow(96, 140, 126, 88, C.blue, 2)}
      ${arrow(96, 140, 206, 72, C.ink, 1.6)}
      <circle cx="96" cy="140" r="3.5" fill="${C.ink}"/>
      <path d="M244 92h-6v56h6M282 92h6v56h-6" stroke="${C.ink}" stroke-width="1.6"/>
      <circle cx="252" cy="108" r="5" fill="${C.amber}"/><circle cx="274" cy="108" r="5" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.4"/>
      <circle cx="252" cy="132" r="5" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.4"/><circle cx="274" cy="132" r="5" fill="${C.blue}"/>`;
  },
  calculus() {
    const f = (x: number) => 142 - 78 * Math.pow(Math.sin(((x - 92) / 184) * Math.PI), 1.4);
    const curve: Point[] = [];
    for (let x = 92; x <= 276; x += 4) curve.push([x, f(x)]);
    const bars = [112, 130, 148, 166, 184].map((x) => `<rect x="${x}" y="${r1(f(x + 8))}" width="18" height="${r1(150 - f(x + 8))}" fill="${C.taupe}" fill-opacity=".3" stroke="${C.ink}" stroke-width="1.1"/>`).join("");
    const tx = 226, ty = f(tx), slope = (f(tx + 0.5) - f(tx - 0.5));
    return `
      ${bars}
      ${arrow(78, 150, 286, 150)}
      ${arrow(86, 162, 86, 40)}
      <path d="${pts(curve)}" stroke="${C.ink}" stroke-width="2"/>
      <path d="M${tx - 40} ${r1(ty - 40 * slope)}L${tx + 40} ${r1(ty + 40 * slope)}" stroke="${C.blue}" stroke-width="1.6" ${DASH}/>
      <circle cx="${tx}" cy="${r1(ty)}" r="6" fill="${C.amber}" stroke="${C.ink}" stroke-width="1.4"/>`;
  },
  statistics() {
    const g = (x: number) => 148 - 94 * Math.exp(-((x - 166) ** 2) / (2 * 30 ** 2));
    const bell: Point[] = [];
    for (let x = 70; x <= 262; x += 3) bell.push([x, g(x)]);
    const tail = bell.filter(([x]) => x >= 202);
    const rug = [104, 122, 131, 140, 148, 153, 158, 163, 167, 171, 176, 182, 189, 197, 210, 228];
    return `
      <path d="${pts(tail)}L262 148L202 148Z" fill="${C.amber}" fill-opacity=".45"/>
      <path d="M60 148H284" stroke="${C.ink}" stroke-width="1.6"/>
      <path d="M166 54V148" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      <path d="M202 ${r1(g(202))}V148" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="${pts(bell)}" stroke="${C.ink}" stroke-width="2"/>
      ${rug.map((x) => `<path d="M${x} 156v8" stroke="${C.blue}" stroke-width="1.6"/>`).join("")}
      <circle cx="166" cy="54" r="4" fill="${C.ink}"/>`;
  },
  physics() {
    const P: Point = [176, 38], L = 100, at = (deg: number): Point => [P[0] + L * Math.sin((deg * Math.PI) / 180), P[1] + L * Math.cos((deg * Math.PI) / 180)];
    const bob = at(-24), ghost = at(24), a0 = at(-36), a1 = at(36);
    const wave: Point[] = [];
    for (let x = 64; x <= 284; x += 3) wave.push([x, 156 + 6 * Math.sin(((x - 64) / 40) * 2 * Math.PI)]);
    return `
      <path d="M134 38H218" stroke="${C.ink}" stroke-width="1.8"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((k) => `<path d="M${140 + 12 * k} 38l6 -7" stroke="${C.ink}" stroke-width="1.2"/>`).join("")}
      <path d="M${r1(a0[0])} ${r1(a0[1])}A${L} ${L} 0 0 0 ${r1(a1[0])} ${r1(a1[1])}" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      <path d="M176 38L${r1(ghost[0])} ${r1(ghost[1])}" stroke="${C.taupe}" stroke-width="1.4" ${DASH}/>
      <circle cx="${r1(ghost[0])}" cy="${r1(ghost[1])}" r="11" stroke="${C.taupe}" stroke-width="1.4" ${DASH}/>
      <path d="M176 38L${r1(bob[0])} ${r1(bob[1])}" stroke="${C.ink}" stroke-width="1.6"/>
      <circle cx="${r1(bob[0])}" cy="${r1(bob[1])}" r="12" fill="${C.amber}" stroke="${C.ink}" stroke-width="1.6"/>
      <circle cx="176" cy="38" r="3" fill="${C.ink}"/>
      <path d="${pts(wave)}" stroke="${C.blue}" stroke-width="1.8"/>`;
  },
  chemistry() {
    const hex = [0, 1, 2, 3, 4, 5].map((k): Point => [128 + 40 * Math.cos(((90 + 60 * k) * Math.PI) / 180), 96 - 40 * Math.sin(((90 + 60 * k) * Math.PI) / 180)]);
    return `
      <path d="${pts(hex)}Z" stroke="${C.ink}" stroke-width="1.8"/>
      <circle cx="128" cy="96" r="23" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M162.6 76L186 62.5" stroke="${C.ink}" stroke-width="1.6"/><circle cx="192" cy="59" r="7" fill="${C.blue}" stroke="${C.ink}" stroke-width="1.4"/>
      <path d="M128 136V156" stroke="${C.ink}" stroke-width="1.6"/><circle cx="128" cy="162" r="6" fill="${C.amber}" stroke="${C.ink}" stroke-width="1.4"/>
      <path d="M216.2 116L206 142H264L253.8 116Z" fill="${C.blue}" fill-opacity=".45"/>
      <path d="M228 48V86L206 142H264L242 86V48M223 48H247" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M216.2 116H253.8" stroke="${C.ink}" stroke-width="1.2"/>
      <circle cx="233" cy="104" r="3" stroke="${C.ink}" stroke-width="1.2"/><circle cx="241" cy="96" r="2" stroke="${C.ink}" stroke-width="1.2"/><circle cx="236" cy="72" r="2.2" stroke="${C.ink}" stroke-width="1.2"/>
      <path d="M174 140C190 160 204 160 210 150" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>`;
  },
  biology() {
    return `
      <ellipse cx="166" cy="98" rx="94" ry="58" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.8"/>
      <ellipse cx="166" cy="98" rx="85" ry="49" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      <path d="M210 66c14 8 16 22 10 34M218 60c18 10 22 30 12 46M200 128c12 -4 22 -12 26 -22" stroke="${C.ink}" stroke-width="1.2"/>
      <circle cx="178" cy="94" r="25" fill="${C.olive}" fill-opacity=".55" stroke="${C.ink}" stroke-width="1.6"/>
      <circle cx="184" cy="89" r="6.5" fill="${C.ink}"/>
      <g transform="rotate(-18 116 116)"><ellipse cx="116" cy="116" rx="20" ry="10" fill="${C.amber}" fill-opacity=".55" stroke="${C.ink}" stroke-width="1.4"/><path d="M100 116c4 -6 6 6 10 0s6 6 10 0 6 6 10 0" stroke="${C.ink}" stroke-width="1.1"/></g>
      <circle cx="232" cy="124" r="5" fill="${C.blue}" stroke="${C.ink}" stroke-width="1.2"/><circle cx="124" cy="76" r="3.5" fill="${C.blue}" stroke="${C.ink}" stroke-width="1.2"/><circle cx="140" cy="132" r="2.5" fill="${C.ink}"/>`;
  },
  computing() {
    const node = (x: number, y: number, fill: string) => `<rect x="${x - 14}" y="${y - 10}" width="28" height="20" rx="5" fill="${fill}" stroke="${C.ink}" stroke-width="1.6"/>`;
    const edge = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1 + 10}L${x2} ${y2 - 10}" stroke="${C.ink}" stroke-width="1.6"/>`;
    return `
      <ellipse cx="112" cy="128" rx="58" ry="44" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      ${edge(160, 46, 112, 100)}${edge(160, 46, 210, 100)}${edge(112, 100, 84, 150)}${edge(112, 100, 140, 150)}${edge(210, 100, 236, 150)}
      ${node(160, 46, C.amber)}${node(112, 100, C.sheet)}${node(210, 100, C.sheet)}${node(84, 150, C.blue)}${node(140, 150, C.sheet)}${node(236, 150, C.sheet)}
      <path d="M252 44l-10 9 10 9M274 44l10 9 -10 9M267 38l-8 30" stroke="${C.ink}" stroke-width="1.6"/>`;
  },
  history() {
    const flutes = [110, 118, 126, 134].map((x) => `<path d="M${x} 66V138" stroke="${C.ink}" stroke-width="1.1"/>`).join("");
    return `
      <path d="M198 150A34 34 0 0 1 266 150Z" fill="${C.amber}" fill-opacity=".7" stroke="${C.ink}" stroke-width="1.6"/>
      <path d="M184 150A48 48 0 0 1 280 150" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      <path d="M60 150H288" stroke="${C.ink}" stroke-width="1.8"/>
      <path d="M92 50H150V58H92Z" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.6"/>
      <path d="M98 58C98 64 104 66 104 66H138C138 66 144 64 144 58" stroke="${C.ink}" stroke-width="1.4"/>
      <path d="M104 66H138V140H104Z" fill="${C.taupe}" fill-opacity=".28" stroke="${C.ink}" stroke-width="1.6"/>
      ${flutes}
      <path d="M96 140H146V150H96Z" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.6"/>
      <path d="M160 150V112L166 106L172 114L178 104L184 110V150" fill="${C.taupe}" fill-opacity=".28" stroke="${C.ink}" stroke-width="1.4"/>`;
  },
  economics() {
    return `
      <path d="M104 60L182 97.5L104 97.5Z" fill="${C.amber}" fill-opacity=".35"/>
      <path d="M104 97.5L182 97.5L104 138Z" fill="${C.blue}" fill-opacity=".28"/>
      ${arrow(90, 154, 90, 38)}
      ${arrow(82, 150, 288, 150)}
      <path d="M182 97.5V150M182 97.5H90" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      <path d="M104 60L262 136" stroke="${C.ink}" stroke-width="2"/>
      <path d="M104 138L262 56" stroke="${C.blue}" stroke-width="2"/>
      <circle cx="182" cy="97.5" r="6" fill="${C.amber}" stroke="${C.ink}" stroke-width="1.5"/>`;
  },
  materials() {
    const lines = [58, 70, 82].map((y, i) => `<path d="M144 ${y}H${i === 2 ? 190 : 212}" stroke="${C.ink}" stroke-opacity=".55" stroke-width="1.4"/>`).join("");
    return `
      <path d="M244 152A72 72 0 0 0 254 66" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      <rect x="122" y="42" width="98" height="124" rx="3" transform="rotate(-7 171 104)" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.4"/>
      <rect x="126" y="40" width="98" height="124" rx="3" transform="rotate(4 175 102)" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.4"/>
      <rect x="130" y="38" width="98" height="124" rx="3" fill="${C.sheet}" stroke="${C.ink}" stroke-width="1.6"/>
      ${lines}
      <rect x="142" y="92" width="62" height="10" rx="2" fill="${C.amber}" fill-opacity=".45"/>
      <path d="M144 112H212M144 124H200" stroke="${C.ink}" stroke-opacity=".55" stroke-width="1.4"/>
      <rect x="144" y="134" width="30" height="18" rx="2" fill="${C.blue}" fill-opacity=".35" stroke="${C.ink}" stroke-width="1.1"/>
      <path d="M214 34V62A7 7 0 0 0 228 62V30A10 10 0 0 0 208 30V58" stroke="${C.ink}" stroke-width="1.6"/>`;
  },
  general() {
    return `
      <circle cx="170" cy="96" r="56" stroke="${C.olive}" stroke-width="1.6" ${DOT}/>
      <path d="M192 52L240 134H144Z" fill="${C.amber}" fill-opacity=".7" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M84 116H128M84 128H120M84 140H128" stroke="${C.ink}" stroke-width="1.6"/>
      <circle cx="240" cy="58" r="10" fill="${C.blue}" stroke="${C.ink}" stroke-width="1.4"/>`;
  },
};

const RULES: Array<[CoverKind, RegExp]> = [
  ["statistics", /probab|statist|bayes|distribution|regression|概率|统计|分布|贝叶斯/i],
  ["algebra", /linear algebra|matri|vector|eigen|线性代数|矩阵|向量|特征值/i],
  ["calculus", /calculus|derivative|integral|limit|differential|numerical|微积分|导数|积分|极限|微分|数值/i],
  ["computing", /comput|program|python|algorithm|data struct|software|network|machine learning|deep learning|neural|\bai\b|artificial|code|web|sicp|计算机|编程|算法|数据结构|软件|网络|机器学习|深度学习|人工智能|代码/i],
  ["physics", /physic|mechanic|thermo|quantum|electro|optic|wave|force|energy|物理|力学|热力学|量子|电磁|光学|波/i],
  ["chemistry", /chemi|organic|reaction|molecul|acid|bond|化学|有机|反应|分子|酸|键/i],
  ["biology", /biolog|\bcells?\b|\bgen(e|etic)|\bdna\b|\bevolution|ecolog|anatom|photosynth|生物|细胞|基因|进化|生态|光合/i],
  ["economics", /econom|market|finance|supply|demand|accounting|经济|市场|金融|供给|需求/i],
  ["history", /histor|revolution|war|empire|ancient|civiliz|dynasty|历史|革命|战争|帝国|古代|文明|王朝/i],
  ["algebra", /math|algebra|geometry|数学|代数|几何/i],
];

export function courseCoverKind(text: string, fromMaterials = false): CoverKind {
  if (fromMaterials) return "materials";
  for (const [kind, pattern] of RULES) if (pattern.test(text)) return kind;
  return "general";
}

const GRID = (() => {
  const lines: string[] = [];
  for (let x = 20; x < 320; x += 20) lines.push(`M${x} 0V180`);
  for (let y = 20; y < 180; y += 20) lines.push(`M0 ${y}H320`);
  return lines.join("");
})();

const markupCache = new Map<CoverKind, string>();

/** Inner SVG markup (viewBox 0 0 320 180) for a cover kind. */
export function courseCoverMarkup(kind: CoverKind): string {
  let markup = markupCache.get(kind);
  if (!markup) {
    markup = `<rect width="320" height="180" fill="${C.cream}"/><path d="${GRID}" stroke="${C.grid}" stroke-width=".8"/><g class="library-cover-motif">${MOTIFS[kind]()}</g>`;
    markupCache.set(kind, markup);
  }
  return markup;
}
