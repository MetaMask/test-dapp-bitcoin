import { type ChangeEvent, type FC, useCallback, useState } from 'react';
import { useConnect } from '../hooks/useConnect';
import { useSendPayment } from '../hooks/useSendPayment';
import { Button } from './Button';
import { TransactionHash } from './TransactionHash';

export const SendTestTransaction: FC = () => {
  const sendPayment = useSendPayment();
  const { address, connected } = useConnect();
  const [transactionHash, setTransactionHash] = useState<string | undefined>();
  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<number>(1000); // sats
  const [loading, setLoading] = useState(false);

  /**
   * Handle address change.
   */
  const handleAddressChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setToAddress(event.target.value);
  }, []);

  /**
   * Get the transaction to sign.
   */
  const handleAmountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value) || 0);
  }, []);

  /**
   * Sign the transaction.
   */
  const sendTx = useCallback(async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    try {
      const txId = await sendPayment(toAddress, BigInt(amount));
      setTransactionHash(txId);
    } finally {
      setLoading(false);
    }
  }, [address, toAddress, amount, sendPayment]);

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="address">Destination Address</label>
        <input
          type="text"
          value={toAddress}
          onChange={handleAddressChange}
          style={{ width: '90%', padding: '0.5rem', marginTop: '0.5rem' }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="amount">Amount (sats)</label>
        <input
          type="number"
          value={amount}
          onChange={handleAmountChange}
          style={{ width: '90%', padding: '0.5rem', marginTop: '0.5rem' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button onClick={sendTx} disabled={!connected || !toAddress || amount <= 0} loading={loading}>
          Send Payment
        </Button>
      </div>

      {transactionHash && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Transaction</h3>
          <TransactionHash hash={transactionHash} />
        </div>
      )}
    </div>
  );
};
