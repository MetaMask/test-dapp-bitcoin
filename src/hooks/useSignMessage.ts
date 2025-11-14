import { useCallback } from 'react';
import { BitcoinNetworkType, signMessage as satsSignMessage } from 'sats-connect';
import { WalletConnectionType } from '../context/BitcoinWalletProvider';
import { useEndpoint } from '../context/EndpointProvider';
import { BitcoinSignMessage, type BitcoinSignMessageFeature } from '../features/signMessage';
import { useConnect } from './useConnect';

export function useSignMessage() {
  const { network } = useEndpoint();
  const { selectedConnectionType, statsConnectProvider, selectedWallet, selectedAccount } = useConnect();

  const signMessageWithStandard = useCallback(
    async (message: Uint8Array) => {
      if (!selectedWallet) {
        throw new Error('Wallet not connected');
      }
      if (!selectedAccount) {
        throw new Error('Account not selected');
      }

      // Check if wallet supports bitcoin:signMessage feature
      const signMessageFeature = selectedWallet.features[BitcoinSignMessage] as
        | BitcoinSignMessageFeature[typeof BitcoinSignMessage]
        | undefined;
      if (!signMessageFeature) {
        throw new Error('Wallet does not support message signing');
      }

      try {
        const result = await signMessageFeature.signMessage({
          account: selectedAccount,
          message,
        });

        return result[0]?.signature;
      } catch (error) {
        throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [selectedWallet, selectedAccount],
  );

  const signMessageWithSatsConnect = useCallback(
    async (message: Uint8Array): Promise<string> => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }
      if (!statsConnectProvider) {
        throw new Error('Sats Connect provider not available');
      }

      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      const res = await new Promise((resolve, reject) =>
        satsSignMessage({
          getProvider: async () => statsConnectProvider,
          payload: {
            address: selectedAccount.address,
            message: Buffer.from(message).toString('utf8'),
            network: { type: networkType },
          },
          onFinish: (r: any) => resolve(r),
          onCancel: () => reject(new Error('Signature cancelled')),
        }),
      );
      return res as string;
    },
    [selectedAccount, statsConnectProvider, network],
  );

  return useCallback(
    async (message: Uint8Array) => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }

      if (!selectedConnectionType) {
        throw new Error('Connection type not selected');
      }

      switch (selectedConnectionType) {
        case WalletConnectionType.Standard:
          return signMessageWithStandard(message);
        case WalletConnectionType.SatsConnect:
          return signMessageWithSatsConnect(message);
        default:
          throw new Error(`Unsupported connection type: ${selectedConnectionType}`);
      }
    },
    [selectedAccount, selectedConnectionType, signMessageWithStandard, signMessageWithSatsConnect],
  );
}
