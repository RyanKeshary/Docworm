'use client';

import React from 'react';
import { DataProvider } from '../src/store';

export function Providers({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
