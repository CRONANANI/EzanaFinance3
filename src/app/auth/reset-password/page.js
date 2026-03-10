'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, TrendingUp, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Full URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);

        // Method 1: Check for existing session first
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession) {
          console.log('Found existing session');
          setIsValidSession(true);
          setIsCheckingSession(false);
          return;
        }

        // Method 2: Check URL query params for 'code' (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const type = urlParams.get('type');

        if (code) {
          console.log('Found code in query params, exchanging...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (data?.session) {
            console.log('Session established from code');
            setIsValidSession(true);
            setIsCheckingSession(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } else {
            console.error('Code exchange failed:', error);
          }
        }

        // Method 3: Check URL hash for tokens
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const hashType = hashParams.get('type');

          console.log('Hash params:', {
            hasAccessToken: !!accessToken,
            accessTokenLength: accessToken?.length,
            hasRefreshToken: !!refreshToken,
            type: hashType
          });

          // Check if it's a proper JWT (should be very long)
          if (accessToken && accessToken.length > 50) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (data?.session) {
              console.log('Session set from hash tokens');
              setIsValidSession(true);
              setIsCheckingSession(false);
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            } else {
              console.error('Failed to set session from hash:', error);
            }
          } else if (accessToken && hashType === 'recovery') {
            // Short token - try verifyOtp
            console.log('Short token detected, trying verifyOtp...');
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: accessToken,
              type: 'recovery',
            });

            if (data?.session) {
              console.log('Session set via verifyOtp');
              setIsValidSession(true);
              setIsCheckingSession(false);
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            } else {
              console.error('verifyOtp failed:', error);
            }
          }
        }

        // Method 4: Check for token_hash in query params
        const tokenHash = urlParams.get('token_hash');
        if (tokenHash) {
          console.log('Found token_hash, verifying...');
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (data?.session) {
            console.log('Session set from token_hash');
            setIsValidSession(true);
            setIsCheckingSession(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } else {
            console.error('token_hash verification failed:', error);
          }
        }

        // No valid method worked
        console.log('No valid session could be established');
        setError('Invalid or expired reset link. Please request a new one.');
        setIsCheckingSession(false);

      } catch (err) {
        console.error('Session check error:', err);
        setError('Something went wrong. Please try again.');
        setIsCheckingSession(false);
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(checkSession, 100);
    return () => clearTimeout(timer);
  }, []);

  // Password strength checker
  const getPasswordStrength = (pass) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.match(/[a-z]/)) strength++;
    if (pass.match(/[A-Z]/)) strength++;
    if (pass.match(/[0-9]/)) strength++;
    if (pass.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-400', 'bg-emerald-500'];

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (passwordStrength < 3) {
      setError('Please choose a stronger password');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/home-dashboard');
      }, 3000);

    } catch (err) {
      setError('Failed to reset password. Please try again.');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isCheckingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a] p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0d1117] border border-emerald-500/20 rounded-2xl p-8 text-center relative z-10"
        >
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Reset Successful!</h2>
          <p className="text-gray-400 mb-6">
            Your password has been updated. Redirecting to dashboard...
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm">Redirecting...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a] p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0d1117] border border-red-500/20 rounded-2xl p-8 text-center relative z-10"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
          <p className="text-gray-400 mb-6">
            {error || 'This password reset link is invalid or has expired. Please request a new one.'}
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center justify-center w-full h-11 rounded-lg font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all"
          >
            Request New Link
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <div className="mt-4">
            <Link
              href="/auth/signin"
              className="text-emerald-500 hover:text-emerald-400 text-sm transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main reset password form
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="flex w-full h-full items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md overflow-hidden rounded-2xl bg-[#0d1117] border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 p-8"
        >
          <div className="flex items-center justify-center mb-8">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <TrendingUp className="text-white h-6 w-6" />
            </div>
            <span className="ml-3 text-xl font-bold text-emerald-500">Ezana Finance</span>
          </div>

          <h1 className="text-2xl font-bold mb-1 text-white text-center">Reset Your Password</h1>
          <p className="text-gray-500 mb-8 text-center">Enter your new password below</p>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                New Password <span className="text-emerald-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  className="w-full h-11 rounded-lg border border-gray-700 bg-[#161b22] px-4 pr-12 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-300 transition-colors"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength < 3 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {strengthLabels[passwordStrength - 1] || 'Too short'}
                  </p>
                </div>
              )}

              <div className="mt-3 space-y-1">
                {[
                  { check: password.length >= 8, text: 'At least 8 characters' },
                  { check: /[A-Z]/.test(password), text: 'One uppercase letter' },
                  { check: /[a-z]/.test(password), text: 'One lowercase letter' },
                  { check: /[0-9]/.test(password), text: 'One number' },
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      req.check ? 'bg-emerald-500/20' : 'bg-gray-700'
                    }`}>
                      {req.check && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <span className={req.check ? 'text-emerald-400' : 'text-gray-500'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password <span className="text-emerald-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  className={`w-full h-11 rounded-lg border bg-[#161b22] px-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : confirmPassword && confirmPassword === password
                      ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-300 transition-colors"
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                >
                  {isConfirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full h-11 rounded-lg font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Resetting Password...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/auth/signin"
              className="text-emerald-500 hover:text-emerald-400 text-sm transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
