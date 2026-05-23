# MathGL API Reference

MathGL is a pure Canvas 2D runtime (no CDN, no imports) exposed as `window.MathGL`.

---

## Scene Setup

```js
const scene = MathGL.scene({
  xMin: -6,   // x-axis left bound  (default -6)
  xMax: 6,    // x-axis right bound (default  6)
  yMin: -4,   // y-axis bottom      (default -4)
  yMax: 4,    // y-axis top         (default  4)
  height: 420,// canvas height px   (default 420)
  grid: true, // background grid    (default true)
  axes: true, // axes + tick labels (default true)
  title: '',  // optional title string
});
```

---

## Methods

### scene.plot(fn, opts)
Draw a function `y = fn(x)` curve.
- `fn`: `(x: number) => number`
- `opts.color` — hex/rgba string (auto-assigned if omitted)
- `opts.width` — line width in px (default 2)
- `opts.label` — legend label
- `opts.dash`  — lineDash array e.g. `[6,4]`
- `opts.domain` — `[xA, xB]` to limit plotting range

### scene.parametric(xFn, yFn, opts)
Draw a parametric curve `(xFn(t), yFn(t))`.
- `xFn`, `yFn`: `(t: number) => number`
- `opts.tMin`, `opts.tMax` — parameter range (default `[0, 2π]`)
- `opts.steps` — sample count (default 600)
- `opts.color`, `opts.width`, `opts.label`

### scene.point(x, y, opts)
Draw a dot. `x`/`y` may be getter functions returned by `slider()`.
- `opts.color`, `opts.radius` (default 5)
- `opts.label`, `opts.labelAnchor`: `'top'|'bottom'|'left'|'right'`

### scene.vector(x0, y0, dx, dy, opts)
Draw an arrow from `(x0,y0)` with components `(dx,dy)`. All four coords may be getters.
- `opts.color`, `opts.width`, `opts.label`

### scene.area(fn, xA, xB, opts)
Shade the area under `fn` between `xA` and `xB`. `xA`/`xB` may be getters.
- `opts.color` — fill color (default semi-transparent blue)

### scene.tangent(fn, x0, opts)
Draw the tangent line to `fn` at `x0`. `x0` may be a getter.
- `opts.color`, `opts.width`
- `opts.label` — may be a function `(slope) => string`

### scene.text(x, y, str, opts)
Place a text label at math coordinates `(x, y)`. All args may be getters/functions.
- `opts.size` (px, default 13), `opts.color`, `opts.align`, `opts.anchor`

### scene.polygon(points, opts)
Draw a filled polygon. `points`: `[[x,y], ...]`
- `opts.fill`, `opts.stroke`, `opts.width`

### scene.circle(cx, cy, r, opts)
Draw a circle. `cx`/`cy`/`r` may be getters.
- `opts.fill`, `opts.stroke`, `opts.width`, `opts.label`

### scene.slider(id, opts) → getter
Add an interactive range slider below the canvas. Returns a getter `() => currentValue`.
- `opts.label` — displayed label
- `opts.min`, `opts.max`, `opts.step`, `opts.value` (initial)
- **Must be called before any draw call that uses its value.**

### scene.animate(fn)
Register an animation callback `fn(t)` where `t` is elapsed seconds. Called every frame.
- **Call before `scene.run()`.**
- Use to update animated state; any getter-based draws redraw automatically.

### scene.onClick(fn)
Register `fn(mathX, mathY)` called on canvas click.

### scene.run()
**Must be the last call.** Starts the render loop (or one-shot draw if no animation).

---

## Rules

1. Always call `plan_visualization` with `subject="math"` first.
2. `scene.run()` MUST be the last line of code — nothing after it.
3. `scene.slider()` MUST be called before any draw call that uses its getter.
4. For animated scenes, register `scene.animate(fn)` before `scene.run()`.
5. Do NOT add `import` statements — the runtime is pre-loaded.
6. Do NOT create `<canvas>` yourself — the runtime creates it inside `#math-container`.

---

## Color palette (auto-cycling when `color` is omitted)

`#378ADD` (blue) · `#D85A30` (orange) · `#1D9E75` (green) · `#8B5CF6` (purple) · `#F59E0B` (amber) · `#EC4899` (pink)

---

## Example 1 — Sine & Cosine with Intersection Points

```js
const scene = MathGL.scene({ xMin: -2*Math.PI, xMax: 2*Math.PI, yMin: -1.6, yMax: 1.6, title: 'sin(x) vs cos(x)' });

scene.plot(x => Math.sin(x), { label: 'sin(x)', color: '#378ADD' });
scene.plot(x => Math.cos(x), { label: 'cos(x)', color: '#D85A30' });

// Intersections: sin(x)=cos(x) → x = π/4 + nπ
[-7, -3, 1, 5].map(n => n * Math.PI / 4).filter(x => x >= -2*Math.PI && x <= 2*Math.PI).forEach(x => {
  scene.point(x, Math.sin(x), { color: '#1D9E75', radius: 5, label: '(' + x.toFixed(2) + ', ' + Math.sin(x).toFixed(2) + ')', labelAnchor: 'top' });
});

scene.run();
```

---

## Example 2 — Unit Circle with Animated Moving Point

```js
const scene = MathGL.scene({ xMin: -1.8, xMax: 1.8, yMin: -1.5, yMax: 1.5, title: 'Unit Circle' });

scene.circle(0, 0, 1, { stroke: '#8B5CF6', fill: 'rgba(139,92,246,0.06)', width: 2 });
scene.plot(t => Math.cos(t), { color: 'transparent' }); // invisible, forces domain

let angle = 0;
scene.animate(t => { angle = t * 0.8; });

// Moving point on circle
scene.point(() => Math.cos(angle), () => Math.sin(angle), {
  color: '#D85A30', radius: 7,
  label: () => '(' + Math.cos(angle).toFixed(2) + ', ' + Math.sin(angle).toFixed(2) + ')',
  labelAnchor: 'top',
});

// Radius vector
scene.vector(0, 0, () => Math.cos(angle), () => Math.sin(angle), { color: '#378ADD', label: 'r=1' });

scene.run();
```

---

## Example 3 — Derivative: Tangent Line with Slider

```js
const scene = MathGL.scene({ xMin: -3, xMax: 3, yMin: -5, yMax: 5, title: "f(x) = x³ – 3x  and  f'(x)" });

const fn  = x => x*x*x - 3*x;
const dfn = x => 3*x*x - 3;

const getX0 = scene.slider('x₀', { label: 'x₀', min: -2.5, max: 2.5, step: 0.05, value: 1 });

scene.area(fn, -3, () => getX0(), { color: 'rgba(55,138,221,0.10)' });
scene.plot(fn,  { color: '#378ADD', label: 'f(x) = x³–3x' });
scene.plot(dfn, { color: '#1D9E75', label: "f'(x) = 3x²–3", dash: [5, 4] });
scene.tangent(fn, getX0, {
  color: '#D85A30',
  label: slope => "slope = " + slope.toFixed(2),
});
scene.point(getX0, () => fn(getX0()), { color: '#D85A30', radius: 6, label: 'P', labelAnchor: 'right' });

scene.run();
```

---

## Example 4 — Vector Addition

```js
const scene = MathGL.scene({ xMin: -1, xMax: 6, yMin: -1, yMax: 5, title: 'Vector Addition: a + b = c' });

const ax = scene.slider('aₓ', { label: 'a x', min: 0, max: 4, step: 0.1, value: 3 });
const ay = scene.slider('aᵧ', { label: 'a y', min: 0, max: 4, step: 0.1, value: 1 });
const bx = scene.slider('bₓ', { label: 'b x', min: 0, max: 4, step: 0.1, value: 1 });
const by = scene.slider('bᵧ', { label: 'b y', min: 0, max: 4, step: 0.1, value: 3 });

scene.vector(0, 0, ax, ay, { color: '#378ADD', width: 2.5, label: 'a' });
scene.vector(0, 0, bx, by, { color: '#D85A30', width: 2.5, label: 'b' });
// resultant drawn at tip of a
scene.vector(ax, ay, bx, by, { color: '#1D9E75', width: 2, dash: true });
// and from origin
scene.vector(0, 0, () => ax() + bx(), () => ay() + by(), {
  color: '#1D9E75', width: 2.5,
  label: () => 'a+b = (' + (ax()+bx()).toFixed(1) + ', ' + (ay()+by()).toFixed(1) + ')',
});

scene.run();
```

---

## Example 5 — Fourier Series (Square Wave)

```js
const scene = MathGL.scene({ xMin: -Math.PI, xMax: Math.PI, yMin: -1.5, yMax: 1.5, title: 'Fourier Series → Square Wave' });

// Reference square wave
scene.plot(x => (x >= 0 ? 1 : -1), { color: 'rgba(180,178,169,0.5)', width: 1, dash: [4, 3], label: 'square' });

const getNTerms = scene.slider('N', { label: 'Terms N', min: 1, max: 25, step: 1, value: 3 });

scene.plot(x => {
  var n = Math.round(getNTerms());
  var sum = 0;
  for (var k = 0; k < n; k++) {
    var m = 2 * k + 1;
    sum += Math.sin(m * x) / m;
  }
  return (4 / Math.PI) * sum;
}, { color: '#378ADD', label: () => 'Fourier N=' + Math.round(getNTerms()) });

scene.run();
```
