import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('App shell', () => {
  it('renders the landing page', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('CELLCRAFT');
  });
});
