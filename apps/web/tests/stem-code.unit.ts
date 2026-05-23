#!/usr/bin/env tsx

import { validateStemCode } from "../src/lib/ai/stem-code.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  assert(
    validateStemCode("const scene = MathGL.scene({ title: 'line' }); scene.plot(x => x); scene.run();").ok,
    "allows ordinary MathGL code",
  );
  assert(
    validateStemCode("const scene = AlgoViz.scene({ title: 'sort' }); const arr = scene.array([3, 1]); scene.step('start'); scene.run();").ok,
    "allows ordinary AlgoViz code",
  );
  assert(
    validateStemCode("const world = Physics.world({ gravity: 9.8 }); const ball = world.ball({ x: 100, y: 80 }); world.run();").ok,
    "allows ordinary Physics code",
  );

  const blockedCases = [
    ["import('https://example.com/x.js')", "dynamic import"],
    ["fetch('/api/secret')", "fetch"],
    ["new Function('return 1')", "nested Function"],
    ["eval('1+1')", "eval"],
    ["document.createElement('canvas')", "DOM access"],
    ["window.location.href='https://example.com'", "window access"],
    ["localStorage.setItem('x','y')", "storage"],
    ["({}).constructor.constructor('return this')()", "constructor escape"],
  ];

  for (const [source, label] of blockedCases) {
    const result = validateStemCode(source);
    assert(!result.ok, `blocks ${label}`);
  }

  process.stdout.write("[stem-code.unit] ALL UNIT CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`[stem-code.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
