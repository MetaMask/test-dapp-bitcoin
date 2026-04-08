import { useCallback } from 'react';
import { sendBtcTransaction } from 'sats-connect-v3';
import WalletV4, { BitcoinNetworkType } from 'sats-connect-v4';
import { WalletConnectionType, useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { useEndpoint } from '../context/EndpointProvider';
import {
  BitcoinSignAndSendTransaction,
  type BitcoinSignAndSendTransactionFeature,
} from '../features/signAndSendTransaction';
import { buildPSBT } from '../utils/psbtBuilder';
import { useConnect } from './useConnect';

export function useSendPayment() {
  const { network } = useEndpoint();
  const { selectedAccount, statsConnectProvider } = useBitcoinWalletCtx();
  const { selectedConnectionType, selectedWallet } = useConnect();

  const sendPaymentWithStandard = useCallback(
    async (to: string, amountSats: bigint) => {
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

      // Build PSBT
      const { psbt, inputCount } = await buildPSBT(selectedAccount.address, to, amountSats, network);

      // Prepare inputs to sign - all inputs need to be signed by the sender account
      const inputsToSign = [
        {
          account: selectedAccount,
          signingIndexes: Array.from({ length: inputCount }, (_, i) => i),
        },
      ];

      // Call signAndSendTransaction
      const result = await signAndSendFeature.signAndSendTransaction({
        psbt,
        inputsToSign,
        chain: network,
      });

      if (result.length === 0 || !result[0]?.txId) {
        throw new Error('Transaction failed: no transaction ID returned');
      }

      return result[0].txId;
    },
    [selectedWallet, selectedAccount, network],
  );

  const sendPaymentWithSatsConnectV3 = useCallback(
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

  const sendPaymentWithSatsConnectV4 = useCallback(
    async (to: string, amountSats: bigint) => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }

      const response = await WalletV4.request('sendTransfer', {
        recipients: [{ address: to, amount: Number(amountSats) }],
      });

      if (response.status === 'error') {
        throw new Error(response.error.message);
      }

      return (response.result as any).txid as string;
    },
    [selectedAccount],
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
        case WalletConnectionType.SatsConnectV3:
          return sendPaymentWithSatsConnectV3(to, amountSats);
        case WalletConnectionType.SatsConnectV4:
          return sendPaymentWithSatsConnectV4(to, amountSats);
        default:
          throw new Error(`Unsupported connection type: ${selectedConnectionType}`);
      }
    },
    [selectedAccount, selectedConnectionType, sendPaymentWithStandard, sendPaymentWithSatsConnectV3, sendPaymentWithSatsConnectV4],
  );
}

export const useSignPayment = useSendPayment;
