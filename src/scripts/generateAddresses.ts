import { Keypair } from '@solana/web3.js';

export const generateRandomAddresses = (): string[] => {
  return Array.from({ length: 10 }, () => Keypair.generate().publicKey.toBase58());
};

console.log(generateRandomAddresses());
