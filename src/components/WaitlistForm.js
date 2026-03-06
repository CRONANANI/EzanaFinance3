'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AnimatedEmailInput } from '@/components/ui/animated-email-input';
import GradientButton from '@/components/ui/gradient-button';
import { AnimatedWords } from '@/components/ui/animated-words';

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
        <div className="flex justify-center">
          <AnimatedEmailInput
            label="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || success}
          />
        </div>

        <GradientButton
          type="submit"
          disabled={loading || success}
          width="100%"
          height="56px"
        >
          {loading ? 'Joining...' : success ? "You're on the list!" : 'Join Waitlist'}
        </GradientButton>

        <p className="text-xs text-gray-500 text-center">
          <AnimatedWords
            text="We'll only email you about launch. Unsubscribe anytime."
            baseDelay={4500}
            staggerMs={60}
          />
        </p>
      </form>
    </div>
  );
}
