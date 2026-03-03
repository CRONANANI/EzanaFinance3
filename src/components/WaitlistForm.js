'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [legacyNumber, setLegacyNumber] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const { data: existing, error: checkError } = await supabase
        .from('waitlist')
        .select('email, legacy_number')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        setSuccess(true);
        setLegacyNumber(existing.legacy_number);
        return;
      }

      const { data, error: insertError } = await supabase
        .from('waitlist')
        .insert([
          {
            email: email.toLowerCase().trim(),
            full_name: '',
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setLegacyNumber(data.legacy_number);
      setEmail('');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-green-500 font-semibold mb-1">You&apos;re on the list!</h3>
              {legacyNumber && legacyNumber <= 1000 ? (
                <p className="text-green-400 text-sm">
                  You&apos;re legacy user <span className="font-bold">#{legacyNumber}</span> of 1,000.
                  You&apos;ll get lifetime free access when we launch!
                </p>
              ) : (
                <p className="text-green-400 text-sm">We&apos;ll email you when we launch.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            placeholder="Enter your email"
            required
            disabled={loading || success}
          />
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Joining...' : success ? "You're on the list!" : 'Join Waitlist'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          We&apos;ll only email you about launch. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}
