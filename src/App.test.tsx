import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';

test('renders connect button', () => {
  render(<App />);
  const connectButton = screen.getByTestId('testpage.header.connect');
  expect(connectButton).toBeDefined();
  expect(connectButton.textContent).toBe('Connect');
});
