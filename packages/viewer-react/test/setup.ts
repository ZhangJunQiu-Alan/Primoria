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

beforeEach(() => {
  localStorageStore.clear();
});
