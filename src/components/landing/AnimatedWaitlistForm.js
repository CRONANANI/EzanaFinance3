'use client';

import { useState } from 'react';

export function AnimatedWaitlistForm({ className = '', alignLeft = false }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    setMessage('');

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
      setMessage("Thank you for subscribing to our events newsletter, we will email you when we are ready to onboard you.");

      setEmail('');
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className={`flex flex-col ${alignLeft ? 'items-start' : 'items-center'} ${className}`}>
      {/* Main Form Container - DOUBLED WIDTH, REDUCED HEIGHT */}
      <div className={`relative flex items-center ${alignLeft ? 'justify-start' : 'justify-center'}`}>
        <div className="absolute z-[-1] w-full"></div>

        <div id="poda" className={`relative flex items-center ${alignLeft ? 'justify-start' : 'justify-center'} group`}>
          {/* Glow Layer 1 - Outer */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[58px] max-w-[552px] rounded-xl blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg]
                          before:bg-[conic-gradient(#000,#10b981_5%,#000_38%,#000_50%,#059669_60%,#000_87%)] before:transition-all before:duration-[2000ms]
                          group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 2 */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[54px] max-w-[550px] rounded-xl blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0),#047857,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#10b981,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms]
                          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 3 */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[54px] max-w-[550px] rounded-xl blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0),#047857,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#10b981,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms]
                          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 4 - Inner bright */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[52px] max-w-[547px] rounded-lg blur-[2px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#34d399,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#6ee7b7,rgba(0,0,0,0)_58%)]
                          before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Glow Layer 5 - Border */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[50px] max-w-[544px] rounded-xl blur-[0.5px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg]
                          before:bg-[conic-gradient(#0a0f0a,#10b981_5%,#0a0f0a_14%,#0a0f0a_50%,#059669_60%,#0a0f0a_64%)]
                          before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Form - 540px width to fit full placeholder text */}
          <form onSubmit={handleSubmit} id="main" className="relative group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email for early access..."
              disabled={status === 'loading' || status === 'success'}
              className="bg-[#0a0f0a] border border-emerald-700/70 w-full max-w-[540px] min-w-[320px] h-[45px] rounded-lg text-white px-[50px] pr-[60px] text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-500 disabled:opacity-60 transition-colors duration-300"
            />

            {/* Input fade mask - removed so full placeholder text is visible */}

            {/* Green glow accent */}
            <div className="pointer-events-none w-[30px] h-[18px] absolute bg-[#10b981] top-[8px] left-[5px] blur-2xl opacity-80 transition-all duration-[2000ms] group-hover:opacity-0"></div>

            {/* Submit button spinning border */}
            <div className="absolute h-[35px] w-[42px] overflow-hidden top-[5px] right-[5px] rounded-lg
                            before:absolute before:content-[''] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-90
                            before:bg-[conic-gradient(rgba(0,0,0,0),#064e3b,rgba(0,0,0,0)_50%,rgba(0,0,0,0)_50%,#064e3b,rgba(0,0,0,0)_100%)]
                            before:animate-spin-slow">
            </div>

            {/* Submit button - ADJUSTED FOR NEW HEIGHT */}
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="absolute top-[6px] right-[6px] flex items-center justify-center z-[2] h-[33px] w-[40px] overflow-hidden rounded-lg bg-gradient-to-b from-[#0a2f1f] via-[#0a0f0a] to-[#0d3325] border border-emerald-900/50 hover:border-emerald-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

            {/* Email icon - ADJUSTED POSITION */}
            <div className="absolute left-4 top-[13px] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#emailGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                <defs>
                  <linearGradient id="emailGradient" gradientTransform="rotate(50)">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </form>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <p className={`mt-4 text-sm ${alignLeft ? 'text-left' : 'text-center'} ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message}
        </p>
      )}

      {/* Privacy Note */}
      {status !== 'success' && (
        <p
          className={`mt-4 text-xs text-gray-500 flex items-center gap-2 ${alignLeft ? '' : 'justify-center'}`}
        >
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
