import { useCallback, useEffect, useState } from 'react';
import { useEndpoint } from '../context/EndpointProvider';
import { useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { getWallets, Wallet } from '@wallet-standard/core'
import { getAddress, AddressPurpose, BitcoinNetworkType } from 'sats-connect';

const SATS_CONNECT_FEATURE = 'sats-connect:' as const;

// Hook exposing state + connect action
export function useConnect() {
  const { network } = useEndpoint();
  const [allWallets, setAllWallets] = useState<readonly Wallet[]>([]);
  const state = useBitcoinWalletCtx();
  const { setWallets, setAccounts, setProvider, setAddress, wallets } = useBitcoinWalletCtx();

  useEffect(() => {
    const wallets = getWallets().get();
    setAllWallets(wallets);
  }, []);

  useEffect(() => {
    setWallets(allWallets.filter((w: Wallet) =>  SATS_CONNECT_FEATURE in w.features))
  }, [allWallets, setWallets]);

  const connect = useCallback(async () => {
    let provider = state.provider;
    if (!provider) {
      // Pick first wallet if provider not yet selected
      const first = wallets[0];
      if (!first) throw new Error('No Sats Connect compatible wallet found');
      const feature = first.features[SATS_CONNECT_FEATURE] as { provider?: any };
      if (!feature?.provider) throw new Error('Sats Connect feature not available on selected wallet');
      provider = feature.provider;
      if (!provider) throw new Error('Provider unavailable');
      setProvider(provider);
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
        const derived = list.find((a: any) => a.purpose === 'payment')?.address || list[0]?.address || null;
        setAddress(derived);
      },
      onCancel: () => {
        // user cancelled
      },
    });
  }, [state.provider, wallets, network, setProvider, setAccounts, setAddress]);

  return { ...state, connect };
}
