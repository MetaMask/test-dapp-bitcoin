import { useCallback } from 'react';
import { BitcoinNetworkType, type InputToSign, signTransaction } from 'sats-connect';
import { WalletConnectionType } from '../context/BitcoinWalletProvider';
import { useEndpoint } from '../context/EndpointProvider';
import { BitcoinSignTransaction, type BitcoinSignTransactionFeature } from '../features/signTransaction';
import { useConnect } from './useConnect';

export function useSignTransaction() {
  const { network } = useEndpoint();
  const { selectedAccount, statsConnectProvider, selectedConnectionType, selectedWallet } = useConnect();

  const signTransactionWithStandard = useCallback(
    async (psbtBase64: string, inputsToSign: InputToSign[] = []) => {
      if (!selectedWallet) {
        throw new Error('Wallet not connected');
      }
      if (!selectedAccount) {
        throw new Error('Account not selected');
      }

      const signTransactionFeature = selectedWallet.features[BitcoinSignTransaction] as
        | BitcoinSignTransactionFeature[typeof BitcoinSignTransaction]
        | undefined;
      if (!signTransactionFeature) {
        throw new Error('Wallet does not support message signing');
      }

      const result = await signTransactionFeature.signTransaction({
        psbt: Buffer.from(psbtBase64, 'base64'),
        inputsToSign: inputsToSign.map((input) => ({
          account: selectedAccount,
          signingIndexes: input.signingIndexes,
          sigHash: 'ALL',
        })),
        chain: network,
      });

      return {
        psbtBase64: Buffer.from(result[0].signedPsbt.buffer).toString('base64'),
        txId: '',
      };
    },
    [selectedAccount, network, selectedWallet],
  );

  const signTransactionWithSatsConnect = useCallback(
    async (psbtBase64: string, message: string, inputsToSign: InputToSign[] = [], broadcast?: boolean) => {
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
    [statsConnectProvider, network],
  );

  return useCallback(
    async (psbtBase64: string, message: string, inputsToSign: InputToSign[] = []) => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }

      if (!selectedConnectionType) {
        throw new Error('Connection type not selected');
      }

      switch (selectedConnectionType) {
        case WalletConnectionType.Standard:
          return signTransactionWithStandard(psbtBase64, inputsToSign);
        case WalletConnectionType.SatsConnect:
          return signTransactionWithSatsConnect(psbtBase64, message, inputsToSign);
        default:
          throw new Error(`Unsupported connection type: ${selectedConnectionType}`);
      }
    },
    [selectedAccount, selectedConnectionType, signTransactionWithStandard, signTransactionWithSatsConnect],
  );
}
