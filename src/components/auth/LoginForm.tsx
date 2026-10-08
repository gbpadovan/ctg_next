'use client';

import React, { useState, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction, AuthActionState } from '@/app/actions/auth';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    loginAction,
    {}
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Glow highlight */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/20 via-blue-500/20 to-purple-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 -z-10" />

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-7 sm:p-9 backdrop-blur-2xl shadow-2xl shadow-black/80 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#070a12] rounded-[14px] flex items-center justify-center font-black text-amber-300 text-xl tracking-tight">
                CTG
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              Terminal Access
            </h1>
            <p className="text-xs text-slate-400 max-w-xs">
              Authenticate to unlock real-time quantitative Crypto to Gold purchasing power metrics.
            </p>
          </div>

          {/* Error Banner */}
          {state?.error && (
            <div
              id="login-error-banner"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-email-input"
                className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
              >
                <span>Email Address</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="investor@terminal.finance"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-mono text-[13px] ${
                    state?.fieldErrors?.email
                      ? 'border-rose-500/60 focus:ring-rose-500/30'
                      : 'border-slate-800/90 focus:border-amber-500/80 focus:ring-amber-500/20'
                  }`}
                />
              </div>
              {state?.fieldErrors?.email && (
                <span className="text-[11px] text-rose-400 font-mono">
                  {state.fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password-input"
                  className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <span>Password</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-mono text-[13px] ${
                    state?.fieldErrors?.password
                      ? 'border-rose-500/60 focus:ring-rose-500/30'
                      : 'border-slate-800/90 focus:border-amber-500/80 focus:ring-amber-500/20'
                  }`}
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {state?.fieldErrors?.password && (
                <span className="text-[11px] text-rose-400 font-mono">
                  {state.fieldErrors.password}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isPending}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Security details & Switch to Register */}
          <div className="flex flex-col gap-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <span>Don&apos;t have an account?</span>
              <Link
                id="link-to-register"
                href="/register"
                className="font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
              >
                Register now
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-bit Encrypted Session • Neon DB Secured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
