import type { CSSProperties } from 'react';
import { useBitcoinWalletCtx } from '../context/BitcoinWalletProvider';
import { useWalletModal } from '../hooks/useWalletModal';
import { WalletSelectionModal } from './WalletSelectionModal';

export function ConnectWallet() {
  const { selectedWallet } = useBitcoinWalletCtx();
  const { isModalOpen, wallets, openModal, closeModal, connectingWallet, disconnect } = useWalletModal();

  // Styles
  const connectButtonStyle: CSSProperties = {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  };

  const statusStyle: CSSProperties = {
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    display: 'inline-block',
  };

  const connectedTextStyle: CSSProperties = {
    color: '#166534',
    fontWeight: 500,
    fontSize: '0.875rem',
  };

  const disconnectButtonStyle: CSSProperties = {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginLeft: '8px',
  };

  if (selectedWallet) {
    return (
      <div style={statusStyle}>
        <span style={connectedTextStyle}>Connecté à : {selectedWallet.name}</span>
        <button
          type="button"
          style={disconnectButtonStyle}
          onClick={disconnect}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef4444';
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        style={connectButtonStyle}
        onClick={openModal}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1e40af)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        Connect
      </button>

      <WalletSelectionModal
        isOpen={isModalOpen}
        wallets={wallets}
        onClose={closeModal}
        connectingWallet={connectingWallet}
      />
    </>
  );
}
