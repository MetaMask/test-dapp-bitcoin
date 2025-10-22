import { type FC, useCallback, useState } from 'react';
import { useConnect } from '../hooks/useConnect';
import { useSignMessage } from '../hooks/useSignMessage';
import { dataTestIds } from '../test';
import { Button } from './Button';

export const SignMessage: FC = () => {
  const signMessage = useSignMessage();
  const { selectedAccount } = useConnect();
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Hello, Bitcoin!');
  const [loading, setLoading] = useState(false);

  /**
   * Handle message change.
   */
  const handleMessageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(event.target.value);
  }, []);

  /**
   * Handle sign message button click.
   */
  const handleSigneMessage = useCallback(async () => {
    if (!selectedAccount || !signMessage) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const encoded = new TextEncoder().encode(message);
      const signature = await signMessage(encoded);
      setSignedMessage(signature);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, signMessage, message]);

  return (
    <div data-testid={dataTestIds.testPage.signMessage.id}>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="message">Message:</label>
        <input
          data-testid={dataTestIds.testPage.signMessage.message}
          type="text"
          value={message}
          onChange={handleMessageChange}
          style={{ width: '90%', padding: '0.5rem', marginTop: '0.5rem' }}
        />
      </div>
      <Button
        data-testid={dataTestIds.testPage.signMessage.signMessage}
        onClick={handleSigneMessage}
        disabled={!selectedAccount}
        loading={loading}
      >
        Sign Message
      </Button>

      {signedMessage && (
        <>
          <h3>Signed Message</h3>
          <pre data-testid={dataTestIds.testPage.signMessage.signedMessage} className="signedTransactions">
            {signedMessage}
          </pre>
        </>
      )}
    </div>
  );
};
