'use client';

import React, { Suspense } from 'react';
import { Guard } from '../guard';
import { SettingsPage } from '../../src/views/pages3';

export default function Settings() {
  return (
    <Guard>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading settings...</div>}>
        <SettingsPage />
      </Suspense>
    </Guard>
  );
}
