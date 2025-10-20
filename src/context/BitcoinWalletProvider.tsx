import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useEndpoint } from './EndpointProvider';
import { Wallet } from '@wallet-standard/core';

// State values required by user (no functions here)
export interface BitcoinWalletStateContextValue {
  address: string | null;
  connected: boolean;
  network: string; // mirrored from EndpointProvider
  wallets: any[];
  accounts: { address: string; purpose?: string }[];
  provider: any | null;
  setAddress: (a: string | null) => void;
  setWallets: (w: any[]) => void;
  setAccounts: (a: { address: string; purpose?: string }[]) => void;
  setProvider: (p: any | null) => void;
}

const BitcoinWalletStateContext = createContext<BitcoinWalletStateContextValue | undefined>(undefined);

export const BitcoinWalletProvider = ({ children }: { children: ReactNode }) => {
  const { network } = useEndpoint();
  const [address, setAddress] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [accounts, setAccounts] = useState<{ address: string; purpose?: string }[]>([]);
  const [provider, setProvider] = useState<any | null>(null);
  const connected = !!address;

  const stateValue = useMemo<BitcoinWalletStateContextValue>(
    () => ({ address, connected, network, wallets, accounts, provider, setAddress, setWallets, setAccounts, setProvider }),
    [address, connected, network, wallets, accounts, provider],
  );

  return (
    <BitcoinWalletStateContext.Provider value={stateValue}>
      {children}
    </BitcoinWalletStateContext.Provider>
  );
};

export function useBitcoinWalletCtx(): BitcoinWalletStateContextValue {
  const ctx = useContext(BitcoinWalletStateContext);
  if (!ctx) throw new Error('useBitcoinWalletCtx must be used within BitcoinWalletProvider');
  return ctx;
}
