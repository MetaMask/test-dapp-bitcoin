import { act, cleanup, render, screen } from '@testing-library/react';
import { getWallets } from '@wallet-standard/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BitcoinWalletProvider } from '../context/BitcoinWalletProvider';
import { EndpointProvider } from '../context/EndpointProvider';
import { useMetaMaskReady } from './useMetaMaskReady';

vi.mock('@wallet-standard/core', () => ({
  getWallets: vi.fn(),
}));

const getWalletsMock = vi.mocked(getWallets);

const bitcoinWallet = (name: string) => ({
  name,
  icon: '',
  chains: [],
  features: { 'bitcoin:connect': {} },
});

function MetaMaskProbe() {
  return <div>{useMetaMaskReady() ? 'ready' : 'not-ready'}</div>;
}

describe('useMetaMaskReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('tracks Wallet Standard registration and unregistration', () => {
    const registered: ReturnType<typeof bitcoinWallet>[] = [];
    let register: ((...wallets: ReturnType<typeof bitcoinWallet>[]) => void) | undefined;
    let unregister: ((...wallets: ReturnType<typeof bitcoinWallet>[]) => void) | undefined;

    getWalletsMock.mockReturnValue({
      get: () => registered,
      on: (event: 'register' | 'unregister', listener: (...wallets: ReturnType<typeof bitcoinWallet>[]) => void) => {
        if (event === 'register') {
          register = listener;
        } else {
          unregister = listener;
        }
        return vi.fn();
      },
    } as never);

    render(
      <EndpointProvider>
        <BitcoinWalletProvider>
          <MetaMaskProbe />
        </BitcoinWalletProvider>
      </EndpointProvider>,
    );

    expect(screen.getByText('not-ready')).toBeDefined();

    const metamask = bitcoinWallet('MetaMask Bitcoin');
    registered.push(metamask);
    act(() => register?.(metamask));
    expect(screen.getByText('ready')).toBeDefined();

    registered.length = 0;
    act(() => unregister?.(metamask));
    expect(screen.getByText('not-ready')).toBeDefined();
  });

  it('ignores wallets that do not support Bitcoin', () => {
    const registered = [{ name: 'MetaMask', icon: '', chains: [], features: {} }];

    getWalletsMock.mockReturnValue({
      get: () => registered,
      on: vi.fn(() => vi.fn()),
    } as never);

    render(
      <EndpointProvider>
        <BitcoinWalletProvider>
          <MetaMaskProbe />
        </BitcoinWalletProvider>
      </EndpointProvider>,
    );

    expect(screen.getByText('not-ready')).toBeDefined();
  });
});
