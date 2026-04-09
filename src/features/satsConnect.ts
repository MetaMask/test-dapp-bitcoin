import type { BitcoinProvider } from 'sats-connect-v4';

export const BitcoinSatsConnect = 'sats-connect:';

export type BitcoinSatsConnectFeature = {
  [BitcoinSatsConnect]: {
    provider: BitcoinProvider;
  };
};
