import { PublicKey } from '@solana/web3.js';

/**
 * The default mint address for the wrapped SOL token (WSOL) on Solana.
 */
export const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

/**
 * The default network to use in the tests.
 */
export const RPC_HTTP_ENDPOINT: string = import.meta.env.VITE_RPC_HTTP_ENDPOINT ?? 'https://api.devnet.solana.com';
