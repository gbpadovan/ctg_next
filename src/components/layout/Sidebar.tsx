'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  TrendingUp,
  Database,
  Coins,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Layers,
} from 'lucide-react';
import { getCurrentUserAction, logoutAction } from '@/app/actions/auth';
import { SessionPayload } from '@/lib/auth/session';

export function Sidebar() {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionPayload | null>(null);

  useEffect(() => {
    getCurrentUserAction().then((u) => setCurrentUser(u));
  }, []);

  const isMainActive = pathname === '/';
  const isAssetsActive = pathname === '/assets' || pathname.startsWith('/assets/');

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <>
      {/* Mobile Top Navbar with Hamburger */}
      <div className="md:hidden w-full bg-slate-950/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/20">
            CTG
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-mono">
            CTG TERMINAL
          </span>
        </Link>
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle navigation menu"
        >
          {isOpenMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar Desktop + Mobile Drawer */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-950/95 border-r border-slate-800/80 p-5 flex flex-col justify-between z-50 backdrop-blur-2xl transition-transform duration-300 ease-in-out shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col gap-6">
          {/* Logo & Terminal Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-amber-500/25 tracking-tight shrink-0">
              CTG
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5 font-mono">
                CTG TERMINAL
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono font-medium tracking-wide">
                QUANTITATIVE v1.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1.5 pt-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-3 pb-1 font-semibold">
              Platform Views
            </span>

            {/* 1. Main Page (CTG Indicator) */}
            <Link
              id="sidebar-nav-ctg"
              href="/"
              onClick={() => setIsOpenMobile(false)}
              className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-medium transition-all group ${
                isMainActive
                  ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/5 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    isMainActive
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-900 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>CTG Indicator</span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  isMainActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                }`}
              />
            </Link>

            {/* 2. Assets Page */}
            <Link
              id="sidebar-nav-assets"
              href="/assets"
              onClick={() => setIsOpenMobile(false)}
              className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-medium transition-all group ${
                isAssetsActive
                  ? 'bg-gradient-to-r from-blue-500/15 to-blue-500/5 text-blue-300 border border-blue-500/30 shadow-md shadow-blue-500/5 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    isAssetsActive
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-slate-900 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                </div>
                <span>Database Assets</span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  isAssetsActive ? 'text-blue-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                }`}
              />
            </Link>
          </div>

          {/* Quick Platform Info */}
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Saylor to Schiff</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Crypto purchasing power denominated in physical gold with 4-week rate-of-change momentum.
            </p>
          </div>
        </div>

        {/* Bottom Section: User Profile & Logout */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/80">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate font-mono">
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <button
                id="sidebar-logout-btn"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono px-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Session</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
