import { afterEach, beforeAll } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: (key: string): string | null => {
    return localStorageMock.store[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    localStorageMock.store[key] = value;
  },
  removeItem: (key: string): void => {
    delete localStorageMock.store[key];
  },
  clear: (): void => {
    localStorageMock.store = {};
  },
  store: {} as Record<string, string>,
};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  localStorageMock.clear();
});
