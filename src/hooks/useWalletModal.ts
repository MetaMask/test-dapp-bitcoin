import type { Wallet } from '@wallet-standard/base';
import { useCallback } from 'react';
import type { WalletConnectionType } from '../context/BitcoinWalletProvider';
import { useConnect } from './useConnect';

export function useWalletModal() {
  const {
    connect,
    disconnect,
    connectWithWallet,
    isModalOpen,
    closeModal,
    wallets,
    connectingWallet,
    selectedConnectionType,
  } = useConnect();

  const openModal = useCallback(async () => {
    await connect();
  }, [connect]);

  const selectWallet = useCallback(
    async (wallet: Wallet, connectionType: WalletConnectionType) => {
      await connectWithWallet(wallet, connectionType);
    },
    [connectWithWallet],
  );

  return {
    isModalOpen,
    wallets,
    openModal,
    closeModal,
    selectWallet,
    connectingWallet,
    disconnect,
    selectedConnectionType,
  };
}
