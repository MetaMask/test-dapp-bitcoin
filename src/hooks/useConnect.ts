import type { Wallet } from '@wallet-standard/base';
import { useCallback, useState } from 'react';
import { getAddress } from 'sats-connect-v3';
import WalletV4, { AddressPurpose, BitcoinNetworkType } from 'sats-connect-v4';
import { useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { useEndpoint } from '../context/EndpointProvider';
import {
  BitcoinConnect,
  BitcoinDisconnect,
  BitcoinEvents,
  BitcoinSatsConnect,
  assertIsBitcoinStandardWalletStandardWallet,
  assertIsBitcoinStatsConnectWalletStandardWallet,
  isBitcoinStandardWalletStandardWallet,
  isBitcoinStatsConnectWalletStandardWallet,
} from '../features';
import { WalletConnectionType } from '../types/common';

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

  const resetLocalState = useCallback(() => {
    setSelectedWallet(undefined);
    setSatsConnectProvider(undefined);
    setAccounts([]);
    setSelectedAccount(undefined);
    setSelectedConnectionType(undefined);
  }, [setSelectedWallet, setSatsConnectProvider, setAccounts, setSelectedAccount, setSelectedConnectionType]);

  const disconnect = useCallback(async () => {
    const wallet = state.selectedWallet;

    if (!wallet) {
      throw new Error('No wallet selected');
    }

    // Clean up v4 adapter injection
    if (state.selectedConnectionType === WalletConnectionType.SatsConnectV4) {
      delete (window as any)[SATS_CONNECT_V4_PROVIDER_KEY];
      (WalletV4 as any).providerId = undefined;
    }

    resetLocalState();

    if (isBitcoinStandardWalletStandardWallet(wallet)) {
      await wallet.features[BitcoinDisconnect].disconnect();
    }
  }, [resetLocalState, state]);

  const connectWithStandardWallet = useCallback(
    async (wallet: Wallet) => {
      assertIsBitcoinStandardWalletStandardWallet(wallet);

      const { accounts } = await wallet.features[BitcoinConnect].connect({
        purposes: [AddressPurpose.Payment],
      });

      if (accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      wallet.features[BitcoinEvents].on('change', onChange);

      setAccounts(accounts.slice());
      setSelectedAccount(accounts[0]);
      setSelectedWallet(wallet);
      setSelectedConnectionType(WalletConnectionType.Standard);
    },
    [setAccounts, setSelectedWallet, setSelectedAccount, setSelectedConnectionType],
  );

  const connectWithSatsConnectV3Wallet = useCallback(
    async (wallet: Wallet) => {
      assertIsBitcoinStatsConnectWalletStandardWallet(wallet);

      let provider = state.statsConnectProvider;
      if (!provider) {
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

      provider.addListener({
        eventName: 'accountChange',
        cb: onChangeAccountSatsConnect,
      });

      provider.addListener({
        eventName: 'disconnect',
        cb: onDisconnectSatsConnect,
      });

      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      await getAddress({
        getProvider: async () => provider,
        payload: {
          purposes: ['payment' as any],
          message: 'Address for receiving BTC',
          network: { type: networkType },
        },
        onFinish: (response: any) => {
          const list = (response.addresses || []).map((a: any) => ({ address: a.address, purpose: a.purpose }));
          setAccounts(list);
          const derived = list.find((a: any) => a.purpose === 'payment') || list[0] || null;
          setSelectedAccount(derived);
          setSelectedWallet(wallet);
          setSelectedConnectionType(WalletConnectionType.SatsConnectV3);
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

  // Stable ID used to register the wallet-standard provider in v4's adapter registry.
  const SATS_CONNECT_V4_PROVIDER_KEY = '__walletStandardProvider';

  const connectWithSatsConnectV4Wallet = useCallback(
    async (wallet: Wallet) => {
      assertIsBitcoinStatsConnectWalletStandardWallet(wallet);

      const feature = wallet.features[BitcoinSatsConnect] as { provider?: any };
      if (!feature?.provider) {
        throw new Error('Sats Connect feature not available on selected wallet');
      }
      const walletProvider = feature.provider;

      // Expose the wallet-standard provider on window so sats-connect v4 can resolve it.
      // v4 resolves providers via getProviderById(id) which traverses window by path —
      // this is the native mechanism the library was designed for.
      (window as any)[SATS_CONNECT_V4_PROVIDER_KEY] = walletProvider;
      (WalletV4 as any).providerId = SATS_CONNECT_V4_PROVIDER_KEY;

      const response = await WalletV4.request('getAddresses', {
        purposes: [AddressPurpose.Payment],
        message: 'Address for receiving BTC',
      });

      if (response.status === 'error') {
        throw new Error(response.error.message);
      }

      const list = (response.result.addresses || []).map((a: any) => ({
        address: a.address,
        purpose: a.purpose,
      }));
      setAccounts(list as any);
      const derived = list.find((a: any) => a.purpose === 'payment') || list[0] || null;
      setSelectedAccount(derived as any);
      setSelectedWallet(wallet);
      setSelectedConnectionType(WalletConnectionType.SatsConnectV4);
    },
    [setAccounts, setSelectedAccount, setSelectedWallet, setSelectedConnectionType],
  );

  const connectWithWallet = useCallback(
    async (wallet: Wallet, connectionType?: WalletConnectionType) => {
      try {
        setConnectingWallet(wallet);

        if (connectionType === WalletConnectionType.Standard) {
          await connectWithStandardWallet(wallet);
        } else if (connectionType === WalletConnectionType.SatsConnectV3) {
          await connectWithSatsConnectV3Wallet(wallet);
        } else if (connectionType === WalletConnectionType.SatsConnectV4) {
          await connectWithSatsConnectV4Wallet(wallet);
        } else if (connectionType === undefined) {
          if (isBitcoinStandardWalletStandardWallet(wallet)) {
            await connectWithStandardWallet(wallet);
          } else if (isBitcoinStatsConnectWalletStandardWallet(wallet)) {
            await connectWithSatsConnectV3Wallet(wallet);
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
    [connectWithStandardWallet, connectWithSatsConnectV3Wallet, connectWithSatsConnectV4Wallet],
  );

  const onChange = useCallback(
    (event: any) => {
      if (event.accounts.length > 0) {
        setAccounts(event.accounts);
        setSelectedAccount(event.accounts[0]);
      } else {
        resetLocalState();
      }
    },
    [setAccounts, setSelectedAccount, resetLocalState],
  );

  const onChangeAccountSatsConnect = useCallback(
    (event: any) => {
      if (event.addresses) {
        const list = (event.addresses || []).map((a: any) => ({ address: a.address, purpose: a.purpose }));
        setAccounts(list);
        const derived = list.find((a: any) => a.purpose === 'payment') || list[0] || null;
        setSelectedAccount(derived);
      }
    },
    [setAccounts, setSelectedAccount],
  );

  const onDisconnectSatsConnect = useCallback(() => {
    resetLocalState();
  }, [resetLocalState]);

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
