'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const OrgSignInCard = ({ redirectTo = '/home' }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) {
        setError('Please enter a valid university email address.');
        return;
      }

      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('email_domain', domain)
        .eq('is_active', true)
        .maybeSingle();

      if (orgErr || !org) {
        setError(
          'Your university is not registered with Ezana Finance. Contact your organization administrator or email orgsupport@ezana.world.'
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from('org_members')
        .select('id, role')
        .eq('user_id', user?.id)
        .eq('org_id', org.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) {
        await supabase.auth.signOut();
        setError(
          `Your account is not registered as a member of ${org.name}. Contact your organization administrator.`
        );
        return;
      }

      router.push(redirectTo);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full h-full items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-[#0d1117] border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
            <GraduationCap className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Organizational Login</h1>
            <p className="text-gray-500 text-sm">University Investment Council</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              University Email <span className="text-indigo-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              className="w-full h-11 rounded-lg border border-gray-700 bg-[#161b22] px-4 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">Use your recognized university email address</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full h-11 rounded-lg border border-gray-700 bg-[#161b22] px-4 pr-12 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-300"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-lg font-medium bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              'Signing in...'
            ) : (
              <>
                Sign in <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/auth/forgot-password" className="text-indigo-400 hover:text-indigo-300">
            Forgot password?
          </Link>
        </div>

        <div className="mt-4 text-center text-xs text-gray-600">
          Not a member? Contact your university investment council executive team or email{' '}
          <a href="mailto:orgsupport@ezana.world" className="text-indigo-400">
            orgsupport@ezana.world
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default OrgSignInCard;
