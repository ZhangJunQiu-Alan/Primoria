/**
 * MathGL Runtime — inlined into the iframe <script> block.
 * Pure Canvas 2D, no CDN dependencies. Exposes `window.MathGL` global.
 */
export const MATH_RUNTIME_CODE = `
(function() {
  var _palette = ['#378ADD','#D85A30','#1D9E75','#8B5CF6','#F59E0B','#EC4899'];
  var _colorIdx = 0;
  function nextColor() { return _palette[_colorIdx++ % _palette.length]; }

  function isDark() { return matchMedia('(prefers-color-scheme: dark)').matches; }
  function theme() {
    var d = isDark();
    return {
      bg:    d ? '#1e1e1c' : '#ffffff',
      grid:  d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
      axis:  d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
      tick:  d ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
      text:  d ? '#D3D1C7' : '#5F5E5A',
      title: d ? '#E8E6E0' : '#2A2925',
    };
  }

  function niceTicks(lo, hi) {
    var range = hi - lo || 1;
    var rough = range / 8;
    var mag   = Math.pow(10, Math.floor(Math.log10(rough)));
    var f     = rough / mag;
    var nice  = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    var step  = nice * mag;
    var ticks = [];
    var start = Math.ceil(lo / step) * step;
    for (var t = start; t <= hi + 1e-10; t += step) {
      ticks.push(Math.round(t / step) * step);
    }
    return ticks;
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, lw) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;
    var angle = Math.atan2(dy, dx);
    var head  = Math.min(12, len * 0.35);
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  window.MathGL = {
    scene: function(opts) {
      opts = opts || {};
      var xMin     = opts.xMin     !== undefined ? opts.xMin     : -6;
      var xMax     = opts.xMax     !== undefined ? opts.xMax     : 6;
      var yMin     = opts.yMin     !== undefined ? opts.yMin     : -4;
      var yMax     = opts.yMax     !== undefined ? opts.yMax     : 4;
      var H        = opts.height   !== undefined ? opts.height   : 420;
      var showGrid = opts.grid     !== false;
      var showAxes = opts.axes     !== false;
      var title    = opts.title    || '';
      _colorIdx    = 0;

      var container = document.getElementById('math-container');
      var canvas    = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.width   = '100%';
      canvas.style.borderRadius = '10px';
      container.appendChild(canvas);
      var ctx = canvas.getContext('2d');
      var W   = 600;
      var DPR = window.devicePixelRatio || 1;

      function layout() {
        var rect = container.getBoundingClientRect();
        W = rect.width || 600;
        canvas.width  = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        redraw(_startTime ? (Date.now() - _startTime) / 1000 : 0);
      }
      new ResizeObserver(layout).observe(container);

      function toPixel(x, y) {
        return {
          px: (x - xMin) / (xMax - xMin) * W,
          py: (1 - (y - yMin) / (yMax - yMin)) * H,
        };
      }
      function toMath(px, py) {
        return {
          x: px / W * (xMax - xMin) + xMin,
          y: (1 - py / H) * (yMax - yMin) + yMin,
        };
      }

      var _draws     = [];
      var _legend    = [];
      var _animFn    = null;
      var _clickFn   = null;
      var _startTime = null;
      var _sliders   = {};

      function addDraw(fn, z) {
        _draws.push({ fn: fn, z: z || 0 });
        _draws.sort(function(a, b) { return a.z - b.z; });
      }

      function drawBackground() {
        var T = theme();
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = T.bg;
        ctx.fillRect(0, 0, W, H);

        var xTicks = niceTicks(xMin, xMax);
        var yTicks = niceTicks(yMin, yMax);
        var o      = toPixel(0, 0);
        var ox     = Math.max(1, Math.min(W - 1, o.px));
        var oy     = Math.max(1, Math.min(H - 1, o.py));

        if (showGrid) {
          ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
          xTicks.forEach(function(tx) {
            var p = toPixel(tx, 0);
            ctx.beginPath(); ctx.moveTo(p.px, 0); ctx.lineTo(p.px, H); ctx.stroke();
          });
          yTicks.forEach(function(ty) {
            var p = toPixel(0, ty);
            ctx.beginPath(); ctx.moveTo(0, p.py); ctx.lineTo(W, p.py); ctx.stroke();
          });
        }

        if (showAxes) {
          ctx.strokeStyle = T.axis; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, oy); ctx.lineTo(W, oy);
          ctx.moveTo(ox, 0); ctx.lineTo(ox, H);
          ctx.stroke();

          ctx.font = '11px system-ui,sans-serif';
          xTicks.forEach(function(tx) {
            if (Math.abs(tx) < 1e-10) return;
            var p = toPixel(tx, 0);
            ctx.strokeStyle = T.axis; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(p.px, oy - 4); ctx.lineTo(p.px, oy + 4); ctx.stroke();
            var lbl = tx % 1 === 0 ? String(tx) : tx.toPrecision(3).replace(/0+$/, '');
            ctx.fillStyle = T.tick; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(lbl, p.px, oy + 6);
          });
          yTicks.forEach(function(ty) {
            if (Math.abs(ty) < 1e-10) return;
            var p = toPixel(0, ty);
            ctx.strokeStyle = T.axis; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(ox - 4, p.py); ctx.lineTo(ox + 4, p.py); ctx.stroke();
            var lbl = ty % 1 === 0 ? String(ty) : ty.toPrecision(3).replace(/0+$/, '');
            ctx.fillStyle = T.tick; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(lbl, ox - 7, p.py);
          });

          drawArrow(ctx, W - 20, oy, W - 2, oy, T.axis, 1.5);
          drawArrow(ctx, ox, 20, ox, 2, T.axis, 1.5);

          if (title) {
            ctx.fillStyle = T.title;
            ctx.font = 'bold 14px system-ui,sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(title, W / 2, 8);
          }
        }
      }

      function drawLegend() {
        if (!_legend.length) return;
        var x0 = W - 14, y0 = title ? 32 : 14;
        _legend.forEach(function(item) {
          ctx.save();
          ctx.font = '12px system-ui,sans-serif';
          ctx.fillStyle = item.color;
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(item.label, x0, y0);
          ctx.strokeStyle = item.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x0 + 5, y0); ctx.lineTo(x0 + 22, y0); ctx.stroke();
          ctx.restore();
          y0 += 18;
        });
      }

      function redraw(t) {
        drawBackground();
        _draws.forEach(function(d) { try { d.fn(t || 0); } catch(e) {} });
        drawLegend();
      }

      var api = {

        plot: function(fn, opts) {
          opts = opts || {};
          var color  = opts.color || nextColor();
          var lw     = opts.width || 2;
          var label  = opts.label;
          var dash   = opts.dash  || [];
          var domain = opts.domain || null;
          if (label) _legend.push({ label: label, color: color });
          addDraw(function() {
            var x0 = domain ? domain[0] : xMin;
            var x1 = domain ? domain[1] : xMax;
            var steps = Math.ceil(W * 2);
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.setLineDash(dash);
            ctx.beginPath();
            var started = false;
            for (var i = 0; i <= steps; i++) {
              var x = x0 + (x1 - x0) * i / steps;
              var y = fn(x);
              if (!isFinite(y) || Math.abs(y) > (yMax - yMin) * 20) { started = false; continue; }
              var p = toPixel(x, y);
              if (!started) { ctx.moveTo(p.px, p.py); started = true; }
              else ctx.lineTo(p.px, p.py);
            }
            ctx.stroke(); ctx.restore();
          });
          return api;
        },

        parametric: function(xFn, yFn, opts) {
          opts = opts || {};
          var color = opts.color || nextColor();
          var lw    = opts.width || 2;
          var label = opts.label;
          var tMin  = opts.tMin  !== undefined ? opts.tMin  : 0;
          var tMax  = opts.tMax  !== undefined ? opts.tMax  : 2 * Math.PI;
          var steps = opts.steps || 600;
          if (label) _legend.push({ label: label, color: color });
          addDraw(function() {
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.beginPath();
            var started = false;
            for (var i = 0; i <= steps; i++) {
              var t = tMin + (tMax - tMin) * i / steps;
              var x = xFn(t), y = yFn(t);
              if (!isFinite(x) || !isFinite(y)) { started = false; continue; }
              var p = toPixel(x, y);
              if (!started) { ctx.moveTo(p.px, p.py); started = true; }
              else ctx.lineTo(p.px, p.py);
            }
            ctx.stroke(); ctx.restore();
          });
          return api;
        },

        point: function(x, y, opts) {
          opts = opts || {};
          // x and y can be getter functions (from slider) or numbers
          var colorOpt   = opts.color || null;
          var r      = opts.radius || 5;
          var label  = opts.label;
          var anchor = opts.labelAnchor || 'top';
          addDraw(function() {
            var cx = typeof x === 'function' ? x() : x;
            var cy = typeof y === 'function' ? y() : y;
            var color = colorOpt || nextColor.colorFixed || _palette[0];
            var p = toPixel(cx, cy);
            ctx.save();
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(p.px, p.py, r, 0, 2 * Math.PI); ctx.fill();
            if (label) {
              var lbl = typeof label === 'function' ? label() : label;
              ctx.font = '12px system-ui,sans-serif'; ctx.fillStyle = color;
              var ox = 0, oy = 0;
              if (anchor === 'top')    { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; oy = -r - 3; }
              if (anchor === 'bottom') { ctx.textAlign = 'center'; ctx.textBaseline = 'top';    oy =  r + 3; }
              if (anchor === 'left')   { ctx.textAlign = 'right';  ctx.textBaseline = 'middle'; ox = -r - 3; }
              if (anchor === 'right')  { ctx.textAlign = 'left';   ctx.textBaseline = 'middle'; ox =  r + 3; }
              ctx.fillText(lbl, p.px + ox, p.py + oy);
            }
            ctx.restore();
          });
          return api;
        },

        vector: function(x0, y0, dx, dy, opts) {
          opts = opts || {};
          var color = opts.color || nextColor();
          var lw    = opts.width || 2;
          var label = opts.label;
          // all can be getter functions
          addDraw(function() {
            var ax0 = typeof x0 === 'function' ? x0() : x0;
            var ay0 = typeof y0 === 'function' ? y0() : y0;
            var adx = typeof dx === 'function' ? dx() : dx;
            var ady = typeof dy === 'function' ? dy() : dy;
            var p0 = toPixel(ax0, ay0);
            var p1 = toPixel(ax0 + adx, ay0 + ady);
            drawArrow(ctx, p0.px, p0.py, p1.px, p1.py, color, lw);
            if (label) {
              var lbl = typeof label === 'function' ? label() : label;
              ctx.save();
              ctx.font = '12px system-ui,sans-serif'; ctx.fillStyle = color;
              ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
              ctx.fillText(lbl, p1.px + 5, p1.py - 5);
              ctx.restore();
            }
          });
          return api;
        },

        area: function(fn, xA, xB, opts) {
          opts = opts || {};
          var color = opts.color || 'rgba(55,138,221,0.22)';
          addDraw(function() {
            var a = typeof xA === 'function' ? xA() : xA;
            var b = typeof xB === 'function' ? xB() : xB;
            var steps = Math.ceil(W * 2);
            var pa0 = toPixel(a, 0), pb0 = toPixel(b, 0);
            ctx.save(); ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(pa0.px, pa0.py);
            for (var i = 0; i <= steps; i++) {
              var x = a + (b - a) * i / steps;
              var y = fn(x);
              if (!isFinite(y)) continue;
              var p = toPixel(x, y); ctx.lineTo(p.px, p.py);
            }
            ctx.lineTo(pb0.px, pb0.py); ctx.closePath(); ctx.fill(); ctx.restore();
          }, -1);
          return api;
        },

        tangent: function(fn, x0ref, opts) {
          opts = opts || {};
          var color = opts.color || nextColor();
          var lw    = opts.width || 1.5;
          var label = opts.label;
          addDraw(function() {
            var x0    = typeof x0ref === 'function' ? x0ref() : x0ref;
            var h     = 1e-5;
            var slope = (fn(x0 + h) - fn(x0 - h)) / (2 * h);
            var y0    = fn(x0);
            var pa    = toPixel(xMin, y0 + slope * (xMin - x0));
            var pb    = toPixel(xMax, y0 + slope * (xMax - x0));
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(pa.px, pa.py); ctx.lineTo(pb.px, pb.py); ctx.stroke();
            var p0 = toPixel(x0, y0);
            ctx.setLineDash([]);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(p0.px, p0.py, 4, 0, 2 * Math.PI); ctx.fill();
            if (label) {
              var lbl = typeof label === 'function' ? label(slope) : label;
              ctx.font = '12px system-ui,sans-serif'; ctx.fillStyle = color;
              ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
              ctx.fillText(lbl, p0.px + 7, p0.py - 7);
            }
            ctx.restore();
          });
          return api;
        },

        text: function(x, y, str, opts) {
          opts = opts || {};
          var color  = opts.color  || null;
          var size   = opts.size   || 13;
          var align  = opts.align  || 'left';
          var anchor = opts.anchor || 'bottom';
          addDraw(function() {
            var tx = typeof x === 'function' ? x() : x;
            var ty = typeof y === 'function' ? y() : y;
            var lbl = typeof str === 'function' ? str() : str;
            var p = toPixel(tx, ty);
            ctx.save();
            ctx.font = size + 'px system-ui,sans-serif';
            ctx.fillStyle = color || theme().text;
            ctx.textAlign = align; ctx.textBaseline = anchor;
            ctx.fillText(lbl, p.px, p.py);
            ctx.restore();
          });
          return api;
        },

        polygon: function(points, opts) {
          opts = opts || {};
          var fill   = opts.fill   || 'rgba(99,102,241,0.18)';
          var stroke = opts.stroke || '#6366f1';
          var lw     = opts.width  || 1.5;
          addDraw(function() {
            if (!points.length) return;
            ctx.save();
            ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
            ctx.beginPath();
            var p0 = toPixel(points[0][0], points[0][1]);
            ctx.moveTo(p0.px, p0.py);
            for (var i = 1; i < points.length; i++) {
              var pi = toPixel(points[i][0], points[i][1]);
              ctx.lineTo(pi.px, pi.py);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          });
          return api;
        },

        circle: function(cx, cy, r, opts) {
          opts = opts || {};
          var fill   = opts.fill   || 'rgba(99,102,241,0.12)';
          var stroke = opts.stroke || '#6366f1';
          var lw     = opts.width  || 1.5;
          var label  = opts.label;
          addDraw(function() {
            var pcx = typeof cx === 'function' ? cx() : cx;
            var pcy = typeof cy === 'function' ? cy() : cy;
            var pr  = typeof r  === 'function' ? r()  : r;
            var pc  = toPixel(pcx, pcy);
            var pe  = toPixel(pcx + pr, pcy);
            var rpx = Math.abs(pe.px - pc.px);
            ctx.save();
            ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
            ctx.beginPath(); ctx.arc(pc.px, pc.py, rpx, 0, 2 * Math.PI);
            ctx.fill(); ctx.stroke();
            if (label) {
              ctx.font = '12px system-ui,sans-serif'; ctx.fillStyle = stroke;
              ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
              ctx.fillText(label, pc.px, pc.py - rpx - 4);
            }
            ctx.restore();
          });
          return api;
        },

        slider: function(id, opts) {
          opts = opts || {};
          var label = opts.label !== undefined ? opts.label : id;
          var min   = opts.min   !== undefined ? opts.min   : 0;
          var max   = opts.max   !== undefined ? opts.max   : 10;
          var step  = opts.step  !== undefined ? opts.step  : 0.1;
          var val   = opts.value !== undefined ? opts.value : (min + max) / 2;
          _sliders[id] = val;

          var controls = document.getElementById('math-controls');
          var wrap = document.createElement('div');
          wrap.className = 'math-slider';
          var fmt = function(v) { return parseFloat(v.toPrecision(4)).toString(); };
          wrap.innerHTML =
            '<span class="math-slider-label">' + label +
            ': <span id="msv-' + id + '">' + fmt(val) + '</span></span>' +
            '<input type="range" min="' + min + '" max="' + max +
            '" step="' + step + '" value="' + val + '">';
          controls.appendChild(wrap);

          var input   = wrap.querySelector('input');
          var display = document.getElementById('msv-' + id);
          input.addEventListener('input', function() {
            _sliders[id] = parseFloat(input.value);
            display.textContent = fmt(parseFloat(input.value));
            redraw(_startTime ? (Date.now() - _startTime) / 1000 : 0);
          });

          return function() { return _sliders[id]; };
        },

        animate: function(fn) {
          _animFn = fn;
          return api;
        },

        onClick: function(fn) {
          _clickFn = fn;
          return api;
        },

        run: function() {
          if (_clickFn) {
            canvas.addEventListener('click', function(e) {
              var rect = canvas.getBoundingClientRect();
              var m = toMath(e.clientX - rect.left, e.clientY - rect.top);
              _clickFn(m.x, m.y);
              if (!_animFn) redraw(0);
            });
          }

          if (_animFn) {
            _startTime = Date.now();
            var frame = function() {
              var t = (Date.now() - _startTime) / 1000;
              _animFn(t);
              redraw(t);
              requestAnimationFrame(frame);
            };
            layout();
            frame();
          } else {
            layout();
          }

          // notify iframe height
          setTimeout(function() {
            var controlsH = document.getElementById('math-controls').offsetHeight;
            window.parent.postMessage({ type: 'widget-resize', height: H + controlsH + 24 }, '*');
          }, 100);
        },
      };

      return api;
    },
  };
})();
`;
