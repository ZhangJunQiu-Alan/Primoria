/**
 * Physics Runtime — inlined verbatim into the iframe <script type="module">.
 * Assumes `Matter` is already imported and in scope.
 * Exposes `window.Physics` global for LLM-generated code to call.
 */
export const PHYSICS_RUNTIME_CODE = `
(function() {
  // ── Internal helpers ─────────────────────────────────────────────────

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 2) return;
    const angle = Math.atan2(dy, dx);
    const head = Math.min(12, len * 0.4);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI/6), y2 - head * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI/6), y2 - head * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function bodyProxy(body, engine) {
    return {
      _body: body,
      get x()        { return body.position.x; },
      get y()        { return body.position.y; },
      get speed()    { return body.speed; },
      get velocity() { return { x: body.velocity.x, y: body.velocity.y }; },
      get angle()    { return body.angle * 180 / Math.PI; },
      get mass()     { return body.mass; },
      impulse({ x = 0, y = 0 } = {}) {
        Matter.Body.applyForce(body, body.position, { x, y });
      },
      setPosition(x, y) { Matter.Body.setPosition(body, { x, y }); },
      setVelocity(x, y) { Matter.Body.setVelocity(body, { x, y }); },
      setStatic(flag)   { Matter.Body.setStatic(body, flag); },
      highlight(color = '#fbbf24') { body.render.fillStyle = color; },
    };
  }

  // ── World factory ─────────────────────────────────────────────────────

  window.Physics = {
    world(options = {}) {
      const {
        gravity = 9.8,
        height  = 460,
      } = options;

      const container  = document.getElementById('physics-container');
      const labelsEl   = document.getElementById('physics-labels');
      const canvas     = document.createElement('canvas');
      container.appendChild(canvas);

      const W = container.offsetWidth || 600;
      canvas.width  = W;
      canvas.height = height;
      canvas.style.display = 'block';
      canvas.style.width   = '100%';

      const engine = Matter.Engine.create({
        gravity: { x: 0, y: gravity / 10 },
      });

      const render = Matter.Render.create({
        canvas,
        engine,
        options: {
          width: W,
          height,
          wireframes: false,
          background: 'transparent',
        },
      });

      const runner = Matter.Runner.create();

      const labelFns  = [];
      const vectorCfg = [];
      const trails    = [];

      // ── After-render: vectors, trails, labels ──────────────────────────
      Matter.Events.on(render, 'afterRender', () => {
        const ctx = render.context;

        // Trails
        trails.forEach(({ body, points, maxLen, color }) => {
          const b = body._body;
          points.push({ x: b.position.x, y: b.position.y });
          if (points.length > maxLen) points.shift();
          if (points.length < 2) return;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.7;
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
          ctx.stroke();
          ctx.restore();
        });

        // Velocity / force vectors
        vectorCfg.forEach(({ body, prop, scale, color }) => {
          const b = body._body;
          let vx = 0, vy = 0;
          if (prop === 'velocity') { vx = b.velocity.x; vy = b.velocity.y; }
          else if (prop === 'force') { vx = b.force.x * 5000; vy = b.force.y * 5000; }
          drawArrow(ctx,
            b.position.x, b.position.y,
            b.position.x + vx * scale,
            b.position.y + vy * scale,
            color,
          );
        });

        // Labels
        if (labelsEl && labelFns.length) {
          labelsEl.innerHTML = labelFns.map(fn => {
            try { return '<div class="phys-label">' + fn() + '</div>'; }
            catch(e) { return ''; }
          }).join('');
          const lh = labelsEl.offsetHeight;
          window.parent.postMessage({ type: 'widget-resize', height: height + lh + 24 }, '*');
        }
      });

      // ── Body helpers ────────────────────────────────────────────────────
      function makeBody(matterBody, mass) {
        if (mass !== undefined) Matter.Body.setMass(matterBody, mass);
        Matter.World.add(engine.world, matterBody);
        return bodyProxy(matterBody, engine);
      }

      const api = {
        // ── Bodies ─────────────────────────────────────────────────────
        ball({ x = 200, y = 100, radius = 20, mass, color = '#6366f1', restitution = 0.7 } = {}) {
          return makeBody(Matter.Bodies.circle(x, y, radius, {
            restitution,
            render: { fillStyle: color },
          }), mass);
        },

        box({ x = 200, y = 100, w = 40, h = 40, mass, color = '#8b5cf6', angle = 0 } = {}) {
          return makeBody(Matter.Bodies.rectangle(x, y, w, h, {
            angle: angle * Math.PI / 180,
            render: { fillStyle: color },
          }), mass);
        },

        pin(x, y, { color = '#64748b', radius = 6 } = {}) {
          return makeBody(Matter.Bodies.circle(x, y, radius, {
            isStatic: true,
            render: { fillStyle: color },
          }));
        },

        surface({ y = 480, width: w, friction = 0.8, color = 'rgba(100,116,139,0.25)' } = {}) {
          const W2 = w || canvas.width * 2;
          return makeBody(Matter.Bodies.rectangle(canvas.width / 2, y, W2, 20, {
            isStatic: true, friction,
            render: { fillStyle: color },
          }));
        },

        wall({ x, y1 = 0, y2 = height, friction = 0.5, color = 'rgba(100,116,139,0.25)' } = {}) {
          const mid = (y1 + y2) / 2;
          return makeBody(Matter.Bodies.rectangle(x, mid, 20, Math.abs(y2 - y1), {
            isStatic: true, friction,
            render: { fillStyle: color },
          }));
        },

        polygon({ x = 200, y = 100, sides = 6, radius = 30, mass, color = '#10b981' } = {}) {
          return makeBody(Matter.Bodies.polygon(x, y, sides, radius, {
            render: { fillStyle: color },
          }), mass);
        },

        // ── Constraints ────────────────────────────────────────────────
        rod(bodyA, bodyB, { length, stiffness = 1 } = {}) {
          const len = length ?? Matter.Vector.magnitude(
            Matter.Vector.sub(bodyA._body.position, bodyB._body.position)
          );
          const c = Matter.Constraint.create({
            bodyA: bodyA._body, bodyB: bodyB._body,
            length: len, stiffness,
            render: { strokeStyle: 'rgba(148,163,184,0.9)', lineWidth: 2 },
          });
          Matter.World.add(engine.world, c);
          return c;
        },

        spring(bodyA, bodyB, { restLength, stiffness = 0.05, damping = 0.01 } = {}) {
          const len = restLength ?? Matter.Vector.magnitude(
            Matter.Vector.sub(bodyA._body.position, bodyB._body.position)
          );
          const c = Matter.Constraint.create({
            bodyA: bodyA._body, bodyB: bodyB._body,
            length: len, stiffness, damping,
            render: { strokeStyle: '#f59e0b', lineWidth: 2, type: 'spring' },
          });
          Matter.World.add(engine.world, c);
          return c;
        },

        // ── Visual aids ────────────────────────────────────────────────
        label(fn) { labelFns.push(fn); },

        vector(body, prop = 'velocity', { scale = 5, color = '#ef4444' } = {}) {
          vectorCfg.push({ body, prop, scale, color });
        },

        trail(body, { length: maxLen = 100, color = 'rgba(99,102,241,0.5)' } = {}) {
          trails.push({ body, points: [], maxLen, color });
        },

        // ── Forces / environment ───────────────────────────────────────
        wind({ fx = 0, fy = 0 } = {}) {
          Matter.Events.on(engine, 'beforeUpdate', () => {
            Matter.Composite.allBodies(engine.world).forEach(b => {
              if (!b.isStatic) Matter.Body.applyForce(b, b.position, { x: fx * b.mass, y: fy * b.mass });
            });
          });
        },

        // ── Lifecycle ──────────────────────────────────────────────────
        onTick(fn) {
          Matter.Events.on(engine, 'afterUpdate', (ev) => fn(engine.timing.delta / 1000));
        },

        onClick(fn) {
          canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = render.options.width / rect.width;
            const sy = render.options.height / rect.height;
            fn((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
          });
        },

        onCollision(fn) {
          Matter.Events.on(engine, 'collisionStart', (ev) => {
            ev.pairs.forEach(pair => fn(
              bodyProxy(pair.bodyA, engine),
              bodyProxy(pair.bodyB, engine),
            ));
          });
        },

        run() {
          Matter.Render.run(render);
          Matter.Runner.run(runner, engine);
          window.parent.postMessage({ type: 'widget-resize', height: height + 24 }, '*');
        },
      };

      return api;
    },
  };
})();
`;
