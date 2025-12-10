import type React from 'react';
import { createContext, useContext, useState } from 'react';

// Supported bitcoin networks for this test dapp
export type BitcoinNetwork = 'bitcoin:mainnet' | 'bitcoin:testnet';

interface EndpointContextType {
  network: BitcoinNetwork;
  setNetwork: (value: BitcoinNetwork) => void;
}

const LOCAL_STORAGE_KEY = 'btc_network';

const EndpointContext = createContext<EndpointContextType | undefined>(undefined);

export const EndpointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [network, setNetwork] = useState<BitcoinNetwork>(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY) as BitcoinNetwork | null;
    return stored ?? 'bitcoin:testnet';
  });

  const handleSetNetwork = (value: BitcoinNetwork) => {
    setNetwork(value);
    localStorage.setItem(LOCAL_STORAGE_KEY, value);
  };

  return (
    <EndpointContext.Provider value={{ network, setNetwork: handleSetNetwork }}>{children}</EndpointContext.Provider>
  );
};

export const useEndpoint = (): EndpointContextType => {
  const ctx = useContext(EndpointContext);
  if (!ctx) {
    throw new Error('useEndpoint must be used within an EndpointProvider');
  }
  return ctx;
};
