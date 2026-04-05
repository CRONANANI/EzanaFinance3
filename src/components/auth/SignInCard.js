'use client';

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthDotMap from "./AuthDotMap";
import { supabase } from "@/lib/supabase";

const SignInCard = ({ variant = "user", redirectTo, oauthErrorMessage }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const destination = redirectTo || "/home";

  useEffect(() => {
    if (oauthErrorMessage) {
      try {
        setError(decodeURIComponent(oauthErrorMessage));
      } catch {
        setError(oauthErrorMessage);
      }
    }
  }, [oauthErrorMessage]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (variant === "partner") {
        const { data: { user } } = await supabase.auth.getUser();
        let isPartner = !!user?.user_metadata?.partner_role;
        if (!isPartner) {
          const { data: partner } = await supabase
            .from("partners")
            .select("id")
            .eq("user_id", user?.id)
            .eq("status", "active")
            .single();
          isPartner = !!partner;
        }
        if (!isPartner) {
          await supabase.auth.signOut();
          setError("This account is not registered as a partner. Contact partnersupport@ezana.world or apply to become a partner.");
          return;
        }
        router.push("/partner-home");
      } else {
        router.push(destination);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
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
        className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50"
      >
        {/* Left side - Network Visualization */}
        <div className="relative hidden h-[600px] w-1/2 overflow-hidden border-r border-gray-100 md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-slate-50">
            <AuthDotMap />

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
              <div className="max-w-sm rounded-2xl border border-white/80 bg-white/90 px-8 py-6 shadow-sm backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mb-6 flex justify-center"
                >
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <TrendingUp className="text-white h-8 w-8" />
                  </div>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-3xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-800"
                >
                  Ezana Finance
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-sm text-center text-gray-800 max-w-xs"
                >
                  Access institutional-grade market intelligence and track the moves that matter
                </motion.p>

                {/* Feature highlights */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="mt-8 space-y-3"
                >
                  {[
                    "Real-time congressional trades",
                    "Hedge fund 13F filings",
                    "Legendary investor portfolios",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-800 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Sign In Form */}
        <div className="flex w-full flex-col justify-center bg-white p-8 md:w-1/2 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center md:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-emerald-700">Ezana Finance</span>
            </div>

            <h1 className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">Welcome back</h1>
            <p className="mb-8 text-gray-600">Sign in to your account</p>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email <span className="text-emerald-600">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                  Password <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 pr-12 text-gray-900 placeholder-gray-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 transition-colors hover:text-gray-700"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-11 relative overflow-hidden rounded-lg font-medium transition-all duration-300 ${
                    isLoading
                      ? "bg-emerald-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                  } text-white ${isHovered ? "shadow-lg shadow-emerald-500/25" : ""}`}
                >
                  <span className="flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </span>
                  {isHovered && !isLoading && (
                    <motion.span
                      initial={{ left: "-100%" }}
                      animate={{ left: "100%" }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{ filter: "blur(8px)" }}
                    />
                  )}
                </button>
              </motion.div>

              {/* Forgot Password */}
              <div className="text-center">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                >
                  Forgot password?
                </Link>
              </div>
            </form>

            <div className="mt-8 text-center text-sm text-gray-600">
              {variant === "partner" ? (
                <>
                  Not a partner but interested in becoming one? Reach out to{" "}
                  <a
                    href="mailto:partnersupport@ezana.world"
                    className="font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    partnersupport@ezana.world
                  </a>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {variant === "user" && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Partner or Creator?
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <Link
                  href="/auth/partner-login"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-3 text-sm font-medium text-amber-900 transition-all hover:border-amber-300 hover:bg-amber-100"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.636.622-.01.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.636.89.01a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.636-.622.01-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01-.622-.636z" />
                  </svg>
                  Login as Partner
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignInCard;
