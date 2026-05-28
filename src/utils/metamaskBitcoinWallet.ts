import {
  type CaipAccountId,
  type MultichainApiClient,
  type SessionData,
  getDefaultTransport,
  getMultichainClient,
} from '@metamask/multichain-api-client';
import type { IdentifierString, Wallet, WalletAccount, WalletIcon } from '@wallet-standard/base';
import type {
  StandardConnectFeature,
  StandardDisconnectFeature,
  StandardEventsFeature,
  StandardEventsListeners,
  StandardEventsNames,
  StandardEventsOnMethod,
} from '@wallet-standard/features';
import { registerWallet } from '@wallet-standard/wallet';
import * as bitcoin from 'bitcoinjs-lib';

import type { BitcoinConnectFeature } from '../features/connect';
import type {
  BitcoinSignAndSendTransactionFeature,
  BitcoinSignAndSendTransactionInput,
} from '../features/signAndSendTransaction';
import type { BitcoinSignMessageFeature, BitcoinSignMessageInput } from '../features/signMessage';
import type { BitcoinSignTransactionFeature, BitcoinSignTransactionInput } from '../features/signTransaction';

type Bip122Scope = `bip122:${string}`;

const BTC_MAINNET_HASH = '000000000019d6689c085ae165831e93';
const BTC_TESTNET_HASH = '000000000933ea01ad0ee984209779ba';
const SCOPE_MAINNET = `bip122:${BTC_MAINNET_HASH}` as Bip122Scope;
const SCOPE_TESTNET = `bip122:${BTC_TESTNET_HASH}` as Bip122Scope;

const CHAIN_MAINNET: IdentifierString = 'bitcoin:mainnet';
const CHAIN_TESTNET: IdentifierString = 'bitcoin:testnet';

const BTC_METHODS = ['signMessage', 'sendTransfer', 'signPsbt', 'fillPsbt', 'broadcastPsbt', 'computeFee', 'getUtxo'];

const MM_ICON: WalletIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjRjY4NTFCIi8+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSItYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCxBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+TU08L3RleHQ+PC9zdmc+';

type EthereumLike = {
  isMetaMask?: boolean;
};

class SimpleEvents {
  #listeners: { [E in StandardEventsNames]?: Set<StandardEventsListeners[E]> } = {};

  on: StandardEventsOnMethod = <E extends StandardEventsNames>(
    event: E,
    listener: StandardEventsListeners[E],
  ): (() => void) => {
    if (!this.#listeners[event]) {
      this.#listeners[event] = new Set();
    }
    const set = this.#listeners[event] as Set<StandardEventsListeners[E]>;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  };

  emit<E extends StandardEventsNames>(event: E, ...args: Parameters<StandardEventsListeners[E]>): void {
    const set = this.#listeners[event];
    if (!set) {
      return;
    }
    for (const listener of set) {
      (listener as (...a: Parameters<StandardEventsListeners[E]>) => void)(...args);
    }
  }
}

class MetaMaskBitcoinAccount implements WalletAccount {
  readonly address: string;
  readonly publicKey = new Uint8Array();
  readonly chains: readonly IdentifierString[];
  readonly features: readonly IdentifierString[] = [
    'bitcoin:connect',
    'bitcoin:signMessage',
    'bitcoin:signTransaction',
    'bitcoin:signAndSendTransaction',
  ];
  readonly label?: string;

  constructor(address: string, chains: readonly IdentifierString[], label?: string) {
    this.address = address;
    this.chains = chains;
    this.label = label;
  }
}

function parseCaipAccountId(caip: CaipAccountId): { scope: Bip122Scope; address: string } {
  const parts = caip.split(':');
  if (parts.length !== 3) {
    throw new Error(`Invalid CAIP-10 account id: ${caip}`);
  }
  const [namespace, reference, address] = parts;
  return { scope: `${namespace}:${reference}` as Bip122Scope, address };
}

function scopeToChain(scope: Bip122Scope): IdentifierString {
  return scope === SCOPE_TESTNET ? CHAIN_TESTNET : CHAIN_MAINNET;
}

function chainToScope(chain: IdentifierString | undefined): Bip122Scope {
  return chain === CHAIN_TESTNET ? SCOPE_TESTNET : SCOPE_MAINNET;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeMessage(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function invokeWithDetailedErrors<T>(label: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    const e = err as { message?: string; code?: number; data?: unknown; cause?: unknown };
    console.error(`[MetaMaskBitcoinWallet] ${label} failed`, {
      message: e?.message,
      code: e?.code,
      data: e?.data,
      cause: e?.cause,
    });
    throw err;
  }
}

class MetaMaskBitcoinWallet implements Wallet {
  readonly version = '1.0.0' as const;
  readonly name = 'MetaMask';
  readonly icon: WalletIcon = MM_ICON;
  readonly chains: readonly IdentifierString[] = [CHAIN_MAINNET, CHAIN_TESTNET];

  #accounts: WalletAccount[] = [];
  #events = new SimpleEvents();
  #client: MultichainApiClient | undefined;
  #connecting: Promise<MultichainApiClient> | undefined;

  get accounts(): readonly WalletAccount[] {
    return this.#accounts;
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    BitcoinConnectFeature &
    BitcoinSignMessageFeature &
    BitcoinSignTransactionFeature &
    BitcoinSignAndSendTransactionFeature & {
      // The test-dapp re-exports the standard events feature under the
      // `bitcoin:events` key (see src/features/events.ts), so we expose both.
      readonly 'bitcoin:events': StandardEventsFeature['standard:events'];
    } {
    return {
      'standard:connect': {
        version: '1.0.0',
        connect: async () => ({ accounts: await this.#connect() }),
      },
      'standard:disconnect': {
        version: '1.0.0',
        disconnect: async () => {
          try {
            const client = this.#client;
            if (client) {
              await client.revokeSession({});
            }
          } catch (err) {
            console.warn('[MetaMaskBitcoinWallet] revokeSession failed', err);
          }
          this.#client = undefined;
          this.#connecting = undefined;
          this.#accounts = [];
          this.#events.emit('change', { accounts: this.#accounts });
        },
      },
      'standard:events': {
        version: '1.0.0',
        on: this.#events.on,
      },
      'bitcoin:events': {
        version: '1.0.0',
        on: this.#events.on,
      },
      'bitcoin:connect': {
        version: '1.0.0',
        connect: async () => ({ accounts: await this.#connect() }),
      },
      'bitcoin:signMessage': {
        version: '1.0.0',
        signMessage: async (...inputs) => Promise.all(inputs.map((input) => this.#signMessage(input))),
      },
      'bitcoin:signTransaction': {
        version: '1.0.0',
        signTransaction: async (...inputs) => Promise.all(inputs.map((input) => this.#signTransaction(input))),
      },
      'bitcoin:signAndSendTransaction': {
        version: '1.0.0',
        signAndSendTransaction: async (...inputs) =>
          Promise.all(inputs.map((input) => this.#signAndSendTransaction(input))),
      },
    };
  }

  async #getClient(): Promise<MultichainApiClient> {
    if (this.#client) {
      return this.#client;
    }
    if (this.#connecting) {
      return this.#connecting;
    }

    this.#connecting = (async () => {
      const transport = getDefaultTransport({});
      const client = getMultichainClient({ transport });
      this.#client = client;
      return client;
    })();
    return this.#connecting;
  }

  async #connect(): Promise<WalletAccount[]> {
    const client = await this.#getClient();

    let session: SessionData | undefined;
    try {
      session = await client.getSession();
    } catch {
      session = undefined;
    }

    if (!session || !this.#sessionHasBitcoinAccounts(session)) {
      session = await client.createSession({
        optionalScopes: {
          [SCOPE_MAINNET]: { methods: BTC_METHODS, notifications: [] },
          [SCOPE_TESTNET]: { methods: BTC_METHODS, notifications: [] },
        },
      });
    }

    this.#accounts = this.#extractAccounts(session);
    this.#events.emit('change', { accounts: this.#accounts });
    return this.#accounts;
  }

  #sessionHasBitcoinAccounts(session: SessionData): boolean {
    const scopes = session.sessionScopes ?? {};
    return [SCOPE_MAINNET, SCOPE_TESTNET].some((scope) => (scopes[scope]?.accounts?.length ?? 0) > 0);
  }

  #extractAccounts(session: SessionData): WalletAccount[] {
    const byAddress = new Map<string, MetaMaskBitcoinAccount>();
    const scopes = session.sessionScopes ?? {};
    for (const scope of [SCOPE_MAINNET, SCOPE_TESTNET] as const) {
      const scopeAccounts = scopes[scope]?.accounts ?? [];
      for (const caip of scopeAccounts) {
        const { address } = parseCaipAccountId(caip);
        const chain = scopeToChain(scope);
        const existing = byAddress.get(address);
        if (existing) {
          if (!existing.chains.includes(chain)) {
            const merged = new MetaMaskBitcoinAccount(address, [...existing.chains, chain], existing.label);
            byAddress.set(address, merged);
          }
        } else {
          byAddress.set(address, new MetaMaskBitcoinAccount(address, [chain]));
        }
      }
    }
    return [...byAddress.values()];
  }

  async #signMessage(input: BitcoinSignMessageInput) {
    const client = await this.#getClient();
    const scope = chainToScope(input.account.chains[0]);

    const result = (await invokeWithDetailedErrors('signMessage', () =>
      client.invokeMethod({
        scope,
        request: {
          method: 'signMessage',
          params: {
            account: { address: input.account.address },
            message: decodeMessage(input.message),
          },
        },
      }),
    )) as { signature: string };

    return {
      signedMessage: input.message,
      signature: new TextEncoder().encode(result.signature),
    };
  }

  async #signTransaction(input: BitcoinSignTransactionInput) {
    const client = await this.#getClient();
    const signer = input.inputsToSign[0]?.account;
    if (!signer) {
      throw new Error('signTransaction requires inputsToSign with an account');
    }
    // Always route to the account's own chain. The dapp may pass `input.chain`
    // derived from its currently-selected network, which can drift from the
    // account's actual chain (e.g. dapp on testnet, account is mainnet).
    const scope = chainToScope(signer.chains[0]);

    // Optional MetaMask-specific extensions on the standard input — passed
    // through from the dapp (see useSignTransaction.ts `SignTransactionOptions`).
    // When `fill: true`, the snap selects inputs and computes fees server-side
    // before showing its confirmation (matches the snap's `signPsbt` semantics).
    const ext = input as BitcoinSignTransactionInput & { fill?: boolean; feeRate?: number };

    const result = (await invokeWithDetailedErrors('signPsbt (signTransaction)', () =>
      client.invokeMethod({
        scope,
        request: {
          method: 'signPsbt',
          params: {
            account: { address: signer.address },
            psbt: bytesToBase64(input.psbt),
            options: { fill: Boolean(ext.fill), broadcast: false },
            ...(typeof ext.feeRate === 'number' ? { feeRate: ext.feeRate } : {}),
          },
        },
      }),
    )) as { psbt: string; txid: string | null };

    return { signedPsbt: base64ToBytes(result.psbt) };
  }

  async #signAndSendTransaction(input: BitcoinSignAndSendTransactionInput) {
    const client = await this.#getClient();
    const signer = input.inputsToSign[0]?.account;
    if (!signer) {
      throw new Error('signAndSendTransaction requires inputsToSign with an account');
    }
    // Always route to the account's own chain; see #signTransaction for the
    // mainnet-vs-testnet drift this prevents.
    const scope = chainToScope(signer.chains[0]);

    // The dapp builds a PSBT and asks us to sign+broadcast. The MetaMask Bitcoin
    // snap's `signPsbt` path is strict about PSBT validity (BDK rejects PSBTs
    // it didn't build), so instead we extract the recipient (output[0] per
    // psbtBuilder.ts) and delegate to the snap's higher-level `sendTransfer`,
    // which constructs and signs its own PSBT.
    const network = scope === SCOPE_TESTNET ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const psbt = bitcoin.Psbt.fromBuffer(Buffer.from(input.psbt), { network });

    if (psbt.txOutputs.length === 0) {
      throw new Error('PSBT has no outputs');
    }

    // psbtBuilder.ts always puts the recipient at index 0 and (optional) change at index 1.
    const recipientOut = psbt.txOutputs[0];
    const recipientAddress = recipientOut.address ?? bitcoin.address.fromOutputScript(recipientOut.script, network);

    const result = (await invokeWithDetailedErrors('sendTransfer (signAndSendTransaction)', () =>
      client.invokeMethod({
        scope,
        request: {
          method: 'sendTransfer',
          params: {
            account: { address: signer.address },
            recipients: [
              {
                address: recipientAddress,
                amount: recipientOut.value.toString(),
              },
            ],
          },
        },
      }),
    )) as { txid: string };

    if (!result.txid) {
      throw new Error('Snap returned without a txid');
    }
    return { txId: result.txid };
  }
}

export function registerMetaMaskBitcoinWallet(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const ethereum = (window as unknown as { ethereum?: EthereumLike }).ethereum;
  if (!ethereum?.isMetaMask) {
    return;
  }

  registerWallet(new MetaMaskBitcoinWallet());
}
