import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('App shell', () => {
  it('renders the CELLCRAFT heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'CELLCRAFT' })).toBeInTheDocument();
  });
});
