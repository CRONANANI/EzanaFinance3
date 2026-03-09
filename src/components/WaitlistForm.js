'use client';

import { useState } from 'react';
import { AnimatedEmailInput } from '@/components/ui/animated-email-input';
import GradientButton from '@/components/ui/gradient-button';
import { AnimatedWords } from '@/components/ui/animated-words';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [legacyInfo, setLegacyInfo] = useState(null);

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    setMessage('');
    setLegacyInfo(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          referralSource: 'landing_page',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setMessage(data.message || "You're on the waitlist!");

      if (data.legacyUser) {
        setLegacyInfo({
          isLegacy: true,
          number: data.legacyNumber,
        });
      }

      setEmail('');
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleWaitlistSubmit} className="space-y-4">
        <div className="flex justify-center">
          <AnimatedEmailInput
            label="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === 'loading' || status === 'success'}
          />
        </div>

        <GradientButton
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          width="100%"
          height="56px"
        >
          {status === 'loading' ? 'Joining...' : status === 'success' ? '✓ Joined!' : 'Join Waitlist'}
        </GradientButton>

        <p className="text-xs text-gray-500 text-center">
          <AnimatedWords
            text="We'll only email you about launch. Unsubscribe anytime."
            baseDelay={2250}
            staggerMs={30}
          />
        </p>
      </form>

      {status === 'success' && legacyInfo?.isLegacy && (
        <div className="legacy-badge">
          <span className="legacy-label">Legacy Member</span>
          <span className="legacy-number">#{legacyInfo.number}</span>
          <span className="legacy-note">of the first 1,000</span>
        </div>
      )}

      {message && (
        <p className={`waitlist-message ${status === 'error' ? 'error' : 'success'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
