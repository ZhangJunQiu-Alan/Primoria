import { LINEAR_FUNCTION_SKILL } from './linearFunction.ts';
import { WAVE_SKILL } from './wave.ts';
import { THREE_D_SCENE_SKILL } from './threeDScene.ts';
import { CHART_SKILL } from './chart.ts';
import { GENERIC_SKILL } from './generic.ts';
import { FRACTION_SKILL } from './fraction.ts';
import { GEOMETRY_TRANSFORMATIONS_SKILL } from './geometryTransformations.ts';
import { CHEMICAL_REACTIONS_SKILL } from './chemicalReactions.ts';
import { WORLD_GEOGRAPHY_SKILL } from './worldGeography.ts';
import { PROBABILITY_DICE_SKILL } from './probabilityDice.ts';
import { WAVE_SOUND_SKILL } from './waveSound.ts';
import { PROGRAMMING_LOGIC_FLOW_SKILL } from './programmingLogicFlow.ts';
import { SUPPLY_DEMAND_SKILL } from './supplyDemand.ts';
import { WEATHER_CLIMATE_SKILL } from './weatherClimate.ts';
import { HISTORICAL_TIMELINE_SKILL } from './historicalTimeline.ts';

export type SkillName =
  | 'linearFunction'
  | 'wave'
  | 'threeDScene'
  | 'chart'
  | 'generic'
  | 'fraction'
  | 'geometryTransformations'
  | 'chemicalReactions'
  | 'worldGeography'
  | 'probabilityDice'
  | 'waveSound'
  | 'programmingLogicFlow'
  | 'supplyDemand'
  | 'weatherClimate'
  | 'historicalTimeline';

const SKILL_BODIES: Record<SkillName, string> = {
  linearFunction: LINEAR_FUNCTION_SKILL,
  wave: WAVE_SKILL,
  threeDScene: THREE_D_SCENE_SKILL,
  chart: CHART_SKILL,
  generic: GENERIC_SKILL,
  fraction: FRACTION_SKILL,
  geometryTransformations: GEOMETRY_TRANSFORMATIONS_SKILL,
  chemicalReactions: CHEMICAL_REACTIONS_SKILL,
  worldGeography: WORLD_GEOGRAPHY_SKILL,
  probabilityDice: PROBABILITY_DICE_SKILL,
  waveSound: WAVE_SOUND_SKILL,
  programmingLogicFlow: PROGRAMMING_LOGIC_FLOW_SKILL,
  supplyDemand: SUPPLY_DEMAND_SKILL,
  weatherClimate: WEATHER_CLIMATE_SKILL,
  historicalTimeline: HISTORICAL_TIMELINE_SKILL,
};

export function pickSkillsForTemplate(
  template: string | undefined,
  technology: string | undefined,
  requestText?: string,
): SkillName[] {
  const t = `${template ?? ''}\n${requestText ?? ''}`.toLowerCase();
  const tech = (technology ?? '').toLowerCase();
  const picked: SkillName[] = [];

  if (tech === 'three') {
    picked.push('threeDScene');
  } else if (tech === 'chartjs') {
    picked.push('chart');
  }

  if (/linear[-_ ]?function|y\s*=\s*a\s*x\s*\+\s*b|slope|intercept/i.test(t)) {
    if (!picked.includes('linearFunction')) picked.push('linearFunction');
  } else if (/(fraction|fractions|numerator|denominator|equivalent fraction|decimal|percentage|percent|number line)/i.test(t)) {
    if (!picked.includes('fraction')) picked.push('fraction');
  } else if (/(geometry|transformation|transformations|rotate|rotation|reflect|reflection|translate|translation|scale factor|coordinate plane|coordinates)/i.test(t)) {
    if (!picked.includes('geometryTransformations')) picked.push('geometryTransformations');
  } else if (/(chemical reaction|chemical reactions|molecule|molecules|atom|atoms|balanced equation|chemistry experiment)/i.test(t)) {
    if (!picked.includes('chemicalReactions')) picked.push('chemicalReactions');
  } else if (/(world geography|atlas|interactive map|countries|capitals|landforms|climate zone|geography)/i.test(t)) {
    if (!picked.includes('worldGeography')) picked.push('worldGeography');
  } else if (/(probability|statistics|dice|spinner|coin|distribution|histogram)/i.test(t)) {
    if (!picked.includes('probabilityDice')) picked.push('probabilityDice');
  } else if (/(wave and sound|sound wave|compression|rarefaction|wavelength|pitch|volume intensity)/i.test(t)) {
    if (!picked.includes('waveSound')) picked.push('waveSound');
  } else if (/(programming logic|flowchart|pseudocode|variables|loops|conditions|code execution|algorithm)/i.test(t)) {
    if (!picked.includes('programmingLogicFlow')) picked.push('programmingLogicFlow');
  } else if (/(supply and demand|equilibrium|shortage|surplus|market price|economics)/i.test(t)) {
    if (!picked.includes('supplyDemand')) picked.push('supplyDemand');
  } else if (/(weather|climate|precipitation|wind|storm|seasonal|temperature)/i.test(t)) {
    if (!picked.includes('weatherClimate')) picked.push('weatherClimate');
  } else if (/(historical timeline|timeline explorer|major events|eras|chronological|history timeline|civilization)/i.test(t)) {
    if (!picked.includes('historicalTimeline')) picked.push('historicalTimeline');
  } else if (/wave|sin|cos|trig/i.test(t)) {
    if (!picked.includes('wave')) picked.push('wave');
  } else if (/3d|three|scene|model/i.test(t) && !picked.includes('threeDScene')) {
    picked.push('threeDScene');
  } else if (/chart|bar|line|pie|scatter|histogram/i.test(t) && !picked.includes('chart')) {
    picked.push('chart');
  }

  if (picked.length === 0) {
    picked.push('generic');
  }

  return picked.slice(0, 2);
}

export function renderSkills(skills: SkillName[]): string {
  return skills.map((name) => SKILL_BODIES[name]).join('\n\n');
}
