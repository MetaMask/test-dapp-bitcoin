import type { Wallet } from '@wallet-standard/base';
import { useCallback, useState } from 'react';
import { AddressPurpose, BitcoinNetworkType, getAddress } from 'sats-connect';
import { WalletConnectionType, useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { useEndpoint } from '../context/EndpointProvider';
import {
  BitcoinConnect,
  BitcoinSatsConnect,
  assertIsBitcoinStandardWalletStandardWallet,
  assertIsBitcoinStatsConnectWalletStandardWallet,
  isBitcoinStandardWalletStandardWallet,
  isBitcoinStatsConnectWalletStandardWallet,
} from '../features';

// Hook exposing state + connect action
export function useConnect() {
  const { network } = useEndpoint();
  const state = useBitcoinWalletCtx();
  const {
    setAccounts,
    setSatsConnectProvider,
    setSelectedAccount,
    wallets,
    selectedWallet,
    setSelectedWallet,
    selectedConnectionType,
    setSelectedConnectionType,
  } = useBitcoinWalletCtx();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<Wallet | undefined>(undefined);

  const connect = useCallback(async () => {
    if (selectedWallet) {
      // If `selectedWallet` is already set, do nothing
      return;
    }

    // Open modal to select wallet
    setIsModalOpen(true);
  }, [selectedWallet]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setConnectingWallet(undefined);
  }, []);

  const disconnect = useCallback(() => {
    setSelectedWallet(undefined);
    setSatsConnectProvider(undefined);
    setAccounts([]);
    setSelectedAccount(undefined);
    setSelectedConnectionType(undefined);
  }, [setSelectedWallet, setSatsConnectProvider, setAccounts, setSelectedAccount, setSelectedConnectionType]);

  const connectWithStandardWallet = useCallback(
    async (wallet: Wallet) => {
      assertIsBitcoinStandardWalletStandardWallet(wallet);

      const { accounts } = await wallet.features[BitcoinConnect].connect({
        purposes: [AddressPurpose.Payment],
      });

      if (accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      setAccounts(accounts.slice());
      setSelectedAccount(accounts[0]);
      setSelectedWallet(wallet);
      setSelectedConnectionType(WalletConnectionType.Standard);
    },
    [setAccounts, setSelectedWallet, setSelectedAccount, setSelectedConnectionType],
  );

  const connectWithSatsConnectWallet = useCallback(
    async (wallet: Wallet) => {
      assertIsBitcoinStatsConnectWalletStandardWallet(wallet);

      let provider = state.statsConnectProvider;
      if (!provider) {
        // Pick first wallet if provider not yet selected
        const feature = wallet.features[BitcoinSatsConnect] as { provider?: any };
        if (!feature?.provider) {
          throw new Error('Sats Connect feature not available on selected wallet');
        }
        provider = feature.provider;
        if (!provider) {
          throw new Error('Provider unavailable');
        }
        setSatsConnectProvider(provider);
      }
      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      await getAddress({
        getProvider: async () => provider,
        payload: {
          purposes: [AddressPurpose.Payment],
          message: 'Address for receiving BTC',
          network: { type: networkType },
        },
        onFinish: (response: any) => {
          const list = (response.addresses || []).map((a: any) => ({ address: a.address, purpose: a.purpose }));
          setAccounts(list);
          const derived = list.find((a: any) => a.purpose === 'payment') || list[0] || null;
          setSelectedAccount(derived);
          setSelectedWallet(wallet);
          setSelectedConnectionType(WalletConnectionType.SatsConnect);
        },
        onCancel: () => {
          // user cancelled
        },
      });
    },
    [
      state.statsConnectProvider,
      network,
      setSatsConnectProvider,
      setAccounts,
      setSelectedAccount,
      setSelectedWallet,
      setSelectedConnectionType,
    ],
  );

  const connectWithWallet = useCallback(
    async (wallet: Wallet, connectionType?: WalletConnectionType) => {
      try {
        setConnectingWallet(wallet);

        if (connectionType === WalletConnectionType.Standard) {
          await connectWithStandardWallet(wallet);
        } else if (connectionType === WalletConnectionType.SatsConnect) {
          await connectWithSatsConnectWallet(wallet);
        } else if (connectionType === undefined) {
          if (isBitcoinStandardWalletStandardWallet(wallet)) {
            await connectWithStandardWallet(wallet);
          } else if (isBitcoinStatsConnectWalletStandardWallet(wallet)) {
            await connectWithSatsConnectWallet(wallet);
          } else {
            throw new Error('Wallet does not support any Bitcoin features');
          }
        } else {
          throw new Error('Invalid connection type');
        }

        // Connection successful - close modal
        setIsModalOpen(false);
        setConnectingWallet(undefined);
      } catch (error) {
        // Reset connecting state on error, keep modal open
        setConnectingWallet(undefined);
        console.error('Failed to connect to wallet:', error);
        throw error;
      }
    },
    [connectWithStandardWallet, connectWithSatsConnectWallet],
  );

  return {
    ...state,
    connect,
    disconnect,
    connectWithWallet,
    isModalOpen,
    closeModal,
    wallets,
    connectingWallet,
    selectedConnectionType,
  };
}
