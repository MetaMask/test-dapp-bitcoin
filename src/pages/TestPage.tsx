import type { FC } from 'react';
import { Header } from '../components/Header';
import { SendTestTransaction } from '../components/SendTestTransaction';
import { SignMessage } from '../components/SignMessage';
import { Test } from '../components/Test';
import { useEndpoint } from '../context/EndpointProvider';

export const TestPage: FC = () => {
  useEndpoint(); // currently only to trigger re-render when network changes

  return (
    <div style={{ padding: '1rem' }}>
      <div
        style={{
          marginBottom: '2rem',
        }}
      >
        <Header />
      </div>
      <div className="grid">
        <Test key="signMessage" title="Sign Message">
          <SignMessage />
        </Test>
        <Test key="sendTestTransaction" title="Send Test Payment">
          <SendTestTransaction />
        </Test>
      </div>
    </div>
  );
};
