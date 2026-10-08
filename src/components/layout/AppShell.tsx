'use client';

import React, { Suspense } from 'react';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen w-full bg-[#070a12] text-slate-100 flex flex-col md:flex-row antialiased">
      <Suspense
        fallback={
          <aside className="h-screen w-64 bg-slate-950 border-r border-slate-800 shrink-0 hidden md:block" />
        }
      >
        <Sidebar />
      </Suspense>
      <main className="flex-1 w-full min-w-0 bg-[#070a12] overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
