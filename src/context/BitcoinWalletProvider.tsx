import { type Wallet, type WalletAccount, getWallets } from '@wallet-standard/core';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isBitcoinWalletStandardWallet } from '../features/utils';
import { useEndpoint } from './EndpointProvider';

// Enum for wallet connection types
export enum WalletConnectionType {
  Standard = 'standard',
  SatsConnect = 'satsConnect',
}

// State values required by user (no functions here)
export interface BitcoinWalletStateContextValue {
  selectedAccount: WalletAccount | undefined;
  connected: boolean;
  network: string; // mirrored from EndpointProvider
  wallets: Wallet[];
  selectedWallet: Wallet | undefined;
  accounts: WalletAccount[];
  statsConnectProvider: any | undefined;
  selectedConnectionType: WalletConnectionType | undefined;
  setSelectedAccount: (a: WalletAccount | undefined) => void;
  setWallets: (w: Wallet[]) => void;
  setAccounts: (a: WalletAccount[]) => void;
  setSatsConnectProvider: (p: any | undefined) => void;
  setSelectedWallet: (w: Wallet | undefined) => void;
  setSelectedConnectionType: (type: WalletConnectionType | undefined) => void;
}

const BitcoinWalletStateContext = createContext<BitcoinWalletStateContextValue | undefined>(undefined);

export const BitcoinWalletProvider = ({ children }: { children: ReactNode }) => {
  const { network } = useEndpoint();
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | undefined>(undefined);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | undefined>(undefined);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [statsConnectProvider, setSatsConnectProvider] = useState<any | undefined>(undefined);
  const [selectedConnectionType, setSelectedConnectionType] = useState<WalletConnectionType | undefined>(undefined);
  const connected = !!selectedWallet;

  useEffect(() => {
    const detectedWallets = getWallets().get();
    console.log('Detected wallets:', detectedWallets);
    setWallets(detectedWallets.filter((w: Wallet) => isBitcoinWalletStandardWallet(w)));
  }, []);

  const stateValue = useMemo<BitcoinWalletStateContextValue>(
    () => ({
      selectedAccount,
      connected,
      network,
      wallets,
      selectedWallet,
      accounts,
      statsConnectProvider,
      selectedConnectionType,
      setSelectedAccount,
      setWallets,
      setAccounts,
      setSatsConnectProvider,
      setSelectedWallet,
      setSelectedConnectionType,
    }),
    [
      selectedAccount,
      connected,
      network,
      wallets,
      accounts,
      statsConnectProvider,
      selectedWallet,
      selectedConnectionType,
    ],
  );

  return <BitcoinWalletStateContext.Provider value={stateValue}>{children}</BitcoinWalletStateContext.Provider>;
};

export function useBitcoinWalletCtx(): BitcoinWalletStateContextValue {
  const ctx = useContext(BitcoinWalletStateContext);
  if (!ctx) {
    throw new Error('useBitcoinWalletCtx must be used within BitcoinWalletProvider');
  }
  return ctx;
}
