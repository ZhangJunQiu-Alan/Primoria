"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhysicsSceneArtifact, PhysicsBody, PhysicsConstraint, PhysicsScene } from "@/lib/agent-os";

type MatterModule = typeof import("matter-js");

function buildWorld(Matter: MatterModule, scene: PhysicsScene) {
  const { Engine, Render, Runner, Bodies, Body, Composite, Constraint, Events } = Matter;

  const engine = Engine.create({
    gravity: scene.gravity ?? { x: 0, y: 1, scale: 0.001 },
  });
  if (scene.timeScale !== undefined) {
    engine.timing.timeScale = scene.timeScale;
  }

  const bodyMap = new Map<string, Matter.Body>();

  // Static walls
  const { width, height: sceneHeight } = scene.render;
  const walls = scene.walls ?? { bottom: true };
  const wallThickness = 50;
  if (walls.bottom) {
    Composite.add(engine.world, Bodies.rectangle(width / 2, sceneHeight + wallThickness / 2, width + 100, wallThickness, { isStatic: true, render: { fillStyle: "#eadfce" } }));
  }
  if (walls.top) {
    Composite.add(engine.world, Bodies.rectangle(width / 2, -wallThickness / 2, width + 100, wallThickness, { isStatic: true, render: { fillStyle: "#eadfce" } }));
  }
  if (walls.left) {
    Composite.add(engine.world, Bodies.rectangle(-wallThickness / 2, sceneHeight / 2, wallThickness, sceneHeight + 100, { isStatic: true, render: { fillStyle: "#eadfce" } }));
  }
  if (walls.right) {
    Composite.add(engine.world, Bodies.rectangle(width + wallThickness / 2, sceneHeight / 2, wallThickness, sceneHeight + 100, { isStatic: true, render: { fillStyle: "#eadfce" } }));
  }

  // Bodies
  for (const def of scene.bodies) {
    let body: Matter.Body;
    const opts = {
      isStatic: def.isStatic ?? false,
      density: def.density ?? 0.001,
      friction: def.friction ?? 0.1,
      restitution: def.restitution ?? 0.3,
      frictionAir: def.frictionAir ?? 0.01,
      angle: def.angle ?? 0,
      render: {
        fillStyle: def.render?.fillStyle ?? "#c8881a",
        strokeStyle: def.render?.strokeStyle ?? "#a06010",
        lineWidth: def.render?.lineWidth ?? 1.5,
      },
      label: def.label ?? def.id,
    };

    if (def.shape === "circle") {
      body = Bodies.circle(def.x, def.y, def.radius ?? 20, opts);
    } else if (def.shape === "rectangle") {
      body = Bodies.rectangle(def.x, def.y, def.width ?? 40, def.height ?? 40, opts);
    } else if (def.shape === "polygon" && def.vertices) {
      body = Bodies.fromVertices(def.x, def.y, [def.vertices as Matter.Vector[]], opts);
    } else {
      body = Bodies.circle(def.x, def.y, 20, opts);
    }

    if (def.velocity) Body.setVelocity(body, def.velocity);
    if (def.angle) Body.setAngle(body, def.angle);

    bodyMap.set(def.id, body);
    Composite.add(engine.world, body);
  }

  // Constraints
  for (const def of scene.constraints ?? []) {
    const bodyA = bodyMap.get(def.bodyAId);
    const bodyB = def.bodyBId ? bodyMap.get(def.bodyBId) : undefined;

    if (!bodyA) continue;

    const constraintOpts: Matter.IConstraintDefinition = {
      bodyA,
      pointA: def.pointA ?? { x: 0, y: 0 },
      stiffness: def.stiffness ?? 0.9,
      damping: def.damping ?? 0,
      render: {
        visible: def.render?.visible ?? true,
        strokeStyle: def.render?.strokeStyle ?? "#6b6357",
        lineWidth: def.render?.lineWidth ?? 2,
      },
    };

    if (bodyB) {
      constraintOpts.bodyB = bodyB;
      constraintOpts.pointB = def.pointB ?? { x: 0, y: 0 };
    } else {
      // Attach to world point — use pointB as absolute world position
      constraintOpts.pointB = def.pointB ?? { x: bodyA.position.x, y: bodyA.position.y - 100 };
    }

    if (def.length !== undefined) constraintOpts.length = def.length;

    Composite.add(engine.world, Constraint.create(constraintOpts));
  }

  return { engine, bodyMap, Events };
}

export function PhysicsSceneRenderer({ artifact, variant = "tool" }: { artifact: PhysicsSceneArtifact; variant?: "tool" | "course" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [paused, setPaused] = useState(false);

  const { scene } = artifact;
  const width = scene.render.width;
  const height = scene.render.height;

  useEffect(() => {
    if (!canvasRef.current) return;
    let stopped = false;

    import("matter-js").then((Matter) => {
      if (stopped || !canvasRef.current) return;

      const { Render, Runner, Events } = Matter;
      const { engine, bodyMap } = buildWorld(Matter, scene);

      const render = Render.create({
        canvas: canvasRef.current,
        engine,
        options: {
          width,
          height,
          background: scene.render.background ?? "#fbf7ee",
          wireframes: false,
          pixelRatio: window.devicePixelRatio ?? 1,
        },
      });

      // Draw labels after each render frame
      Events.on(render, "afterRender", () => {
        const ctx = render.context;
        ctx.save();
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const def of scene.bodies) {
          if (!def.label) continue;
          const body = bodyMap.get(def.id);
          if (!body) continue;
          const { x, y } = body.position;
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const metrics = ctx.measureText(def.label);
          ctx.fillRect(x - metrics.width / 2 - 3, y - 8, metrics.width + 6, 16);
          ctx.fillStyle = "#3a352d";
          ctx.fillText(def.label, x, y);
        }

        ctx.restore();
      });

      renderRef.current = render;
      engineRef.current = engine;
      Render.run(render);

      const runner = Runner.create();
      Runner.run(runner, engine);
      runnerRef.current = runner;

      return () => {
        Render.stop(render);
        Runner.stop(runner);
        Matter.Engine.clear(engine);
      };
    });

    return () => {
      stopped = true;
      if (renderRef.current) {
        import("matter-js").then(({ Render, Runner, Engine }) => {
          if (renderRef.current) Render.stop(renderRef.current);
          if (runnerRef.current) Runner.stop(runnerRef.current);
        });
      }
    };
  // Reinitialize when scene changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const togglePause = useCallback(() => {
    import("matter-js").then(({ Runner, Render }) => {
      const runner = runnerRef.current;
      const render = renderRef.current;
      if (!runner || !render) return;
      if (paused) {
        Runner.start(runner, engineRef.current!);
        Render.run(render);
      } else {
        Runner.stop(runner);
        Render.stop(render);
      }
      setPaused((p) => !p);
    });
  }, [paused]);

  const body = (
    <div className={variant === "course" ? "course-visual-canvas physics-course-canvas" : undefined}>
      <div style={{ position: "relative", lineHeight: 0 }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: variant === "course" ? 14 : "0 0 8px 8px" }}
            aria-label={artifact.title}
          />
          <button
            onClick={togglePause}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              background: "rgba(251,247,238,0.85)",
              border: "1px solid #eadfce",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 12,
              color: "#3a352d",
              cursor: "pointer",
            }}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
      </div>
    </div>
  );

  if (variant === "course") return body;

  return (
    <div className="message-row tool">
      <div className="tool-card widget-card physics-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>render_physics_scene · {artifact.title}</span>
        </div>
        {body}
        {artifact.description && (
          <p className="tool-note" style={{ padding: "8px 12px 10px" }}>{artifact.description}</p>
        )}
      </div>
    </div>
  );
}
