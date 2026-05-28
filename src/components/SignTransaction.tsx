import { type FC, useCallback, useState } from 'react';
import { useConnect } from '../hooks/useConnect';
import { useSignTransaction } from '../hooks/useSignTransaction';
import { dataTestIds } from '../test';
import { Button } from './Button';

const SIGN_TRANSACTION_MESSAGE = 'Sign this transaction';

export const SignTransaction: FC = () => {
  const signTransaction = useSignTransaction();
  const { selectedAccount } = useConnect();
  const [signedTransaction, setSignedTransaction] = useState<{ psbtBase64: string; txId?: string } | null>(null);
  const [psbtBase64, setPsbtBase64] = useState<string>('');
  const [fill, setFill] = useState<boolean>(false);
  const [feeRateInput, setFeeRateInput] = useState<string>('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle PSBT change.
   */
  const handlePsbtChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPsbtBase64(event.target.value);
  }, []);

  const handleFillChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFill(event.target.checked);
  }, []);

  const handleFeeRateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFeeRateInput(event.target.value);
  }, []);

  /**
   * Handle sign transaction button click.
   */
  const handleSignTransaction = useCallback(async () => {
    if (!selectedAccount || !signTransaction) {
      throw new Error('Wallet not connected');
    }
    if (!psbtBase64.trim()) {
      throw new Error('PSBT is required');
    }

    setLoading(true);
    try {
      // For basic PSBTs, we'll try to sign all inputs with the connected address
      // This is a simplified approach for testing - in production you'd want more sophisticated input selection
      const inputsToSign = [{ address: selectedAccount.address, signingIndexes: [0] }];
      const trimmedFeeRate = feeRateInput.trim();
      const parsedFeeRate = trimmedFeeRate ? Number(trimmedFeeRate) : undefined;
      const feeRate = parsedFeeRate !== undefined && Number.isFinite(parsedFeeRate) ? parsedFeeRate : undefined;
      const result = await signTransaction(psbtBase64.trim(), SIGN_TRANSACTION_MESSAGE, inputsToSign, {
        fill,
        feeRate,
      });
      setSignedTransaction(result);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, signTransaction, psbtBase64, fill, feeRateInput]);

  return (
    <div data-testid={dataTestIds.testPage.signTransaction?.id}>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="psbt">PSBT (Base64):</label>
        <textarea
          data-testid={dataTestIds.testPage.signTransaction?.psbt}
          value={psbtBase64}
          onChange={handlePsbtChange}
          placeholder="Enter base64 encoded PSBT..."
          style={{
            width: '90%',
            padding: '0.5rem',
            marginTop: '0.5rem',
            minHeight: '100px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
          }}
        />
      </div>

      {/* MetaMask snap-bitcoin-wallet options (ignored by other wallets) */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input type="checkbox" checked={fill} onChange={handleFillChange} />
          Auto-fill inputs (snap selects UTXOs)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Fee rate (sat/vB)
          <input
            type="number"
            min="1"
            step="0.1"
            value={feeRateInput}
            onChange={handleFeeRateChange}
            placeholder="auto"
            style={{ width: '6rem', padding: '0.3rem' }}
          />
        </label>
      </div>

      <Button
        data-testid={dataTestIds.testPage.signTransaction?.signTransaction}
        onClick={handleSignTransaction}
        disabled={!selectedAccount?.address || !psbtBase64.trim()}
        loading={loading}
      >
        Sign Transaction
      </Button>

      {signedTransaction && (
        <>
          <h3>Signed Transaction</h3>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Signed PSBT:</h4>
            <pre data-testid={dataTestIds.testPage.signTransaction?.signedPsbt} className="signedTransactions">
              {signedTransaction.psbtBase64}
            </pre>
          </div>
          {signedTransaction.txId && (
            <div>
              <h4>Transaction ID:</h4>
              <pre data-testid={dataTestIds.testPage.signTransaction?.txId} className="signedTransactions">
                {signedTransaction.txId}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};
