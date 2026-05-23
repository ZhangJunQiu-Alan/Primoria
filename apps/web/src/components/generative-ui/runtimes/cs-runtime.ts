/**
 * AlgoViz Runtime — inlined into the iframe <script> block.
 * Pure Canvas 2D, no CDN. Exposes `window.AlgoViz` global.
 * Provides: array, graph, tree, stack, queue primitives + step controller.
 */
export const CS_RUNTIME_CODE = `
(function() {

  // ── State color convention ─────────────────────────────────────────────────
  var STATE = {
    default:   null,  // uses theme
    active:    { fill: '#378ADD', stroke: '#185FA5', text: '#fff' },
    comparing: { fill: '#F59E0B', stroke: '#B45309', text: '#fff' },
    sorted:    { fill: '#1D9E75', stroke: '#085041', text: '#fff' },
    pivot:     { fill: '#8B5CF6', stroke: '#6D28D9', text: '#fff' },
    swapping:  { fill: '#D85A30', stroke: '#9A3412', text: '#fff' },
    path:      { fill: '#EC4899', stroke: '#9D174D', text: '#fff' },
    queued:    { fill: '#93C5FD', stroke: '#3B82F6', text: '#1E3A8A' },
    visited:   { fill: '#6B7280', stroke: '#374151', text: '#fff' },
  };

  function isDark() { return matchMedia('(prefers-color-scheme: dark)').matches; }
  function theme() {
    var d = isDark();
    return {
      bg:          d ? '#1e1e1c' : '#ffffff',
      cellFill:    d ? '#2A2A28' : '#F0EFE9',
      cellStroke:  d ? '#504E49' : '#C8C5BC',
      cellText:    d ? '#D3D1C7' : '#3A3835',
      edge:        d ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)',
      text:        d ? '#A8A69F' : '#73726C',
      title:       d ? '#E8E6E0' : '#2A2925',
    };
  }

  function stateColors(state) {
    var c = STATE[state];
    if (c) return c;
    var T = theme();
    return { fill: T.cellFill, stroke: T.cellStroke, text: T.cellText };
  }

  // ── ArrayViz ───────────────────────────────────────────────────────────────
  function ArrayViz(values) {
    this._type = 'array';
    this._values = values.slice();
    this._highlights = new Array(values.length).fill('default');
    this._labels = new Array(values.length).fill('');
  }
  ArrayViz.prototype = {
    _type: 'array',
    get length() { return this._values.length; },
    getValue: function(i) { return this._values[i]; },
    setValue: function(i, v) { this._values[i] = v; },
    highlight: function(i, state) {
      if (i >= 0 && i < this._values.length) this._highlights[i] = state || 'default';
    },
    clearHighlights: function() {
      this._highlights = new Array(this._values.length).fill('default');
    },
    swap: function(i, j) {
      var tv = this._values[i]; this._values[i] = this._values[j]; this._values[j] = tv;
      var th = this._highlights[i]; this._highlights[i] = this._highlights[j]; this._highlights[j] = th;
    },
    setLabel: function(i, text) { this._labels[i] = text || ''; },
    clearLabels: function() { this._labels = new Array(this._values.length).fill(''); },
    snapshot: function() {
      return { v: this._values.slice(), h: this._highlights.slice(), l: this._labels.slice() };
    },
    restore: function(s) {
      this._values = s.v.slice();
      this._highlights = s.h.slice();
      this._labels = s.l.slice();
    },
    draw: function(ctx, rx, ry, rw, rh) {
      var n = this._values.length;
      if (!n) return;
      var maxVal = 1;
      for (var i = 0; i < n; i++) if (Math.abs(this._values[i]) > maxVal) maxVal = Math.abs(this._values[i]);
      var gapX = rw / n;
      var barW = Math.max(18, gapX * 0.72);
      var barsAreaH = rh * 0.62;
      var barsTop = ry + rh * 0.08;
      var T = theme();
      for (var i = 0; i < n; i++) {
        var cx = rx + gapX * (i + 0.5);
        var barH = Math.max(4, (Math.abs(this._values[i]) / maxVal) * barsAreaH);
        var barY = barsTop + barsAreaH - barH;
        var c = stateColors(this._highlights[i]);
        ctx.fillStyle = c.fill;
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(cx - barW/2, barY, barW, barH, [3, 3, 0, 0]); }
        else { ctx.rect(cx - barW/2, barY, barW, barH); }
        ctx.fill(); ctx.stroke();
        // value above bar
        ctx.fillStyle = c.text;
        ctx.font = 'bold ' + Math.min(12, Math.max(9, barW * 0.45)) + 'px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(this._values[i], cx, barY - 2);
        // index below
        ctx.fillStyle = T.text;
        ctx.font = '10px system-ui,sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(i, cx, barsTop + barsAreaH + 4);
        // pointer label
        if (this._labels[i]) {
          ctx.fillStyle = '#D85A30';
          ctx.font = 'bold 11px system-ui,sans-serif';
          ctx.fillText(this._labels[i], cx, barsTop + barsAreaH + 18);
        }
      }
    }
  };

  // ── GraphViz ───────────────────────────────────────────────────────────────
  function GraphViz(opts) {
    opts = opts || {};
    this._type = 'graph';
    this._directed = opts.directed || false;
    this._layout = opts.layout || 'circular';
    this._nodes = {};
    this._nodeOrder = [];
    this._edges = [];
  }
  GraphViz.prototype = {
    _type: 'graph',
    addNode: function(id, label, opts) {
      opts = opts || {};
      this._nodes[id] = {
        label: label !== undefined ? String(label) : String(id),
        highlight: 'default',
        x: opts.x !== undefined ? opts.x : 0,
        y: opts.y !== undefined ? opts.y : 0,
      };
      this._nodeOrder.push(id);
      if (opts.x !== undefined) this._layout = 'manual';
      return id;
    },
    addEdge: function(from, to, opts) {
      opts = opts || {};
      this._edges.push({ from: from, to: to, highlight: 'default',
        weight: opts.weight, label: opts.label });
    },
    highlightNode: function(id, state) {
      if (this._nodes[id]) this._nodes[id].highlight = state || 'default';
    },
    highlightEdge: function(from, to, state) {
      for (var i = 0; i < this._edges.length; i++) {
        var e = this._edges[i];
        if (e.from === from && e.to === to) { e.highlight = state || 'default'; break; }
      }
    },
    clearHighlights: function() {
      var k; for (k in this._nodes) this._nodes[k].highlight = 'default';
      this._edges.forEach(function(e) { e.highlight = 'default'; });
    },
    _computeCircular: function(cx, cy, r) {
      var ids = this._nodeOrder;
      for (var i = 0; i < ids.length; i++) {
        var a = (2 * Math.PI * i / ids.length) - Math.PI / 2;
        this._nodes[ids[i]].x = cx + r * Math.cos(a);
        this._nodes[ids[i]].y = cy + r * Math.sin(a);
      }
    },
    snapshot: function() {
      var ns = {};
      var k; for (k in this._nodes) ns[k] = this._nodes[k].highlight;
      return { n: ns, e: this._edges.map(function(e) { return e.highlight; }) };
    },
    restore: function(s) {
      var k; for (k in s.n) if (this._nodes[k]) this._nodes[k].highlight = s.n[k];
      for (var i = 0; i < s.e.length; i++) if (this._edges[i]) this._edges[i].highlight = s.e[i];
    },
    draw: function(ctx, rx, ry, rw, rh) {
      var cx = rx + rw / 2, cy = ry + rh / 2;
      var r = Math.min(rw, rh) * 0.36;
      var NR = Math.max(16, Math.min(26, r / this._nodeOrder.length * 1.4));
      if (this._layout === 'circular') this._computeCircular(cx, cy, r);
      var T = theme();
      var self = this;
      // Edges
      this._edges.forEach(function(e) {
        var from = self._nodes[e.from], to = self._nodes[e.to];
        if (!from || !to) return;
        var c = stateColors(e.highlight);
        var col = e.highlight !== 'default' ? c.fill : T.edge;
        ctx.strokeStyle = col; ctx.lineWidth = e.highlight !== 'default' ? 2.5 : 1.5;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
        if (self._directed) {
          var dx = to.x - from.x, dy = to.y - from.y;
          var len = Math.sqrt(dx*dx + dy*dy); if (len < 2) return;
          var angle = Math.atan2(dy, dx);
          var ax = to.x - (dx/len) * NR, ay = to.y - (dy/len) * NR;
          var head = 10;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - head*Math.cos(angle-Math.PI/6), ay - head*Math.sin(angle-Math.PI/6));
          ctx.lineTo(ax - head*Math.cos(angle+Math.PI/6), ay - head*Math.sin(angle+Math.PI/6));
          ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        }
        if (e.weight !== undefined || e.label) {
          ctx.fillStyle = T.text; ctx.font = '11px system-ui,sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(e.weight !== undefined ? e.weight : e.label,
            (from.x+to.x)/2, (from.y+to.y)/2 - 8);
        }
      });
      // Nodes
      var k; for (k in self._nodes) {
        var n = self._nodes[k];
        var c = stateColors(n.highlight);
        ctx.beginPath(); ctx.arc(n.x, n.y, NR, 0, 2*Math.PI);
        ctx.fillStyle = c.fill; ctx.fill();
        ctx.strokeStyle = c.stroke; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = c.text;
        ctx.font = 'bold ' + Math.min(13, NR * 0.7) + 'px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
      }
    }
  };

  // ── TreeViz ────────────────────────────────────────────────────────────────
  function TreeViz(opts) {
    this._type = 'tree';
    this._nodes = [];
    this._root = -1;
  }
  TreeViz.prototype = {
    _type: 'tree',
    insert: function(value) {
      var idx = this._nodes.length;
      this._nodes.push({ value: value, left: -1, right: -1, highlight: 'default', x: 0, y: 0 });
      if (this._root === -1) { this._root = idx; return; }
      var cur = this._root;
      while (true) {
        var node = this._nodes[cur];
        if (value <= node.value) {
          if (node.left === -1) { node.left = idx; break; }
          cur = node.left;
        } else {
          if (node.right === -1) { node.right = idx; break; }
          cur = node.right;
        }
      }
    },
    highlightNode: function(value, state) {
      for (var i = 0; i < this._nodes.length; i++) {
        if (this._nodes[i].value === value) { this._nodes[i].highlight = state || 'default'; break; }
      }
    },
    highlightPath: function(values, state) {
      var self = this;
      (values || []).forEach(function(v) { self.highlightNode(v, state || 'active'); });
    },
    clearHighlights: function() {
      this._nodes.forEach(function(n) { n.highlight = 'default'; });
    },
    _computeLayout: function(W, topY, levelH) {
      // Inorder traversal assigns x positions
      var counter = 0;
      var self = this;
      function inorder(idx) {
        if (idx === -1) return;
        inorder(self._nodes[idx].left);
        self._nodes[idx]._io = counter++;
        inorder(self._nodes[idx].right);
      }
      function depth(idx, d) {
        if (idx === -1) return;
        self._nodes[idx]._d = d;
        depth(self._nodes[idx].left, d + 1);
        depth(self._nodes[idx].right, d + 1);
      }
      inorder(this._root);
      depth(this._root, 0);
      var n = this._nodes.length;
      var spread = Math.max(40, Math.min(60, W / (n + 1)));
      this._nodes.forEach(function(node) {
        node.x = W/2 + (node._io - (n-1)/2) * spread;
        node.y = topY + node._d * levelH;
      });
    },
    snapshot: function() {
      return this._nodes.map(function(n) { return n.highlight; });
    },
    restore: function(s) {
      for (var i = 0; i < s.length && i < this._nodes.length; i++) {
        this._nodes[i].highlight = s[i];
      }
    },
    draw: function(ctx, rx, ry, rw, rh) {
      if (!this._nodes.length) return;
      var maxD = 0;
      this._nodes.forEach(function(n) { if ((n._d || 0) > maxD) maxD = n._d || 0; });
      var levelH = Math.min(65, rh / (maxD + 2));
      var NR = Math.min(22, levelH * 0.38);
      this._computeLayout(rx + rw, ry + NR + 10, levelH);
      var T = theme();
      var self = this;
      // Edges
      this._nodes.forEach(function(node) {
        [node.left, node.right].forEach(function(ci) {
          if (ci === -1) return;
          var child = self._nodes[ci];
          ctx.strokeStyle = T.edge; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(child.x, child.y); ctx.stroke();
        });
      });
      // Nodes
      this._nodes.forEach(function(node) {
        var c = stateColors(node.highlight);
        ctx.beginPath(); ctx.arc(node.x, node.y, NR, 0, 2*Math.PI);
        ctx.fillStyle = c.fill; ctx.fill();
        ctx.strokeStyle = c.stroke; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = c.text;
        ctx.font = 'bold ' + Math.min(13, NR * 0.75) + 'px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(node.value, node.x, node.y);
      });
    }
  };

  // ── StackViz ───────────────────────────────────────────────────────────────
  function StackViz() {
    this._type = 'stack';
    this._items = [];
    this._highlights = [];
  }
  StackViz.prototype = {
    _type: 'stack',
    push: function(value) { this._items.push(value); this._highlights.push('default'); },
    pop: function() { this._highlights.pop(); return this._items.pop(); },
    peek: function() { return this._items[this._items.length - 1]; },
    get length() { return this._items.length; },
    highlight: function(i, state) {
      if (i >= 0 && i < this._items.length) this._highlights[i] = state || 'default';
    },
    clearHighlights: function() { this._highlights = this._highlights.map(function() { return 'default'; }); },
    snapshot: function() { return { i: this._items.slice(), h: this._highlights.slice() }; },
    restore: function(s) { this._items = s.i.slice(); this._highlights = s.h.slice(); },
    draw: function(ctx, rx, ry, rw, rh) {
      var n = this._items.length;
      var cellH = Math.min(38, rh / Math.max(n + 2, 7));
      var cellW = Math.min(72, rw * 0.52);
      var cx = rx + rw / 2;
      var baseY = ry + rh - cellH * 0.6;
      var T = theme();
      // Label
      ctx.fillStyle = T.text; ctx.font = 'bold 11px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('Stack', cx, ry + 6);
      // Base line
      ctx.strokeStyle = T.edge; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - cellW/2, baseY); ctx.lineTo(cx + cellW/2, baseY); ctx.stroke();
      // Side walls
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - cellW/2, baseY - cellH * Math.max(n, 4));
      ctx.lineTo(cx - cellW/2, baseY); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + cellW/2, baseY - cellH * Math.max(n, 4));
      ctx.lineTo(cx + cellW/2, baseY); ctx.stroke();
      // Items (index 0 = bottom)
      for (var i = 0; i < n; i++) {
        var y = baseY - (i + 1) * cellH;
        var c = stateColors(this._highlights[i]);
        ctx.fillStyle = c.fill; ctx.fillRect(cx - cellW/2, y, cellW, cellH);
        ctx.strokeStyle = c.stroke; ctx.lineWidth = 1;
        ctx.strokeRect(cx - cellW/2, y, cellW, cellH);
        ctx.fillStyle = c.text; ctx.font = 'bold 13px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(this._items[i]), cx, y + cellH/2);
      }
      // TOP arrow
      if (n > 0) {
        var topY = baseY - n * cellH;
        ctx.fillStyle = '#378ADD'; ctx.font = 'bold 10px system-ui,sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('← TOP', cx + cellW/2 + 5, topY + cellH/2);
      }
    }
  };

  // ── QueueViz ───────────────────────────────────────────────────────────────
  function QueueViz() {
    this._type = 'queue';
    this._items = [];
    this._highlights = [];
  }
  QueueViz.prototype = {
    _type: 'queue',
    enqueue: function(value) { this._items.push(value); this._highlights.push('default'); },
    dequeue: function() { this._highlights.shift(); return this._items.shift(); },
    peek: function() { return this._items[0]; },
    get length() { return this._items.length; },
    highlight: function(i, state) {
      if (i >= 0 && i < this._items.length) this._highlights[i] = state || 'default';
    },
    clearHighlights: function() { this._highlights = this._highlights.map(function() { return 'default'; }); },
    snapshot: function() { return { i: this._items.slice(), h: this._highlights.slice() }; },
    restore: function(s) { this._items = s.i.slice(); this._highlights = s.h.slice(); },
    draw: function(ctx, rx, ry, rw, rh) {
      var n = this._items.length;
      var cellW = Math.min(56, rw / Math.max(n + 1, 8));
      var cellH = Math.min(38, rh * 0.44);
      var cy = ry + rh / 2;
      var startX = rx + (rw - n * cellW) / 2;
      var T = theme();
      ctx.fillStyle = T.text; ctx.font = 'bold 11px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('Queue', rx + rw/2, ry + 6);
      if (n > 0) {
        ctx.font = 'bold 10px system-ui,sans-serif';
        ctx.fillStyle = '#1D9E75'; ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillText('FRONT', startX + cellW/2, cy + cellH/2 + 3);
        ctx.fillStyle = '#D85A30';
        ctx.fillText('BACK', startX + (n - 0.5) * cellW, cy + cellH/2 + 3);
        // arrows
        ctx.fillStyle = T.text; ctx.font = '11px system-ui,sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText('dequeue →', startX - 4, cy);
        ctx.textAlign = 'left';
        ctx.fillText('← enqueue', startX + n * cellW + 4, cy);
      }
      for (var i = 0; i < n; i++) {
        var x = startX + i * cellW;
        var c = stateColors(this._highlights[i]);
        ctx.fillStyle = c.fill; ctx.fillRect(x, cy - cellH/2, cellW, cellH);
        ctx.strokeStyle = c.stroke; ctx.lineWidth = 1.5;
        ctx.strokeRect(x, cy - cellH/2, cellW, cellH);
        ctx.fillStyle = c.text; ctx.font = 'bold 13px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(this._items[i]), x + cellW/2, cy);
      }
    }
  };

  // ── Scene ──────────────────────────────────────────────────────────────────
  window.AlgoViz = {
    scene: function(opts) {
      opts = opts || {};
      var title  = opts.title  || '';
      var height = opts.height || 400;
      var _vizItems  = [];
      var _steps     = [];
      var _stats     = [];
      var _cur       = 0;
      var _playing   = false;
      var _timer     = null;
      var _speed     = 5;
      var _statId    = 0;
      var canvas, ctx, W, H;
      var DPR = window.devicePixelRatio || 1;
      H = height;

      function $c(id) { return document.getElementById(id); }

      // Region assignment for multi-viz layout
      function region(viz) {
        var hasStack = _vizItems.some(function(v) { return v._type === 'stack'; });
        var hasQueue = _vizItems.some(function(v) { return v._type === 'queue'; });
        var hasGraph = _vizItems.some(function(v) { return v._type === 'graph'; });
        var hasArray = _vizItems.some(function(v) { return v._type === 'array'; });

        if (viz._type === 'array') {
          return hasGraph || hasStack || hasQueue
            ? { x:0, y:0, w:W, h: H * 0.38 }
            : { x:0, y:0, w:W, h: H };
        }
        if (viz._type === 'graph') {
          if (hasStack) return { x:0, y: hasArray ? H*0.38 : 0, w: W*0.65, h: hasArray ? H*0.62 : H };
          if (hasQueue) return { x:0, y: hasArray ? H*0.38 : 0, w: W, h: hasArray ? H*0.44 : H*0.68 };
          return { x:0, y: hasArray ? H*0.38 : 0, w:W, h: hasArray ? H*0.62 : H };
        }
        if (viz._type === 'tree')  return { x:0, y:0, w:W, h:H };
        if (viz._type === 'stack') {
          return hasGraph ? { x: W*0.65, y: hasArray ? H*0.38 : 0, w: W*0.35, h: hasArray ? H*0.62 : H }
                          : { x: W*0.2, y:0, w: W*0.6, h:H };
        }
        if (viz._type === 'queue') {
          var qy = (hasArray ? H*0.38 : 0) + (hasGraph ? H*0.68 : 0);
          return hasGraph ? { x:0, y: qy, w:W, h: H - qy }
                          : { x:0, y: H*0.25, w:W, h: H*0.5 };
        }
        return { x:0, y:0, w:W, h:H };
      }

      function redraw() {
        if (!canvas || !W) return;
        var T = theme();
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
        if (title) {
          ctx.fillStyle = T.title; ctx.font = 'bold 14px system-ui,sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(title, W/2, 6);
        }
        var titleH = title ? 24 : 0;
        _vizItems.forEach(function(viz) {
          var r = region(viz);
          viz.draw(ctx, r.x, r.y + titleH, r.w, r.h - titleH);
        });
      }

      function updateUI() {
        var total = _steps.length, s = _cur;
        if ($c('cs-counter')) $c('cs-counter').textContent = (s+1) + ' / ' + total;
        if ($c('cs-desc'))    $c('cs-desc').textContent = total ? (_steps[s].desc || '—') : '—';
        if ($c('cs-first')) $c('cs-first').disabled = s === 0;
        if ($c('cs-prev'))  $c('cs-prev').disabled  = s === 0;
        if ($c('cs-next'))  $c('cs-next').disabled  = s >= total - 1;
        if ($c('cs-last'))  $c('cs-last').disabled  = s >= total - 1;
        if ($c('cs-play'))  $c('cs-play').textContent = _playing ? '⏸ 暂停' : '▶ 播放';
        // stat values from snapshot
        var snap = _steps[s];
        if (snap && snap.sv) {
          _stats.forEach(function(st, i) {
            var el = $c('cs-sv-' + st.id);
            if (el) el.textContent = snap.sv[i] !== undefined ? snap.sv[i] : st.fn();
          });
        }
      }

      function gotoStep(n) {
        if (n < 0 || n >= _steps.length) return;
        _cur = n;
        var snap = _steps[n];
        _vizItems.forEach(function(viz, i) { viz.restore(snap.states[i]); });
        redraw(); updateUI();
      }

      function play() {
        if (_playing) return;
        _playing = true; updateUI();
        function tick() {
          if (!_playing) return;
          if (_cur >= _steps.length - 1) { _playing = false; updateUI(); return; }
          gotoStep(_cur + 1);
          _timer = setTimeout(tick, Math.max(120, 1200 - _speed * 110));
        }
        tick();
      }
      function pause() {
        _playing = false;
        if (_timer) { clearTimeout(_timer); _timer = null; }
        updateUI();
      }

      function buildControls() {
        var el = document.getElementById('cs-controls');
        if (!el) return;
        var statsHtml = '';
        _stats.forEach(function(s) {
          statsHtml += '<span class="cs-stat">' + s.label + ': <span id="cs-sv-' + s.id + '">0</span></span>';
        });
        el.innerHTML =
          '<div class="cs-ctrl-row">' +
            '<button class="cs-btn" id="cs-first">⏮</button>' +
            '<button class="cs-btn" id="cs-prev">◀</button>' +
            '<button class="cs-btn" id="cs-play">▶ 播放</button>' +
            '<button class="cs-btn" id="cs-next">▶</button>' +
            '<button class="cs-btn" id="cs-last">⏭</button>' +
            '<span class="cs-counter" id="cs-counter">1 / ' + _steps.length + '</span>' +
            '<label style="font-size:11px;color:var(--color-text-secondary);display:flex;align-items:center;gap:4px;">' +
              '速度 <input type="range" id="cs-spd" min="1" max="10" value="5" style="width:64px;">' +
            '</label>' +
            (statsHtml ? '<span class="cs-stats">' + statsHtml + '</span>' : '') +
          '</div>' +
          '<div class="cs-desc" id="cs-desc">—</div>';

        $c('cs-first').onclick = function() { pause(); gotoStep(0); };
        $c('cs-prev').onclick  = function() { pause(); gotoStep(_cur - 1); };
        $c('cs-next').onclick  = function() { pause(); gotoStep(_cur + 1); };
        $c('cs-last').onclick  = function() { pause(); gotoStep(_steps.length - 1); };
        $c('cs-play').onclick  = function() { _playing ? pause() : play(); };
        $c('cs-spd').oninput   = function(e) { _speed = parseInt(e.target.value); };
        document.addEventListener('keydown', function(e) {
          if (e.target && e.target.tagName === 'INPUT') return;
          if (e.key === 'ArrowLeft')  { pause(); gotoStep(_cur - 1); }
          if (e.key === 'ArrowRight') { pause(); gotoStep(_cur + 1); }
          if (e.key === ' ')          { e.preventDefault(); _playing ? pause() : play(); }
        });
      }

      function layout() {
        var container = document.getElementById('cs-container');
        var rect = container.getBoundingClientRect();
        W = Math.max(rect.width, 300);
        canvas.width  = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        redraw();
      }

      var api = {
        array: function(values) {
          var v = new ArrayViz(values); _vizItems.push(v); return v;
        },
        graph: function(opts) {
          var g = new GraphViz(opts); _vizItems.push(g); return g;
        },
        tree: function(opts) {
          var t = new TreeViz(opts); _vizItems.push(t); return t;
        },
        stack: function() {
          var s = new StackViz(); _vizItems.push(s); return s;
        },
        queue: function() {
          var q = new QueueViz(); _vizItems.push(q); return q;
        },
        step: function(desc) {
          var states = _vizItems.map(function(v) { return v.snapshot(); });
          var sv = _stats.map(function(s) { return s.fn(); });
          _steps.push({ desc: desc || '', states: states, sv: sv });
        },
        stat: function(label, valueFn) {
          _stats.push({ id: _statId++, label: label, fn: valueFn });
        },
        run: function() {
          var container = document.getElementById('cs-container');
          canvas = document.createElement('canvas');
          canvas.style.display = 'block';
          canvas.style.width = '100%';
          canvas.style.borderRadius = '10px';
          container.appendChild(canvas);
          ctx = canvas.getContext('2d');
          new ResizeObserver(layout).observe(container);
          layout();
          if (_steps.length > 0) { buildControls(); gotoStep(0); }
          setTimeout(function() {
            var ch = document.getElementById('cs-controls');
            window.parent.postMessage(
              { type: 'widget-resize', height: H + (ch ? ch.offsetHeight : 0) + 32 }, '*'
            );
          }, 250);
        }
      };
      return api;
    }
  };
})();
`;
