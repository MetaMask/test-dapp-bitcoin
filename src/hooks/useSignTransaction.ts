import { useCallback } from 'react';
import { signTransaction } from 'sats-connect-v3';
import WalletV4, { BitcoinNetworkType, type InputToSign } from 'sats-connect-v4';
import { useEndpoint } from '../context/EndpointProvider';
import { BitcoinSignTransaction, type BitcoinSignTransactionFeature } from '../features/signTransaction';
import { WalletConnectionType } from '../types/common';
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

  const signTransactionWithSatsConnectV3 = useCallback(
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

  const signTransactionWithSatsConnectV4 = useCallback(
    async (psbtBase64: string, _message: string, inputsToSign: InputToSign[] = [], broadcast?: boolean) => {
      // v4 uses signInputs: { [address]: signingIndexes[] } instead of inputsToSign array
      const signInputs: Record<string, number[]> = {};
      for (const input of inputsToSign) {
        const addr = input.address;
        if (!signInputs[addr]) {
          signInputs[addr] = [];
        }
        signInputs[addr].push(...input.signingIndexes);
      }

      const response = await WalletV4.request('signPsbt', {
        psbt: psbtBase64,
        signInputs,
        broadcast,
      });

      if (response.status === 'error') {
        throw new Error(response.error.message);
      }

      const result = response.result as any;
      return {
        psbtBase64: result.psbt as string,
        txId: result.txid as string | undefined,
      };
    },
    [],
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
        case WalletConnectionType.SatsConnectV3:
          return signTransactionWithSatsConnectV3(psbtBase64, message, inputsToSign);
        case WalletConnectionType.SatsConnectV4:
          return signTransactionWithSatsConnectV4(psbtBase64, message, inputsToSign);
        default:
          throw new Error(`Unsupported connection type: ${selectedConnectionType}`);
      }
    },
    [
      selectedAccount,
      selectedConnectionType,
      signTransactionWithStandard,
      signTransactionWithSatsConnectV3,
      signTransactionWithSatsConnectV4,
    ],
  );
}
