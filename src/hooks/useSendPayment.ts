import { useCallback } from 'react';
import { useEndpoint } from '../context/EndpointProvider';
import { useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { sendBtcTransaction, BitcoinNetworkType } from 'sats-connect';

export function useSendPayment() {
  const { network } = useEndpoint();
  const { address, provider } = useBitcoinWalletCtx();
  return useCallback(
    async (to: string, amountSats: bigint) => {
      if (!address) throw new Error('Wallet not connected');
      if (!provider) throw new Error('Sats Connect provider not available');
      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      const res = await new Promise((resolve, reject) =>
        sendBtcTransaction({
          getProvider: async () => provider,
          payload: {
            network: { type: networkType },
            recipients: [
              {
                address: to,
                amountSats,
              },
            ],
            senderAddress: address,
          },
          onFinish: (r: any) => resolve(r?.result?.txId || r?.txId),
          onCancel: () => reject(new Error('Transaction cancelled')),
        }),
      );
      return res as string;
    },
    [address, provider, network],
  );
}

export const useSignPayment = useSendPayment;
