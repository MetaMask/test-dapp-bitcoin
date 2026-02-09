import type { WalletWithFeatures } from '@wallet-standard/base';

import type { BitcoinConnectFeature } from './connect';
import type { BitcoinDisconnectFeature } from './disconnect';
import type { BitcoinSatsConnectFeature } from './satsConnect.js';
import type { BitcoinSignAndSendTransactionFeature } from './signAndSendTransaction';
import type { BitcoinSignMessageFeature } from './signMessage';
import type { BitcoinSignTransactionFeature } from './signTransaction';
import type { StandardEventsFeature } from './events';

/** Type alias for some or all Bitcoin features. */
export type BitcoinStandardFeatures = BitcoinConnectFeature &
  BitcoinDisconnectFeature &
  BitcoinSignTransactionFeature &
  BitcoinSignAndSendTransactionFeature &
  BitcoinSignMessageFeature &
  StandardEventsFeature;

/** Wallet with Bitcoin standard features. */
export type WalletWithBitcoinStandardFeatures = WalletWithFeatures<BitcoinStandardFeatures>;

/** Wallet with Bitcoin statsConnect feature. */
export type WalletWithBitcoinSatsConnectFeature = WalletWithFeatures<BitcoinSatsConnectFeature>;

export * from './connect';
export * from './disconnect';
export * from './signTransaction';
export * from './signAndSendTransaction';
export * from './signMessage';
export * from './satsConnect';
export * from './utils';
export * from './events';