import { tool } from "@langchain/core/tools";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { WIDGET_STYLE_PROMPT } from "@primoria/contracts/visual-style";
import {
  PlanVisualizationArgsSchema,
  Render3dSceneArgsSchema,
  StemRendererArgsSchema,
  WidgetRendererArgsSchema,
} from "@primoria/contracts/artifacts/schemas";
import { WIDGET_DEPENDENCIES_BY_URL } from "@primoria/contracts/artifacts/widget-dependencies";
import { normalizeWidgetHtml } from "../widget-html.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// plan_visualization and widgetRenderer are PASSIVE — they
// just take the args the model produces and surface them as artifacts
// so the frontend can render them. deepagents also injects:
//   - write_todos: plan card
//   - task: subagent delegation
//   - filesystem tools: skill markdown read access
// (no need to define those here)

/**
 * @param {unknown} value
 */
function normalizeKeyElements(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 4);
  return String(value ?? "")
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

const STEM_SUBJECTS = ["physics", "math", "cs"];

export const planVisualizationTool = tool(
  async ({ title, approach, technology, key_elements, subject }) => {
    let plan = JSON.stringify({
      type: "visualization_plan",
      title: title ?? "Visualization plan",
      approach,
      technology,
      keyElements: normalizeKeyElements(key_elements),
    });

    if (subject && STEM_SUBJECTS.includes(subject)) {
      try {
        const apiDocPath = resolve(__dirname, "../../skills/stem/", `${subject}-api.md`);
        const apiDoc = readFileSync(apiDocPath, "utf-8");
        plan += `\n\n---\n## ${subject.toUpperCase()} Runtime API Reference\n${apiDoc}`;
      } catch {
        // API doc not found — proceed without it
      }
    }

    return plan;
  },
  {
    name: "plan_visualization",
    description:
      "Plan a widget before building it. MUST be followed immediately by the matching render tool in the same turn (widgetRenderer or stemRenderer) — never as a standalone final call. Extract the user's non-negotiable visual/interaction requirements into key_elements; do not replace them with generic topic bullets. For physics/math/cs simulations, set subject to 'physics', 'math', or 'cs' to receive the Runtime API reference.",
    schema: PlanVisualizationArgsSchema,
  },
);

const WIDGET_RENDERER_DESCRIPTION = [
  "Render an interactive HTML/CSS/JS learning widget in a sandboxed iframe. MUST be used after plan_visualization for any visualization / simulation / demo request.",
  "If you use an external browser library, include it in the optional dependencies array as {url, global, kind}; only Primoria's fixed whitelist is accepted, so prefer d3, cytoscape, Chart, gsap, THREE, anime, Matter, p5, math, L, mermaid, or echarts exact CDN URLs already known to the renderer.",
  "Never put external <script src> or <link href> dependency tags in html; declare every external library only through the dependencies array and reference its global from inline code.",
  "Return a compact self-contained HTML fragment in the html argument: no doctype, no html/head/body wrapper, inline style/script only, target 70-130 lines and under about 8KB.",
  "Every inline <script> must be fully closed. If the widget approaches the size limit, simplify decorative CSS and prose before shortening or dropping executable code.",
  "Implement every concrete requirement from the latest user message and the plan key_elements as visible UI behavior, not just hidden code.",
  "Prefer one canvas or one inline SVG plus a small control/status panel; avoid verbose CSS, verbose explanatory text, and duplicate UI.",
  "Avoid D3 unless absolutely necessary; for SVG, prefer plain DOM APIs such as createElementNS/setAttribute over complex D3 chains.",
  "Include visible labels/legend/status for the important objects and comparisons so the learner can verify the concept by eye.",
  "For physics/math visualizations, label anchors, extrema, variables, current values, and measured comparisons (for example equal areas, distances, angles, elapsed time) whenever the user mentions them.",
  "Use CSS variables when useful and include interactive controls where appropriate.",
  "Build as an inline responsive widget for a chat/course page, not a full-screen app shell; do not style body/html and do not use 100vh page layouts.",
  WIDGET_STYLE_PROMPT,
].join(" ");

/**
 * @param {unknown} dependencies
 */
function normalizeWidgetDependencies(dependencies) {
  if (!Array.isArray(dependencies)) return [];
  const seen = new Set();
  const normalized = [];
  for (const dep of dependencies) {
    const allowed = WIDGET_DEPENDENCIES_BY_URL.get(String(dep?.url ?? "").trim());
    if (!allowed || seen.has(allowed.url)) continue;
    seen.add(allowed.url);
    normalized.push(allowed);
    if (normalized.length >= 6) break;
  }
  return normalized;
}

export const widgetRendererTool = tool(
  async ({ title, description, html, dependencies }) => {
    return JSON.stringify({
      type: "html_widget",
      title: title || "Interactive learning widget",
      description,
      html: normalizeWidgetHtml(html),
      dependencies: normalizeWidgetDependencies(dependencies),
    });
  },
  {
    name: "widgetRenderer",
    description: WIDGET_RENDERER_DESCRIPTION,
    schema: WidgetRendererArgsSchema,
    // Avoid a second post-tool model call with the full HTML in context.
    // That second call is where Anthropic-compatible MiniMax often hit the
    // ~60s terminated/RUN_ERROR path, which then confused AG-UI's event state.
    returnDirect: true,
  },
);

export const stemRendererTool = tool(
  async ({ subject, scene, title, description, code }) => {
    return JSON.stringify({
      type: "stem_renderer",
      subject,
      scene,
      title,
      description,
      code,
    });
  },
  {
    name: "stemRenderer",
    description:
      "Render a STEM simulation in a sandboxed iframe using a pre-loaded subject Runtime API. Use ONLY for rigid-body physics (Matter.js PhysicsRuntime), math function plots (MathGL Canvas), or CS algorithm step-by-step visualizations (AlgoViz). MUST be called after plan_visualization with subject set. The code argument must ONLY use the Runtime API methods documented by plan_visualization — do NOT import libraries, do NOT call Matter.Engine directly, do NOT use DOM APIs outside the API.",
    schema: StemRendererArgsSchema,
    returnDirect: true,
  },
);

const RENDER_3D_SCENE_DESCRIPTION = [
  "Render a 3D scientific visualization using THREE.js. Use for inherently 3D concepts: 3D vector operations, electric/magnetic/gravitational fields, orbital mechanics, wave propagation in 3D, molecular geometry (bond angles, VSEPR, orbitals), crystal lattice structures, 3D surfaces. Do NOT use for 2D physics (use render_physics_scene) or 2D charts.",
  "IMPORTANT: Use a plain <script> (NOT type=\"module\", NO import statements). THREE is auto-loaded from CDN when THREE. appears in the code; use the THREE global directly. OrbitControls is available as new THREE.OrbitControls(camera, domElement) - provided by the runtime shim.",
  "REQUIRED sections (all must be present):\n1. Container + WebGLRenderer using the shared page palette for the background, setPixelRatio capped at 2\n2. PerspectiveCamera(45, aspect, 0.1, 1000) at position (8, 6, 8)\n3. Three lights: AmbientLight(0xb8d4ff, 0.4) + DirectionalLight key(0xffffff, 0.8) at (5,8,5) + DirectionalLight rim(0xff66aa, 0.35) at (-5,-3,-5)\n4. new THREE.OrbitControls(camera, renderer.domElement) with enableDamping + dampingFactor 0.05\n5. GridHelper(10, 10, 0xccbbaa, 0xddd0c0)\n6. makeLabel(text) - CanvasTexture Sprite with depthTest:false for text annotations\n7. animate() loop - requestAnimationFrame + controls.update() + renderer.render()\n8. ResizeObserver - update camera.aspect + renderer.setSize on container resize",
  WIDGET_STYLE_PROMPT,
  "Container: <div id=\"scene\" style=\"width:100%;height:480px\">. Add overlay sliders/buttons for key parameters and a readout panel for live values.",
].join("\n\n");

export const render3dSceneTool = tool(
  async ({ title, description, html }) => {
    return JSON.stringify({
      type: "html_widget",
      title: title || "3D Scene",
      description,
      html: normalizeWidgetHtml(html),
    });
  },
  {
    name: "render_3d_scene",
    description: RENDER_3D_SCENE_DESCRIPTION,
    schema: Render3dSceneArgsSchema,
    returnDirect: true,
  },
);
