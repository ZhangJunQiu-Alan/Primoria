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

describe('interactive visual renderer dispatch', () => {
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

  it('keeps legacy generated HTML on the sandboxed iframe renderer', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          title: 'Legacy trig explorer',
          description: 'Move the slider.',
          generatedHtml: '<div id="graph">hello</div>',
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Legacy trig explorer' })).toBeInTheDocument();
    expect(screen.getByText('Move the slider.')).toBeInTheDocument();

    const frame = screen.getByTitle('Legacy trig explorer');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    expect(frame).toHaveAttribute('srcdoc', expect.stringContaining('<div id="graph">hello</div>'));
  });

  it('keeps generated HTML engine aliases on the sandboxed iframe renderer', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          engine: 'gemini-html5',
          title: 'AI generated visual',
          generatedHtml: '<!doctype html><html><head><title>AI</title></head><body><div id="ai-visual">generated</div></body></html>',
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

  it('routes trusted 3D cell visuals to the trusted renderer boundary', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          engine: 'r3f-cell-3d',
          title: 'Cell explorer',
          description: 'Inspect the organelles.',
          generatedHtml: '<script>window.evil = true</script>',
        })}
      />,
    );

    expect(screen.getByText('3D cell renderer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cell explorer' })).toBeInTheDocument();
    expect(screen.getByText('Inspect the organelles.')).toBeInTheDocument();
    expect(screen.queryByTitle('Cell explorer')).not.toBeInTheDocument();
  });

  it('renders trusted physics wave visuals without iframeing generated HTML', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          engine: 'physics-canvas',
          title: 'Wave laboratory',
          description: 'Explore amplitude and frequency.',
          generatedHtml: '<div>do not execute</div>',
          runtime: {
            simulation: 'wave',
            params: {
              amplitude: 1.4,
              frequency: 2,
              phase: 0.5,
              speed: 1.2,
            },
          },
        })}
      />,
    );

    expect(screen.getByText('Physics canvas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wave laboratory' })).toBeInTheDocument();
    expect(screen.getByLabelText('Wave laboratory wave simulation')).toBeInTheDocument();
    expect(screen.getByText('Amplitude')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.queryByTitle('Wave laboratory')).not.toBeInTheDocument();
  });

  it('makes new interactive visual blocks empty HTML iframe blocks by default', () => {
    render(<BlockRenderer block={buildInteractiveVisualBlock(BLOCK_META['interactive-visual'].defaultContent)} />);

    expect(screen.getByText('Interactive visual')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Interactive Visual' })).toBeInTheDocument();
    expect(screen.getByText('Add generated HTML or choose a trusted renderer to display this block.')).toBeInTheDocument();
    expect(screen.queryByText('Physics canvas')).not.toBeInTheDocument();
    expect(screen.queryByText('Wave Laboratory')).not.toBeInTheDocument();
  });

  it('rejects unsupported physics canvas simulations safely', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          engine: 'physics-canvas',
          title: 'Pendulum draft',
          runtime: {
            simulation: 'pendulum',
          },
        })}
      />,
    );

    expect(screen.getByText('Unsupported physics simulation')).toBeInTheDocument();
    expect(screen.getByText(/runtime\.simulation = "wave"/)).toBeInTheDocument();
    expect(screen.queryByTitle('Pendulum draft')).not.toBeInTheDocument();
  });

  it('does not execute or iframe unknown renderer engines', () => {
    render(
      <BlockRenderer
        block={buildInteractiveVisualBlock({
          engine: 'remote-threejs',
          title: 'Remote renderer',
          generatedHtml: '<div>should not render</div>',
        })}
      />,
    );

    expect(screen.getByText('Unsupported visual renderer')).toBeInTheDocument();
    expect(screen.getByText(/remote-threejs/)).toBeInTheDocument();
    expect(screen.queryByTitle('Remote renderer')).not.toBeInTheDocument();
  });
});
