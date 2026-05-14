type TopicMemory = {
  id: string;
  match: RegExp;
  suggestedTitle: string;
  suggestedDescription: string;
  guidance: string[];
};

const TOPIC_MEMORIES: TopicMemory[] = [
  {
    id: 'solar-system-explorer',
    match: /(solar system|planet|planets|orbit|orbits|moon|moons|distance from the sun|planetary motion)/i,
    suggestedTitle: 'Solar System Explorer',
    suggestedDescription:
      'Explore the planets interactively through animated orbits, planetary facts, and real-time visual comparisons.',
    guidance: [
      'Show planets orbiting around a central sun with real-time orbital motion and clearly separated orbital paths.',
      'Allow orbit speed and visual scaling to be adjusted without losing the learner\'s sense of relative positioning.',
      'Clicking a planet should reveal facts such as size, temperature, distance from the sun, and number of moons.',
      'Keep planetary comparisons readable with labels, legends, or a focused facts panel instead of cluttering the orbit view.',
    ],
  },
  {
    id: 'human-body-systems',
    match: /(human body|body system|circulatory|respiratory|digestive|nervous system|organs|oxygen|blood flow|nerve signals)/i,
    suggestedTitle: 'Human Body Explorer',
    suggestedDescription:
      'Interactively learn how body systems function through animated diagrams and organ-based exploration.',
    guidance: [
      'Use a clickable human body diagram with clear system-level exploration for circulatory, respiratory, digestive, and nervous systems.',
      'Highlight relevant organs dynamically when a system is selected rather than showing every detail at once.',
      'Animate flows such as blood, oxygen, nutrients, or neural signals along visible pathways.',
      'Keep the body silhouette readable and use a side panel or callouts for organ facts and function explanations.',
    ],
  },
  {
    id: 'dna-and-genetics',
    match: /(dna|genetic|genetics|double helix|base pair|base pairs|chromosome|chromosomes|punnett|inheritance|traits|replication)/i,
    suggestedTitle: 'DNA & Genetics Lab',
    suggestedDescription:
      'Visualize DNA structures, inheritance, and genetic replication through interactive scientific animations.',
    guidance: [
      'Show a rotating or explorable DNA double helix with a path to zoom into base pairs and chromosomes.',
      'Animate DNA replication as a step-by-step process instead of a static diagram.',
      'Use simple genetics simulations such as Punnett squares to demonstrate how traits are inherited.',
      'Separate structural views from inheritance views when needed so the learner is not overloaded.',
    ],
  },
  {
    id: 'electricity-and-circuits',
    match: /(electricity|circuit|circuits|battery|bulb|switch|resistor|voltage|current|resistance|circuit board)/i,
    suggestedTitle: 'Circuit Builder Simulator',
    suggestedDescription:
      'Build and test electrical circuits interactively while visualizing the flow of electricity in real time.',
    guidance: [
      'Allow learners to drag and connect batteries, bulbs, switches, and resistors on a circuit board or wiring area.',
      'Use snapping or clearly defined connection points so incomplete and complete circuits are visually obvious.',
      'Animate current flow only when the circuit is complete and explain voltage, current, and resistance changes in real time.',
      'Provide immediate visual feedback for open circuits, short circuits, and powered components such as lit bulbs.',
    ],
  },
  {
    id: 'ecosystem-food-chains',
    match: /(ecosystem|food chain|food web|producer|consumer|predator|species extinction|population growth|organisms)/i,
    suggestedTitle: 'Ecosystem Food Web Explorer',
    suggestedDescription:
      'Explore how organisms interact within ecosystems through animated food chains and environmental simulations.',
    guidance: [
      'Show producers, consumers, and predators connected in a visible food web with clear directional links.',
      'Let learners simulate changes such as extinction or population growth and animate the cascading ecosystem effects.',
      'Use dynamic highlighting to show which species are directly or indirectly affected by a change.',
      'Keep the cause-and-effect relationship more prominent than decorative habitat art.',
    ],
  },
  {
    id: 'geometry-shape-transformations',
    match: /(geometry|transformation|transformations|rotate|rotation|reflect|reflection|translate|translation|scale|coordinate plane|coordinates)/i,
    suggestedTitle: 'Geometry Transformation Studio',
    suggestedDescription:
      'Learn geometric transformations interactively with shapes on a coordinate plane.',
    guidance: [
      'Use a coordinate plane with shapes that can be rotated, reflected, translated, and scaled.',
      'Render both the original and transformed shape on first paint, then use only short direct updates when controls change.',
      'Show coordinates before and after transformation, with clear color or label differences between original and transformed shapes.',
      'Keep controls close to the plane so learners can see the mapping from action to geometric change.',
    ],
  },
  {
    id: 'chemical-reactions',
    match: /(chemical reaction|chemical reactions|molecule|molecules|atom|atoms|balanced equation|mix chemicals|chemistry experiment)/i,
    suggestedTitle: 'Chemical Reaction Simulator',
    suggestedDescription:
      'Visualize a safe chemical reaction through a constrained particle view and live equation updates.',
    guidance: [
      'Render one simple safe reaction on first paint so reactants, products, and the equation are already visible.',
      'Let learners adjust only constrained coefficients or temperature, not arbitrary freeform chemicals.',
      'Update the particle view and balanced equation directly instead of relying on heavy animation choreography.',
      'Use color, labels, or legends to distinguish reactants and products clearly.',
    ],
  },
  {
    id: 'world-geography-explorer',
    match: /(world geography|atlas|globe|interactive map|countries|capitals|landmarks|population|climate|tectonic|trade routes)/i,
    suggestedTitle: 'Interactive World Atlas',
    suggestedDescription:
      'Explore world geography through a simplified offline map with focused regional facts.',
    guidance: [
      'Use a simplified offline SVG world map with a small fixed set of clickable regions or countries.',
      'Support click and filter-based exploration with a focused details panel instead of full GIS navigation.',
      'Keep all map data embedded locally and avoid external tiles, GeoJSON, or globe engines.',
      'Prefer readable boundaries and labels over zoom, pan, or complex animated layers.',
    ],
  },
  {
    id: 'probability-and-dice-simulation',
    match: /(probability|statistics|dice|coin|coins|spinner|spinners|distribution|outcome distribution|simulation lab)/i,
    suggestedTitle: 'Probability Simulation Lab',
    suggestedDescription:
      'Learn probability through visible dice simulations with live histograms and theory comparisons.',
    guidance: [
      'Render a starter sample on first paint so the histogram is never blank.',
      'Show both experimental counts and a simple theoretical comparison as trials accumulate.',
      'Make sample size and convergence easy to observe with clear bars and summary readouts.',
      'Use controls for dice count, roll batch, and reset without hiding the relationship between rolls and outcomes.',
    ],
  },
  {
    id: 'wave-and-sound-visualization',
    match: /(wave and sound|sound wave|sound waves|frequency|frequencies|pitch|amplitude|resonance|interference|audio waveform)/i,
    suggestedTitle: 'Wave & Sound Explorer',
    suggestedDescription:
      'Explore sound waves, frequencies, and resonance through interactive visual and audio simulations.',
    guidance: [
      'Let learners adjust pitch, amplitude, and frequency while watching the waveform update in real time.',
      'When audio is used, start or unmute it only after a user gesture so browser autoplay rules are respected.',
      'Demonstrate interference and resonance with multiple waves or overlays when the request calls for it.',
      'Keep waveform labels and live parameter readouts easy to compare as the sound changes.',
    ],
  },
  {
    id: 'programming-logic-flow',
    match: /(programming logic|algorithm|algorithms|flowchart|flowcharts|variables|loops|conditional|conditionals|memory|code execution)/i,
    suggestedTitle: 'Programming Logic Visualizer',
    suggestedDescription:
      'Understand coding logic, variables, and algorithms through animated program execution and flowcharts.',
    guidance: [
      'Show flowcharts, variables, loops, and conditionals updating dynamically as learners step through execution.',
      'Highlight the current code step or branch so the learner always knows what is executing.',
      'Animate how data changes in memory or variable state at each step.',
      'Use clear transitions for branching, looping, and state changes instead of static code blocks alone.',
    ],
  },
  {
    id: 'supply-and-demand-economics',
    match: /(supply and demand|economics|market demand|market supply|equilibrium|pricing|consumer|producer)/i,
    suggestedTitle: 'Supply & Demand Simulator',
    suggestedDescription:
      'Explore economic market behavior interactively through dynamic supply and demand visualizations.',
    guidance: [
      'Allow supply, demand, and pricing to be adjusted with live graph updates.',
      'Show equilibrium shifts clearly on labeled axes and make market movement visually obvious.',
      'Explain consumer and producer effects as the curves move rather than only showing the lines.',
      'Keep the graph readable and avoid unrelated widgets that distract from equilibrium changes.',
    ],
  },
  {
    id: 'weather-and-climate-systems',
    match: /(weather|climate|storm|rainfall|cloud formation|wind movement|temperature zones|storm development|environmental conditions)/i,
    suggestedTitle: 'Weather System Simulator',
    suggestedDescription:
      'Visualize weather patterns, storms, and climate systems interactively through animated environmental simulations.',
    guidance: [
      'Show weather and climate on a map with layers such as clouds, rainfall, wind, temperature zones, and storm development.',
      'Let learners manipulate environmental conditions and observe the resulting weather changes dynamically.',
      'Animate changes across the map so movement of fronts, storms, or wind is visually understandable.',
      'Avoid too many simultaneous overlays; reveal layers progressively or by selection.',
    ],
  },
  {
    id: 'historical-timeline-explorer',
    match: /(history|historical timeline|timeline explorer|major world events|chronologically|civilization|civilizations|historical developments|key figures)/i,
    suggestedTitle: 'Interactive History Timeline',
    suggestedDescription:
      'Explore historical events and civilizations through animated timelines and interactive storytelling.',
    guidance: [
      'Display major events chronologically with animated transitions between periods or eras.',
      'Allow learners to zoom into events, explore key figures, and inspect relationships between developments.',
      'Keep chronology visually primary so the learner never loses the order of events.',
      'Use connectors, grouped eras, or contextual callouts to show how one development influences another.',
    ],
  },
];

export function buildTopicMemoryBlock(text: string): string {
  const match = TOPIC_MEMORIES.find((topic) => topic.match.test(text));
  if (!match) {
    return '';
  }

  return [
    `Reference memory for similar prompts: ${match.id}`,
    `- Suggested title: ${match.suggestedTitle}`,
    `- Suggested description: ${match.suggestedDescription}`,
    ...match.guidance.map((line) => `- ${line}`),
  ].join('\n');
}
