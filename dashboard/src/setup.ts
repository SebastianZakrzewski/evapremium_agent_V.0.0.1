import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', window.location.pathname);
});
