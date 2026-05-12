import { LINEAR_FUNCTION_SKILL } from './linearFunction.ts';
import { WAVE_SKILL } from './wave.ts';
import { THREE_D_SCENE_SKILL } from './threeDScene.ts';
import { CHART_SKILL } from './chart.ts';
import { GENERIC_SKILL } from './generic.ts';
import { FRACTION_SKILL } from './fraction.ts';

export type SkillName = 'linearFunction' | 'wave' | 'threeDScene' | 'chart' | 'generic' | 'fraction';

const SKILL_BODIES: Record<SkillName, string> = {
  linearFunction: LINEAR_FUNCTION_SKILL,
  wave: WAVE_SKILL,
  threeDScene: THREE_D_SCENE_SKILL,
  chart: CHART_SKILL,
  generic: GENERIC_SKILL,
  fraction: FRACTION_SKILL,
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
