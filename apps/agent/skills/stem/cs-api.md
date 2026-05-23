# AlgoViz Runtime API Reference (subject="cs")

The `window.AlgoViz` global is pre-loaded. Do NOT import any library.

## Scene initialization

```js
const scene = AlgoViz.scene({ title, height });
```

- `title` — shown at the top of the canvas (string)
- `height` — canvas height in pixels (default 400)

**`scene.run()` MUST be the LAST line of your code.**

---

## Primitives

### `scene.array(values)` → ArrayViz

```js
const arr = scene.array([64, 34, 25, 12, 22, 11, 90]);
```

| Method | Description |
|--------|-------------|
| `arr.length` | Read-only length |
| `arr.getValue(i)` | Return value at index i |
| `arr.setValue(i, v)` | Set value at index i |
| `arr.highlight(i, state)` | Color bar i with a state name |
| `arr.clearHighlights()` | Reset all highlights to 'default' |
| `arr.swap(i, j)` | Swap values and highlights at i and j |
| `arr.setLabel(i, text)` | Show a pointer label below bar i (e.g. "pivot", "i", "j") |
| `arr.clearLabels()` | Remove all pointer labels |

---

### `scene.graph({ directed, layout })` → GraphViz

```js
const g = scene.graph({ directed: false, layout: 'circular' });
```

- `directed` — boolean, draw arrowheads (default false)
- `layout` — `'circular'` (auto) or `'manual'` (supply x/y in addNode)

| Method | Description |
|--------|-------------|
| `g.addNode(id, label, { x?, y? })` | Add a node; returns id |
| `g.addEdge(from, to, { weight?, label? })` | Add an edge |
| `g.highlightNode(id, state)` | Color node |
| `g.highlightEdge(from, to, state)` | Color edge |
| `g.clearHighlights()` | Reset all to 'default' |

---

### `scene.tree()` → TreeViz

```js
const tree = scene.tree();
```

| Method | Description |
|--------|-------------|
| `tree.insert(value)` | BST insert; auto-computes layout |
| `tree.highlightNode(value, state)` | Color node by value |
| `tree.highlightPath(values, state)` | Color multiple nodes at once |
| `tree.clearHighlights()` | Reset all to 'default' |

---

### `scene.stack()` → StackViz

```js
const s = scene.stack();
```

| Method | Description |
|--------|-------------|
| `s.push(value)` | Push to top |
| `s.pop()` | Pop from top, returns value |
| `s.peek()` | Peek at top, returns value |
| `s.length` | Read-only length |
| `s.highlight(i, state)` | Color item at index i (0 = bottom) |
| `s.clearHighlights()` | Reset all highlights |

---

### `scene.queue()` → QueueViz

```js
const q = scene.queue();
```

| Method | Description |
|--------|-------------|
| `q.enqueue(value)` | Add to back |
| `q.dequeue()` | Remove from front, returns value |
| `q.peek()` | Peek at front, returns value |
| `q.length` | Read-only length |
| `q.highlight(i, state)` | Color item at index i (0 = front) |
| `q.clearHighlights()` | Reset all highlights |

---

## Step capture

```js
scene.step("description of current algorithm state");
```

Call `scene.step()` after every meaningful state change. The runtime snapshots all viz objects at that point. The built-in step controller lets users navigate, play, and pause through all steps.

---

## Stats

```js
let comparisons = 0, swaps = 0;
scene.stat('比较次数', () => comparisons);
scene.stat('交换次数', () => swaps);
```

Stats are captured at each `scene.step()` call and displayed in the control bar. Register all stats BEFORE the first `scene.step()`.

---

## State color names

Use these exact string names in `highlight(i, state)`:

| State | Color | Meaning |
|-------|-------|---------|
| `'default'` | neutral gray | unvisited |
| `'active'` | #378ADD blue | currently visiting |
| `'comparing'` | #F59E0B amber | being compared |
| `'sorted'` | #1D9E75 green | finalized/visited |
| `'pivot'` | #8B5CF6 purple | pivot element |
| `'swapping'` | #D85A30 orange-red | being swapped |
| `'path'` | #EC4899 pink | final shortest path |
| `'queued'` | #93C5FD light blue | in the queue |
| `'visited'` | #6B7280 gray | already processed |

---

## Complete examples

### Example 1 — Bubble Sort (array + comparisons + swaps)

```js
const scene = AlgoViz.scene({ title: '冒泡排序', height: 420 });
const arr = scene.array([64, 34, 25, 12, 22, 11, 90]);
let comparisons = 0, swaps = 0;
scene.stat('比较次数', () => comparisons);
scene.stat('交换次数', () => swaps);

const n = arr.length;
scene.step('初始状态');
for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    arr.highlight(j, 'comparing');
    arr.highlight(j + 1, 'comparing');
    comparisons++;
    scene.step('比较 arr[' + j + ']=' + arr.getValue(j) + ' 与 arr[' + (j+1) + ']=' + arr.getValue(j+1));
    if (arr.getValue(j) > arr.getValue(j + 1)) {
      arr.highlight(j, 'swapping');
      arr.highlight(j + 1, 'swapping');
      arr.swap(j, j + 1);
      swaps++;
      scene.step('交换 arr[' + j + '] 和 arr[' + (j+1) + ']');
    }
    arr.clearHighlights();
    for (let k = n - 1 - i; k < n; k++) arr.highlight(k, 'sorted');
  }
  arr.highlight(n - 1 - i, 'sorted');
}
for (let k = 0; k < n; k++) arr.highlight(k, 'sorted');
scene.step('排序完成！');
scene.run();
```

---

### Example 2 — BFS Graph Traversal (graph + queue)

```js
const scene = AlgoViz.scene({ title: 'BFS 广度优先遍历', height: 480 });
const g = scene.graph({ directed: false });
['A','B','C','D','E','F'].forEach(id => g.addNode(id));
[['A','B'],['A','C'],['B','D'],['B','E'],['C','F']].forEach(([a,b]) => g.addEdge(a,b));
const q = scene.queue();

let visitOrder = 0;
scene.stat('访问顺序', () => visitOrder);

scene.step('初始图，从 A 开始 BFS');
const visited = new Set();
function bfs(start) {
  q.enqueue(start);
  visited.add(start);
  g.highlightNode(start, 'queued');
  scene.step('将 ' + start + ' 加入队列');
  while (q.length > 0) {
    const node = q.dequeue();
    visitOrder++;
    g.highlightNode(node, 'active');
    scene.step('访问节点 ' + node + '（出队）');
    g.highlightNode(node, 'sorted');
    const neighbors = ['A','B','C','D','E','F'].filter(n => {
      return [['A','B'],['A','C'],['B','D'],['B','E'],['C','F']].some(
        ([a,b]) => (a===node&&b===n)||(b===node&&a===n)
      );
    });
    neighbors.forEach(nb => {
      if (!visited.has(nb)) {
        visited.add(nb);
        q.enqueue(nb);
        g.highlightNode(nb, 'queued');
        scene.step('将邻居 ' + nb + ' 加入队列');
      }
    });
  }
}
bfs('A');
scene.step('BFS 遍历完成');
scene.run();
```

---

### Example 3 — BST Insert (tree path highlight)

```js
const scene = AlgoViz.scene({ title: 'BST 插入演示', height: 460 });
const tree = scene.tree();
const values = [5, 3, 7, 1, 4, 6, 8];

scene.step('空树');
values.forEach(v => {
  tree.clearHighlights();
  tree.insert(v);
  tree.highlightNode(v, 'active');
  scene.step('插入 ' + v);
  tree.highlightNode(v, 'sorted');
  scene.step(v + ' 已就位');
});
scene.run();
```

---

### Example 4 — Stack Parentheses Matching

```js
const scene = AlgoViz.scene({ title: '括号匹配', height: 380 });
const s = scene.stack();
const input = '({[()]})';
let matched = 0, total = 0;
scene.stat('已匹配', () => matched);
scene.stat('处理字符', () => total);

scene.step('输入: ' + input);
const pairs = { ')':'(', ']':'[', '}':'{' };
let valid = true;
for (let i = 0; i < input.length; i++) {
  const ch = input[i];
  total++;
  if ('([{'.includes(ch)) {
    s.push(ch);
    s.highlight(s.length - 1, 'active');
    scene.step('推入 ' + ch);
  } else {
    if (s.length === 0 || s.peek() !== pairs[ch]) {
      s.highlight(s.length - 1, 'swapping');
      scene.step('不匹配！' + ch + ' 没有对应的左括号');
      valid = false; break;
    }
    s.highlight(s.length - 1, 'comparing');
    scene.step('匹配 ' + s.peek() + ' 与 ' + ch);
    s.pop();
    matched++;
    scene.step('弹出 ' + pairs[ch] + '，匹配成功');
  }
}
scene.step(valid && s.length === 0 ? '括号完全匹配！' : '括号不匹配');
scene.run();
```

---

### Example 5 — Binary Search (array + pointer labels)

```js
const scene = AlgoViz.scene({ title: '二分搜索', height: 400 });
const arr = scene.array([2, 5, 8, 12, 16, 23, 38, 56, 72, 91]);
const target = 23;
let comparisons = 0;
scene.stat('比较次数', () => comparisons);
scene.stat('目标值', () => target);

let left = 0, right = arr.length - 1;
arr.setLabel(left, 'L');
arr.setLabel(right, 'R');
scene.step('初始状态，目标 = ' + target);

let found = false;
while (left <= right) {
  const mid = Math.floor((left + right) / 2);
  arr.clearHighlights(); arr.clearLabels();
  arr.highlight(mid, 'active');
  arr.setLabel(left, 'L'); arr.setLabel(mid, 'mid'); arr.setLabel(right, 'R');
  comparisons++;
  scene.step('mid=' + mid + '，arr[mid]=' + arr.getValue(mid) + '，比较目标 ' + target);
  if (arr.getValue(mid) === target) {
    arr.highlight(mid, 'sorted');
    scene.step('找到目标 ' + target + ' 在索引 ' + mid + '！');
    found = true; break;
  } else if (arr.getValue(mid) < target) {
    arr.highlight(mid, 'visited');
    left = mid + 1;
    scene.step(arr.getValue(mid) + ' < ' + target + '，搜索右半部分');
  } else {
    arr.highlight(mid, 'visited');
    right = mid - 1;
    scene.step(arr.getValue(mid) + ' > ' + target + '，搜索左半部分');
  }
}
if (!found) scene.step('目标 ' + target + ' 不存在');
scene.run();
```
