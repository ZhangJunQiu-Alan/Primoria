import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { beforeEach } from 'vitest';

const localStorageStore = new Map<string, string>();

configure({
  asyncUtilTimeout: 15000,
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem(key: string) {
      return localStorageStore.has(key) ? localStorageStore.get(key)! : null;
    },
    setItem(key: string, value: string) {
      localStorageStore.set(key, value);
    },
    removeItem(key: string) {
      localStorageStore.delete(key);
    },
    clear() {
      localStorageStore.clear();
    },
  },
  configurable: true,
});

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
}

if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {};
}

if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {};
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

beforeEach(() => {
  localStorageStore.clear();
});
