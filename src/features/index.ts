import type { WalletWithFeatures } from '@wallet-standard/base';

import type { BitcoinConnectFeature } from './connect.js';
import type { BitcoinDisconnectFeature } from './disconnect.js';
import type { BitcoinSatsConnectFeature } from './satsConnect.js';
import type { BitcoinSignAndSendTransactionFeature } from './signAndSendTransaction.js';
import type { BitcoinSignMessageFeature } from './signMessage.js';
import type { BitcoinSignTransactionFeature } from './signTransaction.js';

/** Type alias for some or all Bitcoin features. */
export type BitcoinStandardFeatures = BitcoinConnectFeature &
  BitcoinDisconnectFeature &
  BitcoinSignTransactionFeature &
  BitcoinSignAndSendTransactionFeature &
  BitcoinSignMessageFeature;

/** Wallet with Bitcoin standard features. */
export type WalletWithBitcoinStandardFeatures = WalletWithFeatures<BitcoinStandardFeatures>;

/** Wallet with Bitcoin statsConnect feature. */
export type WalletWithBitcoinSatsConnectFeature = WalletWithFeatures<BitcoinSatsConnectFeature>;

export * from './connect.js';
export * from './disconnect.js';
export * from './signTransaction.js';
export * from './signAndSendTransaction.js';
export * from './signMessage.js';
export * from './satsConnect.js';
export * from './utils.js';
