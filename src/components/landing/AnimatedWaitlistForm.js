'use client';

import { useState } from 'react';

export function AnimatedWaitlistForm({ className = '' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [legacyInfo, setLegacyInfo] = useState(null);

  const handleSubmit = async (e) => {
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
    <div className={`flex flex-col items-center ${className}`}>
      {/* Main Form Container */}
      <div className="relative flex items-center justify-center">
        <div className="absolute z-[-1] w-full"></div>

        <div className="relative flex items-center justify-center group">
          {/* Glow Layer 1 - Outer - Reduced size */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[70px] max-w-[260px] rounded-xl blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg]
                          before:bg-[conic-gradient(#000,#10b981_5%,#000_38%,#000_50%,#059669_60%,#000_87%)] before:transition-all before:duration-[2000ms]
                          group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 2 - Reduced size */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-[258px] rounded-xl blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0),#047857,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#10b981,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms]
                          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 3 - Reduced size */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-[258px] rounded-xl blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0),#047857,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#10b981,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms]
                          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 4 - Inner bright - Reduced size */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[63px] max-w-[255px] rounded-lg blur-[2px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#34d399,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#6ee7b7,rgba(0,0,0,0)_58%)]
                          before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 5 - Border - Reduced size */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[59px] max-w-[251px] rounded-xl blur-[0.5px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg]
                          before:bg-[conic-gradient(#0a0f0a,#10b981_5%,#0a0f0a_14%,#0a0f0a_50%,#059669_60%,#0a0f0a_64%)]
                          before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Form - Reduced width (~40% shorter: 388 -> 240) */}
          <form onSubmit={handleSubmit} className="relative group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email..."
              disabled={status === 'loading' || status === 'success'}
              className="bg-[#0a0f0a] border-none w-[240px] h-[56px] rounded-lg text-white px-[44px] pr-[52px] text-sm focus:outline-none placeholder-gray-500 disabled:opacity-60"
            />

            {/* Input fade mask */}
            <div className="pointer-events-none w-[50px] h-[20px] absolute bg-gradient-to-r from-transparent to-[#0a0f0a] top-[18px] left-[44px] group-focus-within:hidden"></div>

            {/* Green glow accent */}
            <div className="pointer-events-none w-[24px] h-[20px] absolute bg-[#10b981] top-[10px] left-[4px] blur-2xl opacity-80 transition-all duration-[2000ms] group-hover:opacity-0"></div>

            {/* Submit button spinning border - Compact */}
            <div className="absolute h-[40px] w-[42px] overflow-hidden top-[8px] right-[5px] rounded-lg
                            before:absolute before:content-[''] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-90
                            before:bg-[conic-gradient(rgba(0,0,0,0),#064e3b,rgba(0,0,0,0)_50%,rgba(0,0,0,0)_50%,#064e3b,rgba(0,0,0,0)_100%)]
                            before:animate-spin-slow">
            </div>

            {/* Submit button - Compact */}
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="absolute top-[9px] right-[6px] flex items-center justify-center z-[2] h-[38px] w-[40px] overflow-hidden rounded-lg bg-gradient-to-b from-[#0a2f1f] via-[#0a0f0a] to-[#0d3325] border border-emerald-900/50 hover:border-emerald-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed px-2"
            >
              {status === 'loading' ? (
                <svg className="animate-spin w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : status === 'success' ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>

            {/* Email icon */}
            <div className="absolute left-4 top-[17px] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
          </form>
        </div>
      </div>

      {/* Legacy Badge */}
      {status === 'success' && legacyInfo?.isLegacy && (
        <div className="mt-6 animate-fadeInScale">
          <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/40 rounded-2xl px-8 py-5 text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mb-1">Legacy Member</span>
            <span className="block text-4xl font-extrabold text-white">#{legacyInfo.number}</span>
            <span className="block text-xs text-gray-400 mt-2">of the first 1,000</span>
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <p className={`mt-4 text-sm text-center ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message}
        </p>
      )}

      {/* Privacy Note */}
      {status !== 'success' && (
        <p className="mt-4 text-xs text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          No spam, ever.
        </p>
      )}
    </div>
  );
}

export default AnimatedWaitlistForm;
