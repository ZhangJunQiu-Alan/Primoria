import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { applyDocumentMeta } from '@/shared/i18n/documentMeta';
import { PageContainer } from '@/shared/layout/PageContainer';

function readDescriptionMeta() {
  return document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
}

afterEach(() => {
  cleanup();
  document.title = '';
  readDescriptionMeta()?.remove();
});

describe('document metadata helpers', () => {
  it('creates, updates, and removes the description meta tag', () => {
    applyDocumentMeta({ title: 'Primoria', description: 'Product path' });

    expect(document.title).toBe('Primoria');
    expect(readDescriptionMeta()?.content).toBe('Product path');

    applyDocumentMeta({ description: undefined });
    expect(readDescriptionMeta()).toBeNull();
  });

  it('syncs document metadata from PageContainer props', () => {
    render(
      <PageContainer title="Library" subtitle="Browse courses and continue learning.">
        <div>content</div>
      </PageContainer>,
    );

    expect(screen.getByRole('heading', { name: 'Library' })).toBeInTheDocument();
    expect(document.title).toBe('Library | Primoria');
    expect(readDescriptionMeta()?.content).toBe('Browse courses and continue learning.');
  });
});
