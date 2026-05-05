import { render, screen, within } from '@testing-library/react';
import { TutorMarkdown } from '@/shared/ai-tutor/TutorMarkdown';

describe('TutorMarkdown', () => {
  it('renders bold markers and ordered lists without exposing raw markdown syntax', () => {
    render(
      <TutorMarkdown
        text={`1.**Singleton Pattern**：保证全局唯一实例\n2.**Strategy Pattern**：封装可切换算法\n\n结论：优先隔离依赖。`}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('Singleton Pattern').tagName).toBe('STRONG');
    expect(within(items[1]!).getByText('Strategy Pattern').tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*Singleton Pattern\*\*/)).not.toBeInTheDocument();
    expect(screen.getByText(/结论：优先隔离依赖。/)).toBeInTheDocument();
  });

  it('renders embedded interactive visual cards from the custom tutor fence', () => {
    render(
      <TutorMarkdown
        text={[
          'Explore this graph below.',
          '',
          '```primoria-interactive-visual',
          JSON.stringify({
            title: 'Interactive sine and cosine graph',
            description: 'Move the slider to compare both values.',
            generatedHtml: '<div id="graph">hello</div>',
          }),
          '```',
          '',
          'Then compare the two curves.',
        ].join('\n')}
      />,
    );

    expect(screen.getByText('Explore this graph below.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Interactive sine and cosine graph' })).toBeInTheDocument();
    expect(screen.getByText('Move the slider to compare both values.')).toBeInTheDocument();
    expect(screen.getByTitle('Interactive sine and cosine graph')).toBeInTheDocument();
    expect(screen.getByText('Then compare the two curves.')).toBeInTheDocument();
    expect(screen.queryByText('```primoria-interactive-visual')).not.toBeInTheDocument();
  });
});
