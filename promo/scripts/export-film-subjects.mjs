import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../../data/knowledge-graphs/source/', import.meta.url);
const prefixes = [
  ['a_level_', 'A Level'], ['senior_secondary_', 'Senior Secondary'],
  ['singapore_h2_', 'Singapore H2'], ['singapore_lower_secondary_', 'Singapore Lower Secondary'],
  ['singapore_secondary_', 'Singapore Secondary'],
];
const subjects = readdirSync(root).filter((file) => file.endsWith('.json')).sort().flatMap((file) => {
  const graph = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
  if (!Array.isArray(graph.nodes)) return [];
  const id = graph.graph_id ?? file.replace('.json', '');
  const prefix = prefixes.find(([match]) => id.startsWith(match));
  const name = `${prefix ? `${prefix[1]} ` : ''}${graph.subject}`;
  if (!graph.subject) throw new Error(`Missing graph subject: ${id}`);
  return [{ id, name }];
});
if (subjects.length !== 31) throw new Error(`Graph count changed: ${subjects.length}`);
writeFileSync(new URL('../src/data/film-subjects.json', import.meta.url), JSON.stringify(subjects, null, 2) + '\n');
console.log(`Exported ${subjects.length} graph names from source.`);
