import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { dataTestIds } from '../test';
import { SendTestTransaction } from './SendTestTransaction';

const sendPayment = vi.fn();

vi.mock('../hooks/useSendPayment', () => ({
  useSendPayment: () => sendPayment,
}));

vi.mock('../hooks/useConnect', () => ({
  useConnect: () => ({ selectedAccount: { address: 'tb1qsender' }, connected: true }),
}));

vi.mock('./TransactionHash', () => ({
  TransactionHash: ({ hash }: { hash: string }) => <span>{hash}</span>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function send(result: { txId: string; canBeMalleable?: boolean }) {
  sendPayment.mockResolvedValue(result);
  render(<SendTestTransaction />);
  fireEvent.change(screen.getByTestId(dataTestIds.testPage.sendTransaction.recipient), {
    target: { value: 'tb1qrecipient' },
  });
  fireEvent.click(screen.getByTestId(dataTestIds.testPage.sendTransaction.sendTransaction));
  await waitFor(() => screen.getByText('txid-123'));
}

test('renders canBeMalleable when the flag is false (not just truthy)', async () => {
  await send({ txId: 'txid-123', canBeMalleable: false });
  expect(screen.getByTestId(dataTestIds.testPage.sendTransaction.canBeMalleable).textContent).toBe(
    'Can be malleable: false',
  );
});

test('renders canBeMalleable when the flag is true', async () => {
  await send({ txId: 'txid-123', canBeMalleable: true });
  expect(screen.getByTestId(dataTestIds.testPage.sendTransaction.canBeMalleable).textContent).toBe(
    'Can be malleable: true',
  );
});

test('hides the canBeMalleable row when the wallet omits the flag', async () => {
  await send({ txId: 'txid-123' });
  expect(screen.queryByTestId(dataTestIds.testPage.sendTransaction.canBeMalleable)).toBeNull();
});
