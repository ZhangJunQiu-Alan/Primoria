export type Shot = {
  id: string;
  act: number;
  seconds: number;
  name: string;
  description: string;
  camera: string;
  dissolve?: boolean;
};

export const acts = ['NOISE', 'ONE QUESTION', 'THE MAP', 'THE LESSON', 'YOUR MATERIALS', 'CODA'];
export const shots: Shot[] = [
  { id: 'S01', act: 1, seconds: 6, name: 'An abundance of information', description: 'Out-of-focus pages, tabs and video fragments. The camera pushes through the noise.', camera: 'MACRO PUSH → Z-AXIS FLIGHT' },
  { id: 'S02', act: 1, seconds: 4, name: 'Where do I start?', description: 'The fragments fall away. One cursor remains. Hold half a second of silence.', camera: 'FREEZE → EMPTY FRAME' },
  { id: 'S03', act: 2, seconds: 5, name: 'One question', description: 'The same cursor is inside Primoria. The frame opens and the paper warms.', camera: 'CURSOR MATCH CUT → PULL BACK' },
  { id: 'S04', act: 2, seconds: 2, name: 'A drop of ink', description: 'Return. The question contracts into one drop and lands on the paper.', camera: 'IMPACT → OVERHEAD' },
  { id: 'S05', act: 3, seconds: 7, name: 'Knowledge takes shape', description: 'Ink follows prerequisite edges backwards from Transformers into linear algebra.', camera: 'OVERHEAD / REVERSE INK FLOW' },
  { id: 'S06', act: 3, seconds: 7, name: 'Begin where you are', description: 'Orbit the layered graph. Four already-mastered concepts recede; the frontier remains.', camera: 'TILT 50° → SLOW ORBIT / RACK FOCUS' },
  { id: 'S07', act: 3, seconds: 5, name: 'A path to understanding', description: 'Follow the green line through the remaining concepts. End at Transformer Architecture.', camera: 'TRACK THE PATH / LIGHT SWEEP 01' },
  { id: 'S08', act: 3, seconds: 4, name: 'A course for one learner', description: 'Concept groups settle into lesson rows. The camera turns to face the outline.', camera: 'GRAPH-TO-OUTLINE MATCH CUT' },
  { id: 'S09', act: 4, seconds: 5, name: 'Learn it. Run it.', description: 'Enter the relevant attention lesson: explanation, analogy, code, then Run.', camera: 'PUSH INTO LESSON / FOUR BEAT CUTS' },
  { id: 'S10', act: 4, seconds: 6, name: 'Make the abstract tangible', description: 'Move the wave slider, then pull back into a wall of interactive components.', camera: 'SLIDER MACRO → COMPONENT WALL' },
  { id: 'S11', act: 4, seconds: 7, name: 'Three ways to understand', description: 'One attention question. Socratic guidance, Feynman analogy, Euclidean reasoning.', camera: 'THREE PANELS / CONTROLLED WHIP' },
  { id: 'S12', act: 4, seconds: 7, name: 'Evidence of understanding', description: 'The final qualifying answer completes the mastery evidence. The graph updates.', camera: 'ANSWER DETAIL → MASTERY / SINGLE OVERSHOOT', dissolve: true },
  { id: 'S13', act: 5, seconds: 5, name: 'Your lectures, connected', description: 'Four demonstration lectures settle in order. Their concept maps join together.', camera: 'OVERHEAD / SLOW PUSH' },
  { id: 'S14', act: 5, seconds: 5, name: 'Keep the source in sight', description: 'Focus shifts from a material citation to a reconstructed source excerpt.', camera: 'CITATION → EXCERPT / RACK FOCUS', dissolve: true },
  { id: 'S15', act: 6, seconds: 5, name: 'A wider world of knowledge', description: 'The learner graph becomes one cluster among the source-derived knowledge graphs.', camera: 'RAPID PULL BACK → CONSTELLATION' },
  { id: 'S16', act: 6, seconds: 10, name: 'Every question deserves a path.', description: 'Nodes gather into the three logo planes. Close the letterbox and hold the brand.', camera: 'LOGO MATCH CUT / LIGHT SWEEP 02 / HOLD' },
];
