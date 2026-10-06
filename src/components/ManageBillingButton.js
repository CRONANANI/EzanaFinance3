'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { WebOnly } from '@/components/native/WebOnly';

function ManageBillingButtonInner({ className, children, label = 'Manage Billing' }) {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/auth/signin?redirect=/settings';
        return;
      }

      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open billing portal.');
      }
    } catch {
      alert('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className={className} onClick={handleManageBilling} disabled={loading}>
      {loading ? 'Loading...' : children || label}
    </button>
  );
}

/* Web billing (Stripe portal) is not offered inside the apps; store
   subscriptions are managed in the App Store or Google Play. */
export function ManageBillingButton(props) {
  return (
    <WebOnly>
      <ManageBillingButtonInner {...props} />
    </WebOnly>
  );
}
