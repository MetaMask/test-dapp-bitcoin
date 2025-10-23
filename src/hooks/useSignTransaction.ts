import { useCallback } from 'react';
import { BitcoinNetworkType, type InputToSign, signTransaction } from 'sats-connect';
import { useEndpoint } from '../context/EndpointProvider';
import { useConnect } from './useConnect';

export function useSignTransaction() {
  const { network } = useEndpoint();
  const { selectedAccount, statsConnectProvider } = useConnect();

  return useCallback(
    async (psbtBase64: string, message: string, inputsToSign: InputToSign[] = [], broadcast?: boolean) => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }
      if (!statsConnectProvider) {
        throw new Error('Sats Connect provider not available');
      }
      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      const res = await new Promise((resolve, reject) =>
        signTransaction({
          getProvider: async () => statsConnectProvider,
          payload: {
            network: { type: networkType },
            psbtBase64,
            message,
            inputsToSign,
            broadcast,
          },
          onFinish: (r: any) => resolve(r?.result || r),
          onCancel: () => reject(new Error('Transaction signing cancelled')),
        }),
      );
      return res as { psbtBase64: string; txId?: string };
    },
    [selectedAccount, statsConnectProvider, network],
  );
}
