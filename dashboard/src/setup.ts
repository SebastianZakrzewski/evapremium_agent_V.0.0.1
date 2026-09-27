import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', window.location.pathname);
});
