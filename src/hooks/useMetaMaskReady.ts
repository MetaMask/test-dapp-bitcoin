import { useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';

function isMetaMaskName(name: string): boolean {
  return name.includes('MetaMask');
}

export function hasMetaMaskWallet(wallets: readonly { name: string }[]): boolean {
  return wallets.some(({ name }) => isMetaMaskName(name));
}

export function useMetaMaskReady(): boolean {
  const { wallets } = useBitcoinWalletCtx();
  return hasMetaMaskWallet(wallets);
}
