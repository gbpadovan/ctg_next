'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AssetsDirectory } from '@/components/assets/AssetsDirectory';
import { fetchDatabaseAssetsAction } from '@/app/actions/assets';
import { DatabaseAssetSummary } from '@/lib/data/assets';
import { Database, Loader2 } from 'lucide-react';

export default function AssetsPage() {
  const [assets, setAssets] = useState<DatabaseAssetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatabaseAssetsAction()
      .then((res) => {
        if (res.success && res.data) {
          setAssets(res.data);
        }
      })
      .catch((err) => console.error('Error fetching assets:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      {loading ? (
        <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="w-full h-24 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse flex items-center justify-between px-6" />
          {/* Skeleton Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : (
        <AssetsDirectory initialAssets={assets} />
      )}
    </AppShell>
  );
}
