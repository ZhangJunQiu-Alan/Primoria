# Physics Runtime API Reference

Use `stemRenderer` with `subject: "physics"` to run physics simulations.
The global `Physics` object is pre-loaded — do NOT import anything.

## World Setup

```js
const world = Physics.world({ gravity: 9.8, height: 460 });
```
- `gravity` (number, default 9.8) — gravitational acceleration in m/s²
- `height` (number, default 460) — canvas height in pixels

---

## Bodies

All body constructors add the body to the world and return a **body proxy**.

```js
world.ball({ x, y, radius, mass, color, restitution })
world.box({ x, y, w, h, mass, color, angle })      // angle in degrees
world.pin(x, y, { color, radius })                  // immovable anchor
world.surface({ y, friction, color })               // static ground/floor
world.wall({ x, y1, y2, friction, color })          // vertical static wall
world.polygon({ x, y, sides, radius, mass, color })
```

### Body proxy properties and methods

```js
body.x          // current x position (read-only)
body.y          // current y position (read-only)
body.speed      // scalar speed (read-only)
body.velocity   // { x, y } object (read-only)
body.angle      // rotation in degrees (read-only)
body.mass       // mass in kg (read-only)

body.impulse({ x, y })        // apply an instantaneous force
body.setPosition(x, y)        // teleport body
body.setVelocity(x, y)        // set velocity directly
body.setStatic(true|false)    // make/unmake static
body.highlight(color)         // change fill color
```

---

## Constraints

```js
world.rod(bodyA, bodyB, { length, stiffness })
// length defaults to current distance; stiffness 0–1, default 1 (rigid)

world.spring(bodyA, bodyB, { restLength, stiffness, damping })
// stiffness 0.001–0.1; damping 0–0.1
```

---

## Visual Aids

```js
world.label(() => `text`)                          // dynamic text label below canvas
world.vector(body, 'velocity', { scale, color })   // draw velocity arrow
world.vector(body, 'force',    { scale, color })   // draw force arrow
world.trail(body, { length, color })               // draw motion trail
```

---

## Environment / Forces

```js
world.wind({ fx, fy })   // constant force per unit mass applied each tick
```

---

## Lifecycle

```js
world.onTick((dt) => { /* dt = seconds since last frame */ })
world.onClick((x, y) => { /* canvas coordinates */ })
world.onCollision((bodyA, bodyB) => { /* called on each collision */ })
world.run()   // MUST be called last to start simulation
```

---

## Canvas coordinate system

Origin (0, 0) is **top-left**. Y increases **downward**.
Default canvas width adapts to container (~600 px). Default height is 460 px.
Place bodies within x: 0–600, y: 0–460 for them to be visible.

---

## Examples

### Pendulum
```js
const world = Physics.world({ gravity: 9.8 });
const pivot = world.pin(300, 60);
const bob   = world.ball({ x: 450, y: 200, radius: 22, mass: 1, color: '#6366f1' });
world.rod(pivot, bob);
world.trail(bob, { length: 120, color: 'rgba(99,102,241,0.4)' });
world.label(() => `speed: ${bob.speed.toFixed(1)} px/s  |  angle: ${(bob.angle).toFixed(1)}°`);
world.run();
```

### Spring oscillator
```js
const world  = Physics.world({ gravity: 9.8 });
const anchor = world.pin(300, 60);
const mass   = world.ball({ x: 300, y: 250, radius: 25, mass: 2, color: '#f59e0b' });
world.spring(anchor, mass, { restLength: 120, stiffness: 0.03, damping: 0.005 });
world.vector(mass, 'velocity', { scale: 4, color: '#ef4444' });
world.label(() => `y-displacement: ${(mass.y - 60 - 120).toFixed(1)} px`);
world.run();
```

### Projectile motion
```js
const world  = Physics.world({ gravity: 9.8 });
world.surface({ y: 440 });
const ball   = world.ball({ x: 80, y: 380, radius: 16, color: '#10b981', restitution: 0.6 });
ball.impulse({ x: 0.04, y: -0.12 });
world.trail(ball, { length: 150, color: 'rgba(16,185,129,0.5)' });
world.label(() => `x: ${ball.x.toFixed(0)}  y: ${ball.y.toFixed(0)}  speed: ${ball.speed.toFixed(1)}`);
world.run();
```

### Collision (Newton's cradle)
```js
const world = Physics.world({ gravity: 9.8, height: 400 });
const anchors = [], bobs = [];
for (let i = 0; i < 5; i++) {
  const ax = 180 + i * 50, ay = 80;
  anchors.push(world.pin(ax, ay));
  bobs.push(world.ball({ x: ax, y: 260, radius: 22, mass: 1, color: '#6366f1', restitution: 1 }));
  world.rod(anchors[i], bobs[i], { length: 180 });
}
// Pull first bob back
bobs[0].setPosition(anchors[0].x - 100, anchors[0].y + 140);
world.run();
```

### Inclined plane
```js
const world = Physics.world({ gravity: 9.8 });
const ramp  = world.box({ x: 260, y: 340, w: 300, h: 16, mass: 1, color: '#94a3b8', angle: -20 });
ramp.setStatic(true);
world.surface({ y: 440 });
const ball  = world.ball({ x: 120, y: 260, radius: 18, color: '#f97316', restitution: 0.4 });
world.trail(ball);
world.label(() => `speed: ${ball.speed.toFixed(1)} px/s`);
world.run();
```
