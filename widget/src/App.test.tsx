import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the skeleton placeholder', () => {
    render(<App />);
    expect(
      screen.getByText('EVA Premium — widget czatu (szkielet)'),
    ).toBeInTheDocument();
  });
});
