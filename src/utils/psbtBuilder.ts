import { Buffer } from 'buffer';
import { Psbt, networks, address as btcAddress } from 'bitcoinjs-lib';
import type { BitcoinNetwork } from '../context/EndpointProvider';

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey?: {
    hex: string;
  };
}

const DUST_THRESHOLD = 546n; // standard relay dust limit for P2PKH
const DEFAULT_FEE_RATE_SAT_VB = 10; // fallback fee rate when no estimator is used
const AVERAGE_INPUT_VBYTES = 68; // approximate P2WPKH/P2WSH input weight
const AVERAGE_OUTPUT_VBYTES = 31; // approximate P2WPKH output weight

/**
 * Fetch a fee rate (sat/vB) from Blockstream; fallback to DEFAULT_FEE_RATE_SAT_VB on error.
 */
async function fetchFeeRate(network: BitcoinNetwork, targetBlocks = 3): Promise<number> {
  const baseUrl =
    network === 'bitcoin:mainnet' ? 'https://blockstream.info/api' : 'https://blockstream.info/testnet/api';
  try {
    const res = await fetch(`${baseUrl}/fee-estimates`);
    if (!res.ok) throw new Error(`fee-estimates ${res.status}`);
    const data = await res.json();
    const rate = data?.[targetBlocks];
    if (typeof rate === 'number' && isFinite(rate) && rate > 0) return rate;
  } catch (err) {
    console.warn('Falling back to default fee rate:', err);
  }
  return DEFAULT_FEE_RATE_SAT_VB;
}

/**
 * Detect Bitcoin network from address format
 */
function detectNetworkFromAddress(address: string): 'bitcoin:mainnet' | 'bitcoin:testnet' | null {
  try {
    btcAddress.toOutputScript(address, networks.bitcoin);
    return 'bitcoin:mainnet';
  } catch {}

  try {
    btcAddress.toOutputScript(address, networks.testnet);
    return 'bitcoin:testnet';
  } catch {}

  return null;
}

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
 */
function estimateFee(inputCount: number, outputCount: number, feeRate: number = DEFAULT_FEE_RATE_SAT_VB): bigint {
  // Base transaction size: ~10 vbytes, P2WPKH inputs ~68 vbytes, outputs ~31 vbytes
  const estimatedVBytes = 10 + inputCount * AVERAGE_INPUT_VBYTES + outputCount * AVERAGE_OUTPUT_VBYTES;
  return BigInt(Math.ceil(estimatedVBytes * feeRate));
}

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

  const feeRate = await fetchFeeRate(network);

  // Select UTXOs with iterative fee refinement to avoid negative change
  let feeEstimate = estimateFee(1, 2, feeRate); // start with 1 input, 2 outputs (recipient + change)
  let selectedUtxos: UTXO[] = [];
  let totalInputValue = 0n;
  let actualFee = 0n;
  let changeAmount = 0n;

  while (true) {
    selectedUtxos = selectUTXOs(utxos, amountSats, feeEstimate);
    totalInputValue = selectedUtxos.reduce((sum, utxo) => sum + BigInt(utxo.value), 0n);
    actualFee = estimateFee(selectedUtxos.length, 2, feeRate);

    if (totalInputValue < amountSats + actualFee) {
      // Not enough once the true fee is known; increase estimate and try again
      feeEstimate = actualFee;
      continue;
    }

    changeAmount = totalInputValue - amountSats - actualFee;
    break;
  }

  if (changeAmount < 0n) {
    throw new Error('Insufficient funds after fee calculation');
  }

  // Avoid creating dust change; fold small change into the fee
  if (changeAmount > 0n && changeAmount < DUST_THRESHOLD) {
    actualFee += changeAmount;
    changeAmount = 0n;
  }


  // Create PSBT
  const psbt = new Psbt({ network: bitcoinNetwork });

  // Fetch transaction data for each UTXO to get the full transaction hex
  for (const utxo of selectedUtxos) {
    const witnessScript = utxo.scriptPubKey?.hex;

    if (witnessScript) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(witnessScript, 'hex'),
          value: BigInt(utxo.value),
        },
      });
    } else {
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
  }
  
  // Add recipient output
  psbt.addOutput({
    address: recipientAddress,
    value: amountSats,
  });
  
  // Add change output (if any)
  if (changeAmount > 0n) {
    psbt.addOutput({
      address: senderAddress,
      value: changeAmount,
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