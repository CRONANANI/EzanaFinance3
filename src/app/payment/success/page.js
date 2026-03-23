import { Suspense } from 'react';
import PaymentSuccessClient from './PaymentSuccessClient';

export const metadata = {
  title: 'Payment successful | Ezana Finance',
};

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Verifying payment...</p>}>
      <PaymentSuccessClient />
    </Suspense>
  );
}
