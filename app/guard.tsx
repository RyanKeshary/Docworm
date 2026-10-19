'use client';

import React from 'react';
import { useData } from '../src/store';
import { Layout } from '../src/components';
import { Navigate } from '../src/lib/router-compat';

import { AppLoadingScreen } from '../src/components/AppLoadingScreen';

export function Guard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useData();

  if (authLoading) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}
