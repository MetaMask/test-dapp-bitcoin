import type { Wallet } from '@wallet-standard/base';
import {
  BitcoinConnect,
  BitcoinSatsConnect,
  type WalletWithBitcoinSatsConnectFeature,
  type WalletWithBitcoinStandardFeatures,
} from '.';

/**
 * Is the given wallet a Bitcoin Stats Connect Wallet Standard
 * @param wallet
 * @returns
 */
export function isBitcoinStatsConnectWalletStandardWallet(
  wallet: Wallet,
): wallet is WalletWithBitcoinSatsConnectFeature {
  return BitcoinSatsConnect in wallet.features;
}

/**
 * Is the given wallet a Bitcoin Standard Wallet Standard
 * @param wallet
 * @returns
 */
export function isBitcoinStandardWalletStandardWallet(wallet: Wallet): wallet is WalletWithBitcoinStandardFeatures {
  return BitcoinConnect in wallet.features;
}

/**
 * Is the given wallet a Bitcoin Wallet Standard
 * @param wallet
 * @returns
 */
export function isBitcoinWalletStandardWallet(
  wallet: Wallet,
): wallet is WalletWithBitcoinSatsConnectFeature | WalletWithBitcoinStandardFeatures {
  return isBitcoinStatsConnectWalletStandardWallet(wallet) || isBitcoinStandardWalletStandardWallet(wallet);
}

/**
 * Asserts the given wallet is a Bitcoin Stats Connect Wallet Standard
 * @param wallet
 */
export function assertIsBitcoinStatsConnectWalletStandardWallet(
  wallet: Wallet,
): asserts wallet is WalletWithBitcoinSatsConnectFeature {
  if (!isBitcoinStatsConnectWalletStandardWallet(wallet)) {
    throw new Error('Wallet is not a Bitcoin Stats Connect Wallet Standard');
  }
}

/**
 * Asserts the given wallet is a Bitcoin Standard Wallet Standard
 * @param wallet
 */
export function assertIsBitcoinStandardWalletStandardWallet(
  wallet: Wallet,
): asserts wallet is WalletWithBitcoinStandardFeatures {
  if (!isBitcoinStandardWalletStandardWallet(wallet)) {
    throw new Error('Wallet is not a Bitcoin Standard Wallet Standard');
  }
}

/**
 * Asserts the given wallet is a Bitcoin Wallet Standard
 * @param wallet
 */
export function assertIsBitcoinWalletStandardWallet(
  wallet: Wallet,
): asserts wallet is WalletWithBitcoinSatsConnectFeature | WalletWithBitcoinStandardFeatures {
  if (!isBitcoinWalletStandardWallet(wallet)) {
    throw new Error('Wallet is not a Bitcoin Wallet Standard');
  }
}
