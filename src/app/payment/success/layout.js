import { Suspense } from 'react';

export default function PaymentSuccessLayout({ children }) {
  return (
    <Suspense fallback={<p style={{ textAlign: 'center', padding: '4rem 2rem' }}>Loading…</p>}>
      {children}
    </Suspense>
  );
}
