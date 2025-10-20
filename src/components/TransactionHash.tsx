import type { FC } from 'react';
import { useEndpoint } from '../context/EndpointProvider';
import { ExplorerShort } from './ExplorerShort';

interface TransactionHashProps {
  hash: string;
}

/**
 * Get the mempool.space URL for a transaction hash based on the network
 */
const getTxUrl = (network: string, hash: string): string => {
  if (network === 'bitcoin:mainnet') return `https://mempool.space/tx/${hash}`;
  return `https://mempool.space/testnet/tx/${hash}`;
};

/**
 * TransactionHash component
 */
export const TransactionHash: FC<TransactionHashProps> = ({ hash, ...props }) => {
  const { network } = useEndpoint();
  return <ExplorerShort {...props} content={hash} explorerUrl={getTxUrl(network, hash)} />;
};
