import { useCallback } from 'react';
import { useEndpoint } from '../context/EndpointProvider';
import { useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { signMessage as satsSignMessage, BitcoinNetworkType } from 'sats-connect';

export function useSignMessage() {
  const { network } = useEndpoint();
  const { address, provider } = useBitcoinWalletCtx();

  return useCallback(
    async (message: Uint8Array) => {
      if (!address) throw new Error('Wallet not connected');
      if (!provider) throw new Error('Sats Connect provider not available');
      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      const res = await new Promise((resolve, reject) =>
        satsSignMessage({
          getProvider: async () => provider,
          payload: {
            address,
            message: Buffer.from(message).toString('utf8'),
            network: { type: networkType },
          },
          onFinish: (r: any) => resolve(r),
          onCancel: () => reject(new Error('Signature cancelled')),
        }),
      );
      return (res as any)?.result?.signature || (res as any)?.signature;
    },
    [address, provider, network],
  );
}
