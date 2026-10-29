import { AbsoluteFill, random } from 'remotion';
import type { TransitionPresentationComponentProps } from '@remotion/transitions';

export function InkDissolve({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<Record<string, never>>) {
  if (presentationDirection === 'exiting' || presentationProgress >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const radius = presentationProgress * 1400;
  const points = Array.from({ length: 64 }, (_, index) => {
    const angle = index / 64 * Math.PI * 2;
    const r = radius * (0.85 + random(`ink-dissolve-${index}`) * 0.15);
    return `${960 + Math.cos(angle) * r}px ${540 + Math.sin(angle) * r}px`;
  }).join(',');
  return <AbsoluteFill style={{ clipPath: `polygon(${points})` }}>{children}</AbsoluteFill>;
}
