import { type FC } from 'react';
import { useConnect } from '../hooks/useConnect';
import { useEndpoint } from '../context/EndpointProvider';
import { dataTestIds } from '../test';
import { Account } from './Account';

type HeaderProps = {};

// (previous Solana endpoint validation removed)

/**
 * Header component
 */
export const Header: FC<HeaderProps> = () => {
  const { connect, address, connected, wallets } = useConnect();
  const { network, setNetwork } = useEndpoint();

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
        <strong>Wallet:</strong>
        <div>
          {address ? <Account data-testid={dataTestIds.testPage.header.account} account={address} /> : 'N/A'}
        </div>
      </div>
      <div style={{ wordWrap: 'break-word' }}>
        <strong>Wallets (Sats Connect):</strong>
        <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 4 }}>
          {wallets.length === 0 && <div style={{ fontSize: 12 }}>Aucun wallet détecté</div>}
          {wallets.map((w: any) => (
            <div key={w.name} style={{ fontSize: 12, padding: 2 }}>{w.name}</div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
        <button data-testid={dataTestIds.testPage.header.connect} onClick={connect} disabled={connected}>
          {connected ? 'Connected' : 'Connect'}
        </button>
      </div>
    </div>
  );
};
