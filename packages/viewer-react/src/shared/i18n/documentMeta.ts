import { useEffect } from 'react';

function setMetaContent(name: string, content?: string) {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (element) {
      element.remove();
    }
    return;
  }

  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }

  element.content = content;
}

export function applyDocumentMeta(meta: {
  title?: string;
  description?: string;
}) {
  if (typeof document === 'undefined') {
    return;
  }

  if (meta.title) {
    document.title = meta.title;
  }

  setMetaContent('description', meta.description);
}

export function useDocumentMeta(meta: {
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    applyDocumentMeta(meta);
  }, [meta.description, meta.title]);
}
