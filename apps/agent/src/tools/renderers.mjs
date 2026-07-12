import { tool } from "@langchain/core/tools";
import {
  RenderAlgorithmArgsSchema,
  RenderChartArgsSchema,
  RenderDiagramArgsSchema,
  RenderGraphArgsSchema,
  RenderMathExplorerArgsSchema,
  RenderMoleculeArgsSchema,
  RenderPhysicsSceneArgsSchema,
  RenderWaveArgsSchema,
} from "@primoria/contracts/artifacts/schemas";

export const renderChartTool = tool(
  async ({ title, description, option, height }) => {
    return JSON.stringify({
      type: "echarts_widget",
      title: title ?? "Chart",
      description: description ?? "",
      option,
      height,
    });
  },
  {
    name: "render_chart",
    description:
      "Render a chart or data visualization using ECharts. Use this for charts, graphs, data plots, mathematical function curves, bar/line/scatter/pie/radar/treemap/heatmap. Output a complete valid ECharts option JSON. Do NOT call plan_visualization before this tool. One chart answers one learning question: 3-6 data items, direct labels over legends. Colors come from the registered Primoria theme applied by the renderer (bars automatically get pale fill + darker stroke) — do NOT set color, itemStyle colors, or backgroundColor in the option unless a state is semantically correct/wrong.",
    schema: RenderChartArgsSchema,
    returnDirect: true,
  },
);

export const renderDiagramTool = tool(
  async ({ title, definition }) => {
    return JSON.stringify({
      type: "mermaid_diagram",
      title: title ?? "Diagram",
      definition,
    });
  },
  {
    name: "render_diagram",
    description:
      "Render a diagram using Mermaid DSL. Use for flowcharts, sequence diagrams, class diagrams, ER diagrams, mind maps, state machines, architecture diagrams, process flows. Output a valid Mermaid definition string. Do NOT call plan_visualization before this tool.",
    schema: RenderDiagramArgsSchema,
    returnDirect: true,
  },
);

export const renderPhysicsSceneTool = tool(
  async ({ title, description, scene }) => {
    return JSON.stringify({
      type: "physics_scene",
      title: title ?? "Physics Simulation",
      description: description ?? "",
      scene,
    });
  },
  {
    name: "render_physics_scene",
    description:
      "Render an interactive physics simulation using Matter.js. Use for pendulums, Newton's cradle, collisions, projectile motion, springs, inclined planes, falling objects, rigid-body dynamics. NEVER write simulation code — describe the scene as JSON with bodies (circles/rectangles/polygons with positions, velocities, material properties) and constraints (rods, strings, springs). The Matter.js engine handles all physics automatically. Coordinate system: (0,0) = top-left, x right, y down. Typical scene: width 600 height 400. isStatic:true = fixed anchor. Use label on bodies for educational annotations. Do NOT call plan_visualization before this tool.",
    schema: RenderPhysicsSceneArgsSchema,
    returnDirect: true,
  },
);

/** @param {number[] | undefined} range @returns {[number, number] | undefined} */
function normalizeMathRange(range) {
  if (!Array.isArray(range)) return undefined;
  return [range[0], range[1]];
}

export const renderAlgorithmTool = tool(
  async ({ title, description, algorithm, steps }) => {
    return JSON.stringify({
      type: "algorithm_visualization",
      title: title || "Algorithm",
      description,
      algorithm,
      steps,
    });
  },
  {
    name: "render_algorithm",
    description:
      "Render a step-by-step algorithm visualization with play/pause/step controls. Use for: sorting, binary search, two-pointer/sliding-window, tree algorithms (BST, heap, traversals), graph algorithms (BFS/DFS/Dijkstra/MST/topo-sort), dynamic programming. Do NOT call plan_visualization before this tool.\n\nSteps per kind:\n- kind=\"array\": provide array.values[] and array.highlights[]. Use pointers[] for i/j/left/right labels.\n- kind=\"tree\": provide tree.nodes[] with id/value/parentId/left/right. Renderer auto-positions nodes.\n- kind=\"graph\": provide graph.nodes[] (id, label, x [0-1], y [0-1]) and graph.edges[]. Include queue[]/stack[] per step.\n- kind=\"table\": provide table.data[][] and table.highlights[]. Include rowLabels/colLabels and formula per step.\n\nMax 60 steps. Show every individual comparison/swap/visit.",
    schema: RenderAlgorithmArgsSchema,
    returnDirect: true,
  },
);

export const renderMathExplorerTool = tool(
  async ({ title, description, mode, functions, curves, parameters, xRange, yRange, tRange, xLabel, yLabel }) => {
    return JSON.stringify({
      type: "math_explorer",
      title: title || "Math Explorer",
      description,
      mode,
      functions,
      curves,
      parameters,
      xRange: normalizeMathRange(xRange),
      yRange: normalizeMathRange(yRange),
      tRange: normalizeMathRange(tRange),
      xLabel,
      yLabel,
    });
  },
  {
    name: "render_math_explorer",
    description:
      "Render an interactive math/function explorer with canvas and parameter sliders. Use for: Taylor series, Fourier series partial sums, parametric curves (Lissajous, cycloid, rose curve), function exploration with amplitude/frequency/phase sliders, polynomial degree sliders. Do NOT use for static charts (use render_chart) or 3D scenes (use render_3d_scene). Do NOT call plan_visualization before this tool.\n\nmode='cartesian' (default): y=f(x). functions[].expr: mathjs expression in x and param names. Examples: 'sin(k*x)+c', 'x^n', 'A*cos(omega*x+phi)'.\nmode='parametric': x(t),y(t). curves[].xExpr + curves[].yExpr in t and params. Lissajous: { xExpr:'cos(a*t)', yExpr:'sin(b*t)' }, tRange:[0,6.28].\n\nSERIES — do NOT use sum(k,1,N,expr), mathjs has no symbolic loop summation. For N-term series, gate each term: sin(x) + (N>=3)*sin(3*x)/3 + (N>=5)*sin(5*x)/5.\n\nparameters[]: {name, label?, min, max, default, step?}. Every param must appear in an expression. Max 6 parameters. xRange/yRange/tRange optional; auto-computed if omitted.",
    schema: RenderMathExplorerArgsSchema,
    returnDirect: true,
  },
);

export const renderWaveTool = tool(
  async ({ title, description, waves, layout, timeScale, audioEnabled, audioFrequencies }) => {
    return JSON.stringify({
      type: "wave_visualization",
      title: title || "Wave Visualization",
      description,
      waves,
      layout: layout || "superposition",
      timeScale: timeScale ?? 3,
      audioEnabled: audioEnabled ?? false,
      audioFrequencies,
    });
  },
  {
    name: "render_wave",
    description:
      "Render an interactive 1D/2D wave visualization with play/pause, per-wave amplitude/frequency sliders, and optional audio. Use for: wave superposition, interference (constructive/destructive), beat frequency, standing waves, 声波叠加, 拍频, 驻波, 相消/相长干涉.\n\nDo NOT use for 3D electromagnetic wave E-B components (use render_3d_scene). Do NOT use for static function plots (use render_chart).\n\nlayout:\n- 'superposition': N component strips + sum strip. Use 2-4 waves.\n- 'beat': Two waves close in frequency + sum + amplitude envelope auto-annotated with T_beat. Set audioEnabled=true.\n- 'standing': Spatial snapshot y(x,t) oscillating over time. Nodes (N) and antinodes (A) auto-labeled.\n\nFrequency guidelines:\n- Visual-only demos: 0.5–5 Hz (slow enough to see wave shapes clearly)\n- Beat with audio: display waves at 2–5 Hz, set audioFrequencies=[f1_audio, f2_audio] (e.g. [440, 444]) for audible sound\n- Standing waves: use frequency=1 for fundamental, frequency=2 for second harmonic, etc.\n\nFor beat with audioEnabled=true: set audioFrequencies to a pair of audio-range frequencies (e.g. [440, 444]) while keeping display waves at low visual frequencies. Amplitude 0.0–1.0. Phase in radians.",
    schema: RenderWaveArgsSchema,
    returnDirect: true,
  },
);

export const renderGraphTool = tool(
  async ({ title, description, nodes, edges, directed, layout }) => {
    return JSON.stringify({
      type: "graph_visualization",
      title: title || "Graph",
      description,
      nodes,
      edges,
      directed: directed ?? false,
      layout: layout || "force",
    });
  },
  {
    name: "render_graph",
    description:
      "Render an interactive force-directed graph with draggable nodes, click-to-highlight neighbors, and zoom/pan. Use for: knowledge graphs, concept maps, dependency graphs, social/actor networks, org charts with many nodes, call graphs, FSMs with many states, ontologies.\n\nUse render_diagram (Mermaid) instead for: flowcharts/sequence/ER/class diagrams with <10 nodes or strict left-to-right flow.\n\nNodes: id required; label defaults to id; group assigns a color family (up to 4 groups: pine/amber/lavender/rose; 'sage' is accepted as an alias of pine); size multiplier 0.5–3.\nEdges: source/target reference node ids; directed overrides artifact-level directed flag per edge.\nlayout:\n- 'force' (default): spring-repulsion, best for general networks\n- 'tree': top-down hierarchy from root (no-incoming-edge) nodes\n- 'circle': all nodes equidistant on a circle\n- 'grid': uniform grid\ndirected: global arrow flag; individual edges can override with edge.directed.",
    schema: RenderGraphArgsSchema,
    returnDirect: true,
  },
);

export const renderMoleculeTool = tool(
  async ({ title, description, atoms, bonds, representation }) => {
    return JSON.stringify({
      type: "molecule",
      title: title || "Molecule",
      description,
      atoms,
      bonds,
      representation: representation ?? "ball_stick",
    });
  },
  {
    name: "render_molecule",
    description:
      "Render an interactive 3D molecular structure with CPK colors, drag-to-rotate, scroll-to-zoom, ball-and-stick/stick/space-fill views, and single/double/triple bond rendering.\n\nUse for: molecules (H₂O, CO₂, CH₄, benzene, ethanol, amino acids, DNA bases, organic functional groups, VSEPR geometries, crystal fragments).\n\nDo NOT use for abstract 3D vector fields or orbital mechanics — those belong in render_3d_scene.\n\nAtom coordinates in Angstroms. Standard geometries:\n- Water: O(0,0,0), H1(0.76,-0.59,0), H2(-0.76,-0.59,0) — 2 bonds order=1\n- CO₂: O1(-1.16,0,0), C(0,0,0), O2(1.16,0,0) — 2 bonds order=2, linear\n- Methane: C(0,0,0), H1(0.63,0.63,0.63), H2(-0.63,-0.63,0.63), H3(-0.63,0.63,-0.63), H4(0.63,-0.63,-0.63)\n- Benzene: 6 C at (1.40·cos k·60°, 1.40·sin k·60°, 0) for k=0..5; 6 H at radius 2.49 Å; alternate bond orders 2,1,2,1,2,1\n- Ammonia (sp3): N(0,0,0), H1(0,0.94,0.35), H2(0.82,-0.47,0.35), H3(-0.82,-0.47,0.35)\nElement symbols match CPK standard: H(white), C(dark grey), N(blue), O(red), S(yellow), P(orange), Cl(green), Br(dark red), I(purple), Na/K/Ca/Mg/Fe available.",
    schema: RenderMoleculeArgsSchema,
    returnDirect: true,
  },
);
