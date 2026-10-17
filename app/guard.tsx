'use client';

import React from 'react';
import { useData } from '../src/store';
import { Layout } from '../src/components';
import { Navigate } from '../src/lib/router-compat';

export function Guard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useData();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F8FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading Docworm...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}
