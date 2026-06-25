'use client';

import React, { useMemo } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'At least 8 characters' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[!-\/:-@[-`{-~]/, text: 'At least 1 special character' },
];

const STRENGTH_TEXTS = {
  0: 'Enter a password',
  1: 'Weak password',
  2: 'Medium password',
  3: 'Strong password',
  4: 'Very strong password',
};

export function PasswordStrengthField({
  id = 'password',
  label = 'Password',
  value,
  onChange,
  placeholder = 'Password',
  showRequirements = true,
  className = '',
  inputClassName = '',
}) {
  const [isVisible, setIsVisible] = React.useState(false);

  const calculateStrength = useMemo(() => {
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(value || ''),
      text: req.text,
    }));
    const score = requirements.filter((req) => req.met).length;
    return { score, requirements };
  }, [value]);

  const strengthLabel = STRENGTH_TEXTS[Math.min(calculateStrength.score, 4)] ?? STRENGTH_TEXTS[0];

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          aria-invalid={calculateStrength.score < 4}
          aria-describedby={showRequirements ? `${id}-strength` : undefined}
          className={`w-full h-11 rounded-lg border border-slate-300 bg-white px-4 pr-12 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${inputClassName}`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showRequirements && (
        <>
          <div className="flex gap-2 w-full justify-between mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`p-1 rounded-full w-full ${
                  calculateStrength.score >= n ? 'bg-emerald-500/80' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p
            id={`${id}-strength`}
            className="my-2 text-sm font-medium flex justify-between text-slate-500"
          >
            <span>Must contain:</span>
            <span className="text-emerald-600">{strengthLabel}</span>
          </p>
          <ul className="space-y-1.5" aria-label="Password requirements">
            {calculateStrength.requirements.map((req, index) => (
              <li key={index} className="flex items-center space-x-2">
                {req.met ? (
                  <Check size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <X size={16} className="text-slate-400 shrink-0" />
                )}
                <span className={`text-xs ${req.met ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {req.text}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
