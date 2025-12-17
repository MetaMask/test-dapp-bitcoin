import type { FC } from 'react';
import { WalletConnectionType } from '../context/BitcoinWalletProvider';
import { useEndpoint } from '../context/EndpointProvider';
import { isBitcoinStandardWalletStandardWallet, isBitcoinStatsConnectWalletStandardWallet } from '../features';
import { useConnect } from '../hooks/useConnect';
import { dataTestIds } from '../test';
import { Account } from './Account';
import { WalletSelectionModal } from './WalletSelectionModal';

type HeaderProps = {};

// (previous Solana endpoint validation removed)

/**
 * Header component
 */
export const Header: FC<HeaderProps> = () => {
  const {
    connect,
    disconnect,
    selectedAccount,
    connected,
    selectedWallet,
    selectedConnectionType,
    wallets,
    isModalOpen,
    closeModal,
    connectingWallet,
  } = useConnect();
  const { network, setNetwork } = useEndpoint();

  const getWalletFeatureLabel = (wallet: any): string => {
    if (!wallet) {
      return 'N/A';
    }

    // If we have a selected connection type, show that specific type
    if (selectedConnectionType) {
      if (selectedConnectionType === WalletConnectionType.Standard) {
        return 'Standard';
      }
      if (selectedConnectionType === WalletConnectionType.SatsConnect) {
        return 'Sats Connect';
      }
    }

    // Fallback to detecting all supported types
    const isStandard = isBitcoinStandardWalletStandardWallet(wallet);
    const isSatsConnect = isBitcoinStatsConnectWalletStandardWallet(wallet);

    if (isStandard && isSatsConnect) {
      return 'Standard + Sats Connect';
    }
    if (isStandard) {
      return 'Standard';
    }
    if (isSatsConnect) {
      return 'Sats Connect';
    }
    return 'Unknown';
  };

  return (
    <div
      data-testid={dataTestIds.testPage.header.id}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem',
        alignItems: 'start',
      }}
    >
      <div style={{ wordWrap: 'break-word' }}>
        <strong>Network:</strong>
        <select
          id={dataTestIds.testPage.header.network}
          data-testid={dataTestIds.testPage.header.network}
          value={network}
          onChange={(e) => setNetwork(e.target.value as any)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
        >
          <option value="bitcoin:mainnet">Mainnet</option>
          <option value="bitcoin:testnet">Testnet</option>
        </select>
      </div>
      <div style={{ wordWrap: 'break-word' }}>
        <strong>Status:</strong>
        <div data-testid={dataTestIds.testPage.header.connectionStatus}>
          {connected ? 'Connected' : 'Not connected'}
        </div>
      </div>
      <div style={{ wordWrap: 'break-word' }}>
        <strong>Account:</strong>
        <div>
          {selectedAccount ? (
            <Account data-testid={dataTestIds.testPage.header.account} account={selectedAccount.address} />
          ) : (
            'N/A'
          )}
        </div>
      </div>
      <div style={{ wordWrap: 'break-word', textAlign: 'center' }}>
        <strong>Connected Wallet:</strong>
        <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 4 }}>
          {selectedWallet ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <div style={{ fontWeight: 600 }}>{selectedWallet.name}</div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-block',
                }}
              >
                {getWalletFeatureLabel(selectedWallet)}
              </div>
            </div>
          ) : (
            'N/A'
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
        <button
          type="button"
          data-testid={connected ? dataTestIds.testPage.header.disconnect : dataTestIds.testPage.header.connect}
          onClick={connected ? disconnect : connect}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      <WalletSelectionModal
        isOpen={isModalOpen}
        wallets={wallets}
        onClose={closeModal}
        connectingWallet={connectingWallet}
      />
    </div>
  );
};
