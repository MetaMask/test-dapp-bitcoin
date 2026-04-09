type Pathify<T, Prefix extends string = ''> = {
    [K in keyof T]: T[K] extends true ? `${Prefix extends '' ? '' : `${Prefix}.`}${Extract<K, string>}` : T[K] extends object ? Pathify<T[K], `${Prefix extends '' ? '' : `${Prefix}.`}${Extract<K, string>}`> : never;
};
/**
 * The list of test ids to access elements in the e2e2 tests.
 */
export declare const dataTestIds: Pathify<{
    readonly testPage: {
        readonly header: {
            readonly id: true;
            readonly network: true;
            readonly connect: true;
            readonly disconnect: true;
            readonly account: true;
            readonly connectionStatus: true;
            readonly networks: {
                readonly mainnet: true;
                readonly testnet: true;
            };
        };
        readonly walletSelectionModal: {
            readonly id: true;
            readonly walletsList: true;
            readonly walletOption: true;
            readonly standardButton: true;
            readonly satsConnectV3Button: true;
            readonly satsConnectV4Button: true;
        };
        readonly signMessage: {
            readonly id: true;
            readonly message: true;
            readonly signMessage: true;
            readonly signedMessage: true;
        };
        readonly signTransaction: {
            readonly id: true;
            readonly psbt: true;
            readonly signTransaction: true;
            readonly signedPsbt: true;
            readonly txId: true;
        };
        readonly sendTransaction: {
            readonly id: true;
            readonly recipient: true;
            readonly amout: true;
            readonly sendTransaction: true;
            readonly txId: true;
        };
    };
}, "">;
export {};
