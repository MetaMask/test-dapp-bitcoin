import { useEffect, useRef } from 'react';
import { useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { clearSavedConnection, getSavedConnection, useConnect } from './useConnect';

export function useAutoReconnect() {
  const { wallets, connected } = useBitcoinWalletCtx();
  const { connectWithWallet } = useConnect();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current || connected || wallets.length === 0) {
      return;
    }

    const saved = getSavedConnection();
    if (!saved) {
      return;
    }

    hasAttempted.current = true;

    const wallet = wallets.find((w) => w.name === saved.walletName);
    if (!wallet) {
      return;
    }

    connectWithWallet(wallet, saved.connectionType).catch(() => {
      // If auto-reconnect fails, clear the saved connection so we don't retry
      clearSavedConnection();
    });
  }, [wallets, connected, connectWithWallet]);
}
