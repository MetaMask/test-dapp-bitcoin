"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataTestIds = void 0;
function pathifyObject(obj) {
    function inner(obj, path = '') {
        const result = {};
        for (const key in obj) {
            const fullPath = (path ? `${path}.${key}` : key).toLowerCase();
            if (obj[key] === true) {
                result[key] = fullPath;
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                result[key] = inner(obj[key], fullPath);
            }
            else {
                result[key] = obj[key];
            }
        }
        return result;
    }
    return inner(obj);
}
/**
 * The list of test ids to access elements in the e2e2 tests.
 */
exports.dataTestIds = pathifyObject({
    testPage: {
        header: {
            id: true,
            network: true,
            connect: true,
            disconnect: true,
            account: true,
            connectionStatus: true,
        },
        walletSelectionModal: {
            id: true,
            walletsList: true,
            walletOption: true,
            standardButton: true,
            satsConnectButton: true,
        },
        signMessage: {
            id: true,
            message: true,
            signMessage: true,
            signedMessage: true,
        },
        signTransaction: {
            id: true,
            psbt: true,
            signTransaction: true,
            signedPsbt: true,
            txId: true,
        },
    },
});
