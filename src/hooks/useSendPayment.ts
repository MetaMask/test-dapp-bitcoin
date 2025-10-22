import { useCallback } from 'react';
import { BitcoinNetworkType, sendBtcTransaction } from 'sats-connect';
import { WalletConnectionType, useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { useEndpoint } from '../context/EndpointProvider';
import {
  BitcoinSignAndSendTransaction,
  type BitcoinSignAndSendTransactionFeature,
} from '../features/signAndSendTransaction';
import { useConnect } from './useConnect';

export function useSendPayment() {
  const { network } = useEndpoint();
  const { selectedAccount, statsConnectProvider } = useBitcoinWalletCtx();
  const { selectedConnectionType, selectedWallet } = useConnect();

  const sendPaymentWithStandard = useCallback(
    async (_to: string, _amountSats: bigint) => {
      if (!selectedWallet) {
        throw new Error('Wallet not connected');
      }
      if (!selectedAccount) {
        throw new Error('Account not selected');
      }

      // Check if wallet supports bitcoin:signAndSendTransaction feature
      const signAndSendFeature = selectedWallet.features[BitcoinSignAndSendTransaction] as
        | BitcoinSignAndSendTransactionFeature[typeof BitcoinSignAndSendTransaction]
        | undefined;
      if (!signAndSendFeature) {
        throw new Error('Wallet does not support transaction signing and sending');
      }

      // TODO: Implement proper transaction construction for Standard wallets
      // This would require building a proper PSBT (Partially Signed Bitcoin Transaction)
      // with the recipient address and amount, which is more complex than Sats Connect
      throw new Error(
        'Standard wallet transaction sending not yet implemented. Please use a Sats Connect compatible wallet.',
      );
    },
    [selectedWallet, selectedAccount],
  );

  const sendPaymentWithSatsConnect = useCallback(
    async (to: string, amountSats: bigint) => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }
      if (!statsConnectProvider) {
        throw new Error('Sats Connect provider not available');
      }
      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      const res = await new Promise((resolve, reject) =>
        sendBtcTransaction({
          getProvider: async () => statsConnectProvider,
          payload: {
            network: { type: networkType },
            recipients: [
              {
                address: to,
                amountSats,
              },
            ],
            senderAddress: selectedAccount.address,
          },
          onFinish: (r: any) => resolve(r?.result?.txId || r?.txId),
          onCancel: () => reject(new Error('Transaction cancelled')),
        }),
      );
      return res as string;
    },
    [selectedAccount, statsConnectProvider, network],
  );

  return useCallback(
    async (to: string, amountSats: bigint) => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }

      if (!selectedConnectionType) {
        throw new Error('Connection type not selected');
      }

      switch (selectedConnectionType) {
        case WalletConnectionType.Standard:
          return sendPaymentWithStandard(to, amountSats);
        case WalletConnectionType.SatsConnect:
          return sendPaymentWithSatsConnect(to, amountSats);
        default:
          throw new Error(`Unsupported connection type: ${selectedConnectionType}`);
      }
    },
    [selectedAccount, selectedConnectionType, sendPaymentWithStandard, sendPaymentWithSatsConnect],
  );
}

export const useSignPayment = useSendPayment;
