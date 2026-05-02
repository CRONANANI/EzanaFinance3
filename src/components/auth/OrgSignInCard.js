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

      const { createClient } = await import('@/lib/supabase');
      const anonClient = createClient();

      // Try domain-based org lookup first
      let org = null;
      const { data: orgByDomain } = await anonClient
        .from('organizations')
        .select('id, name')
        .eq('email_domain', domain)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      org = orgByDomain;

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // If domain didn't match, check if user is already in org_members directly.
      // This allows test accounts with non-university emails (gmail.com, etc.) to
      // log in through the org login page as long as they exist in org_members.
      if (!org) {
        const {
          data: { user: signedInUser },
        } = await supabase.auth.getUser();
        if (signedInUser) {
          const { data: memberOrg } = await supabase
            .from('org_members')
            .select('org_id, organizations(*)')
            .eq('user_id', signedInUser.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (memberOrg?.organizations) {
            org = { id: memberOrg.organizations.id, name: memberOrg.organizations.name };
          } else {
            await supabase.auth.signOut();
            setError(
              'Your university is not registered with Ezana Finance. Contact your organization administrator or email orgsupport@ezana.world.',
            );
            return;
          }
        }
      }

      console.log('[OrgLogin] Org resolved:', org);

      if (!org) {
        setError(
          'Your university is not registered with Ezana Finance. Contact your organization administrator or email orgsupport@ezana.world.',
        );
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
          `Your account is not registered as a member of ${org.name}. Contact your organization administrator.`,
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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-[#0d1117] p-8 shadow-2xl shadow-black/40"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#f0f6fc]">Organizational Login</h1>
            <p className="text-sm text-[#a7b1bb]">University Investment Council</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#c9d1d9]">
              University Email <span className="text-indigo-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              className="h-11 w-full rounded-lg border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-[#f0f6fc] placeholder-[#6b7280] transition-all focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <p className="mt-1 text-xs text-[#a7b1bb]">Use your recognized university email address</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#c9d1d9]">
              Password <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-11 w-full rounded-lg border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 pr-12 text-[#f0f6fc] placeholder-[#6b7280] transition-all focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#9ca3af] hover:text-[#c9d1d9]"
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

        <div className="mt-6 text-center text-sm">
          <Link href="/auth/forgot-password" className="font-medium text-indigo-300 hover:text-indigo-200">
            Forgot password?
          </Link>
        </div>

        <div className="mt-4 text-center text-xs text-[#a7b1bb]">
          Not a member? Contact your university investment council executive team or email{' '}
          <a href="mailto:orgsupport@ezana.world" className="font-medium text-indigo-300 hover:text-indigo-200">
            orgsupport@ezana.world
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default OrgSignInCard;
