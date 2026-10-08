'use client';

import React, { useState, useActionState } from 'react';
import Link from 'next/link';
import { registerAction, AuthActionState } from '@/app/actions/auth';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2, Sparkles, CheckCircle } from 'lucide-react';

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    registerAction,
    {}
  );
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const hasMinLength = passwordValue.length >= 6;

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
              Create Terminal Account
            </h1>
            <p className="text-xs text-slate-400 max-w-xs">
              Register to access proprietary momentum indicators and gold-ratio purchasing power analysis.
            </p>
          </div>

          {/* Error Banner */}
          {state?.error && (
            <div
              id="register-error-banner"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="register-name-input"
                className="text-xs font-semibold text-slate-300"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="register-name-input"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Satoshi Nakamoto"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-mono text-[13px] ${
                    state?.fieldErrors?.name
                      ? 'border-rose-500/60 focus:ring-rose-500/30'
                      : 'border-slate-800/90 focus:border-amber-500/80 focus:ring-amber-500/20'
                  }`}
                />
              </div>
              {state?.fieldErrors?.name && (
                <span className="text-[11px] text-rose-400 font-mono">
                  {state.fieldErrors.name}
                </span>
              )}
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="register-email-input"
                className="text-xs font-semibold text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="analyst@terminal.finance"
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

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="register-password-input"
                className="text-xs font-semibold text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="At least 6 characters"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className={`w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-mono text-[13px] ${
                    state?.fieldErrors?.password
                      ? 'border-rose-500/60 focus:ring-rose-500/30'
                      : 'border-slate-800/90 focus:border-amber-500/80 focus:ring-amber-500/20'
                  }`}
                />
                <button
                  type="button"
                  id="toggle-register-password-btn"
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

              {/* Password requirement hint */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    hasMinLength ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
                <span className={hasMinLength ? 'text-emerald-400' : 'text-slate-500'}>
                  Minimum 6 characters
                </span>
              </div>

              {state?.fieldErrors?.password && (
                <span className="text-[11px] text-rose-400 font-mono">
                  {state.fieldErrors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="register-confirm-password-input"
                className="text-xs font-semibold text-slate-300"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-confirm-password-input"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-mono text-[13px] ${
                    state?.fieldErrors?.confirmPassword
                      ? 'border-rose-500/60 focus:ring-rose-500/30'
                      : 'border-slate-800/90 focus:border-amber-500/80 focus:ring-amber-500/20'
                  }`}
                />
              </div>
              {state?.fieldErrors?.confirmPassword && (
                <span className="text-[11px] text-rose-400 font-mono">
                  {state.fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isPending}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Security & Link to Login */}
          <div className="flex flex-col gap-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <span>Already have an account?</span>
              <Link
                id="link-to-login"
                href="/login"
                className="font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
              >
                Sign in here
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant access upon registration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
