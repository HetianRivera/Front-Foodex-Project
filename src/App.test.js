import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login heading', () => {
  render(<App />);
  const heading = screen.getByText(/FOODEX - Taller Gastronómico/i);
  expect(heading).toBeInTheDocument();
});
