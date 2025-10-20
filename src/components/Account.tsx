import type { FC } from 'react';
import { useEndpoint } from '../context/EndpointProvider';
import { ExplorerShort } from './ExplorerShort';

interface AccountProps {
  account: string;
}

/**
 * Get the mempool.space URL for an account based on the selected network
 */
const getAccountUrl = (network: string, account: string): string => {
  if (network === 'bitcoin:mainnet') return `https://mempool.space/address/${account}`;
  return `https://mempool.space/testnet/address/${account}`;
};

/**
 * Account component
 * Displays a Bitcoin account address with a link to its mempool.space page
 */
export const Account: FC<AccountProps> = ({ account, ...props }) => {
  const { network } = useEndpoint();
  return <ExplorerShort {...props} content={account} explorerUrl={getAccountUrl(network, account)} />;
};
