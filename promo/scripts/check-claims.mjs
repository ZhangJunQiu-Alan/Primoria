import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const promo = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(promo, '..');
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const graphDirectory = resolve(root, 'data/knowledge-graphs/source');
const graphs = readdirSync(graphDirectory).filter((file) => file.endsWith('.json')).map((file) => read(`data/knowledge-graphs/source/${file}`)).filter((graph) => Array.isArray(graph.nodes));
const catalog = read('data/visualization-components/catalog.v1.json');
const rules = readFileSync(resolve(root, 'apps/web/src/lib/mastery/rules.ts'), 'utf8');
const styleSource = readFileSync(resolve(root, 'packages/contracts/src/tutor-style.mjs'), 'utf8');
const minimumAnswers = Number(rules.match(/MASTERED_MIN_QUESTIONS\s*=\s*(\d+)/)?.[1]);
const accuracy = Number(rules.match(/MASTERED_RATIO\s*=\s*([\d.]+)/)?.[1]);
const styles = ['socratic', 'feynman', 'euclid'];
const hero = JSON.parse(readFileSync(resolve(promo, 'src/data/hero-graph.json'), 'utf8'));
const heroSources = hero.source.filter((file) => file !== 'cross_subject_edges.json').map((file) => read(`data/knowledge-graphs/source/${file}`));
const conceptIds = new Set(heroSources.flatMap((graph) => graph.nodes.filter((node) => node.kind === 'concept').map((node) => node.id)));
const crossEdges = read('data/knowledge-graphs/source/cross_subject_edges.json').edges;
const sourceEdges = [...heroSources.flatMap((graph) => graph.edges), ...crossEdges].filter((edge) => edge.type === 'prereq' && conceptIds.has(edge.from) && conceptIds.has(edge.to));
const closure = new Set();
function visit(id) {
  if (closure.has(id)) return;
  closure.add(id);
  sourceEdges.filter((edge) => edge.to === id).forEach((edge) => visit(edge.from));
}
visit('dl_transformer');
const heroIds = new Set(hero.nodes.map((node) => node.id));
const renderedClosure = new Set(hero.nodes.filter((node) => node.inPath).map((node) => node.id));
const edgeKey = (edge) => `${edge.from}:${edge.to}`;
const expectedEdges = new Set(sourceEdges.map(edgeKey));
if (heroIds.size !== conceptIds.size || [...conceptIds].some((id) => !heroIds.has(id)) || renderedClosure.size !== closure.size || [...closure].some((id) => !renderedClosure.has(id)) || hero.edges.length !== sourceEdges.length || hero.edges.some((edge) => !expectedEdges.has(edgeKey(edge)))) throw new Error('Hero graph export has drifted from source');
const claims = { knowledgeGraphs: graphs.length, interactiveComponents: catalog.components.length, tutorStyles: styles, masteryMinimumAnswers: minimumAnswers, masteryAccuracy: accuracy, stage: 'launch_review', heroClosureVerified: true, heroClosureConcepts: closure.size };
if (claims.knowledgeGraphs !== 31 || claims.interactiveComponents !== 49 || minimumAnswers !== 3 || accuracy !== 0.8 || styles.some((style) => !styleSource.includes(`'${style}'`) && !styleSource.includes(`"${style}"`))) throw new Error(`Promo claims have drifted: ${JSON.stringify(claims)}`);
writeFileSync(resolve(promo, 'src/data/claims.json'), JSON.stringify(claims, null, 2) + '\n');
writeFileSync(resolve(promo, 'src/data/components.json'), JSON.stringify(catalog.components.map(({ id, name }) => ({ id, name })), null, 2) + '\n');
console.log('Claims verified from source:', claims);
