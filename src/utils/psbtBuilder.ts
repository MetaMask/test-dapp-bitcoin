import { Psbt, networks } from 'bitcoinjs-lib';
import type { BitcoinNetwork } from '../context/EndpointProvider';

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey?: {
    hex: string;
  };
}

/**
 * Detect Bitcoin network from address format
 * Mainnet: '1', '3', 'bc1'
 * Testnet: 'm', 'n', '2', 'tb1'
 */
function detectNetworkFromAddress(address: string): 'bitcoin:mainnet' | 'bitcoin:testnet' | null {
  const lowerAddress = address.toLowerCase();

  if (lowerAddress.startsWith('bc1')) {
    return 'bitcoin:mainnet';
  }
  if (lowerAddress.startsWith('tb1')) {
    return 'bitcoin:testnet';
  }
  if (lowerAddress.startsWith('1') || lowerAddress.startsWith('3')) {
    return 'bitcoin:mainnet';
  }
  if (lowerAddress.startsWith('m') || lowerAddress.startsWith('n') || lowerAddress.startsWith('2')) {
    return 'bitcoin:testnet';
  }

  return null;
}

/**
 * Fetch UTXOs for a Bitcoin address using a public API
 */
async function fetchUTXOs(address: string, network: BitcoinNetwork): Promise<UTXO[]> {
  // Detect network from address format and warn if mismatch
  const detectedNetwork = detectNetworkFromAddress(address);
  if (detectedNetwork && detectedNetwork !== network) {
    console.warn(
      `Address network mismatch: address appears to be ${detectedNetwork} but network is set to ${network}. Using ${network} API.`,
    );
  }

  const baseUrl =
    network === 'bitcoin:mainnet' ? 'https://blockstream.info/api' : 'https://blockstream.info/testnet/api';

  try {
    const response = await fetch(`${baseUrl}/address/${address}/utxo`);

    if (!response.ok) {
      const errorText = await response.text();

      // Provide helpful error message for network mismatch
      if (response.status === 400 && errorText.includes('invalid network')) {
        const detectedNetwork = detectNetworkFromAddress(address);
        if (detectedNetwork && detectedNetwork !== network) {
          throw new Error(
            `Network mismatch: Address ${address} appears to be on ${detectedNetwork} but the app is configured for ${network}. Please switch the network in the app settings.`,
          );
        }
      }

      throw new Error(`Failed to fetch UTXOs: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const utxos = await response.json();

    // Blockstream API returns an array of UTXOs directly
    if (!Array.isArray(utxos)) {
      throw new Error(`Unexpected response format: ${JSON.stringify(utxos)}`);
    }

    return utxos.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      scriptPubKey: utxo.scriptpubkey ? { hex: utxo.scriptpubkey } : undefined,
    }));
  } catch (error) {
    throw new Error(`Error fetching UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Estimate transaction fee based on transaction size
 * Using a conservative fee rate of 10 sat/vB
 */
function estimateFee(inputCount: number, outputCount: number): bigint {
  // Base transaction size: ~10 bytes
  // Each input: ~148 bytes (P2PKH) or ~57 bytes (P2WPKH)
  // Each output: ~34 bytes
  // Using average input size of ~100 bytes for estimation
  const estimatedSize = 10 + inputCount * 100 + outputCount * 34;
  const feeRate = 10; // sat/vB
  return BigInt(estimatedSize * feeRate);
}

/**
 * Select UTXOs to cover the amount and fees
 */
function selectUTXOs(utxos: UTXO[], amountSats: bigint, feeSats: bigint): UTXO[] {
  const totalNeeded = amountSats + feeSats;
  let totalSelected = 0n;
  const selected: UTXO[] = [];

  // Sort UTXOs by value (largest first) for better efficiency
  const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);

  for (const utxo of sortedUtxos) {
    selected.push(utxo);
    totalSelected += BigInt(utxo.value);
    if (totalSelected >= totalNeeded) {
      break;
    }
  }

  if (totalSelected < totalNeeded) {
    throw new Error('Insufficient funds');
  }

  return selected;
}

/**
 * Build a PSBT for a Bitcoin transaction
 */
export async function buildPSBT(
  senderAddress: string,
  recipientAddress: string,
  amountSats: bigint,
  network: BitcoinNetwork,
): Promise<{ psbt: Uint8Array; inputCount: number }> {
  // Get Bitcoin network configuration
  const bitcoinNetwork = network === 'bitcoin:mainnet' ? networks.bitcoin : networks.testnet;
  const baseUrl =
    network === 'bitcoin:mainnet' ? 'https://blockstream.info/api' : 'https://blockstream.info/testnet/api';

  // Fetch UTXOs
  const utxos = await fetchUTXOs(senderAddress, network);
  if (utxos.length === 0) {
    throw new Error('No UTXOs found for sender address');
  }

  // Estimate fee (will refine after building transaction)
  const estimatedFee = estimateFee(1, 2); // 1 input, 2 outputs (recipient + change)

  // Select UTXOs
  const selectedUtxos = selectUTXOs(utxos, amountSats, estimatedFee);

  // Calculate total input value
  const totalInputValue = selectedUtxos.reduce((sum, utxo) => sum + BigInt(utxo.value), 0n);

  // Recalculate fee with actual input count
  const actualFee = estimateFee(selectedUtxos.length, 2);
  const changeAmount = totalInputValue - amountSats - actualFee;

  // Create PSBT
  const psbt = new Psbt({ network: bitcoinNetwork });

  // Fetch transaction data for each UTXO to get the full transaction hex
  for (const utxo of selectedUtxos) {
    const txHexResponse = await fetch(`${baseUrl}/tx/${utxo.txid}/hex`);
    if (!txHexResponse.ok) {
      throw new Error(`Failed to fetch transaction hex for ${utxo.txid}`);
    }
    const txHex = await txHexResponse.text();
    const txBuffer = Buffer.from(txHex, 'hex');

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: txBuffer,
    });
  }

  // Add recipient output
  psbt.addOutput({
    address: recipientAddress,
    value: Number(amountSats),
  });

  // Add change output (if any)
  if (changeAmount > 0n) {
    psbt.addOutput({
      address: senderAddress,
      value: Number(changeAmount),
    });
  }

  // Convert PSBT to Uint8Array
  const psbtBytes = psbt.toBuffer();
  const psbtUint8Array = new Uint8Array(psbtBytes);

  return {
    psbt: psbtUint8Array,
    inputCount: selectedUtxos.length,
  };
}
