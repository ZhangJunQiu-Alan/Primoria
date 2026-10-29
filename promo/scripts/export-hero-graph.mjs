import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../data/knowledge-graphs/source/', import.meta.url));
const graphs = ['deep_learning', 'linear_algebra'].map((name) => JSON.parse(readFileSync(`${root}${name}.json`, 'utf8')));
const nodes = graphs.flatMap((graph) => graph.nodes.filter((node) => node.kind === 'concept'));
const ids = new Set(nodes.map((node) => node.id));
const cross = JSON.parse(readFileSync(`${root}cross_subject_edges.json`, 'utf8'));
const edges = [...graphs.flatMap((graph) => graph.edges), ...cross.edges].filter((edge) => edge.type === 'prereq' && ids.has(edge.from) && ids.has(edge.to));
const closure = new Set();
function visit(id) {
  if (closure.has(id)) return;
  closure.add(id);
  edges.filter((edge) => edge.to === id).forEach((edge) => visit(edge.from));
}
visit('dl_transformer');
const output = {
  source: ['deep_learning.json', 'linear_algebra.json', 'cross_subject_edges.json'],
  nodes: nodes.map(({ id, name, default_order }) => ({ id, name, order: default_order ?? 0, inPath: closure.has(id) })),
  edges: edges.map(({ from, to }) => ({ from, to })),
};
writeFileSync(new URL('../src/data/hero-graph.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(`Exported ${nodes.length} source concepts, ${closure.size} Transformer prerequisites including target.`);
