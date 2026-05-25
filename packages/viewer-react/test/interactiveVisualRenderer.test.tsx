import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { BLOCK_META } from '@/features/editor/blockRegistry';
import { BlockRenderer } from '@/shared/lesson/BlockRenderer';
import type { LessonBlock } from '@/shared/lesson/types';

function buildInteractiveVisualBlock(content: Record<string, unknown>): LessonBlock {
  return {
    id: 'visual-1',
    type: 'interactive-visual',
    position: { order: 0 },
    content,
  };
}

describe('interactive visual renderer', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn(() => 1),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders generated HTML inside a sandboxed iframe', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          title: 'Trig explorer',
          description: 'Move the slider.',
          generatedHtml: '<div id="graph">hello</div>',
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Trig explorer' })).toBeInTheDocument();
    expect(screen.getByText('Move the slider.')).toBeInTheDocument();

    const frame = screen.getByTitle('Trig explorer');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    expect(frame).toHaveAttribute('srcdoc', expect.stringContaining('<div id="graph">hello</div>'));
  });

  it('wraps a full HTML document with the runtime bridge', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          title: 'AI generated visual',
          generatedHtml:
            '<!doctype html><html><head><title>AI</title></head><body><div id="ai-visual">generated</div></body></html>',
        })}
      />,
    );

    const frame = screen.getByTitle('AI generated visual');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    const srcDoc = frame.getAttribute('srcdoc') ?? '';
    expect(srcDoc).toContain('<html>');
    expect(srcDoc.match(/<html/gi)).toHaveLength(1);
    expect(srcDoc).toContain('<div id="ai-visual">generated</div>');
    expect(srcDoc).toContain('window.PrimoriaInteractive');
  });

  it('shows an empty state when no generated HTML is present', () => {
    render(<BlockRenderer block={buildInteractiveVisualBlock(BLOCK_META['interactive-visual'].defaultContent)} />);

    expect(screen.getByText('Interactive visual')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Interactive Visual' })).toBeInTheDocument();
    expect(
      screen.getByText('Generate or paste HTML to display this interactive visual.'),
    ).toBeInTheDocument();
  });
});
