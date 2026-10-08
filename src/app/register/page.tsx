import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ShieldCheck, TrendingUp, Cpu, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Register Account | Crypto to Gold (CTG) Terminal',
  description:
    'Create an account to gain full access to the Crypto to Gold (CTG) quantitative momentum terminal and purchasing power analysis.',
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Background radial glow */}
      <div className="absolute top-1/4 right-1/2 translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-0" />

      {/* Top micro navbar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/20">
            CTG
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-mono">
            CRYPTO TO GOLD
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Registration Online
          </span>
          <span>•</span>
          <span>PostgreSQL Auth</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-10 z-10">
        <Suspense
          fallback={
            <div className="w-full max-w-md h-[500px] rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            </div>
          }
        >
          <RegisterForm />
        </Suspense>

        {/* Feature Highlights beneath */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-center">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Secure Password Salting</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-400 text-xs">
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Exclusive Terminal Tools</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-400 text-xs">
            <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Neon Serverless Cloud</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 py-4 text-xs text-slate-500 border-t border-slate-900 font-mono z-10">
        <div>Crypto to Gold (CTG) Terminal • Quantitative Finance</div>
        <div>Only Registered Users Can Access</div>
      </footer>
    </main>
  );
}
