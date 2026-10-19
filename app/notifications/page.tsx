'use client';

import React, { Suspense } from 'react';
import { Guard } from '../guard';
import { NotificationsCenter } from '../../src/views/pages3';

export default function NotificationsPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading notifications...</div>}>
        <NotificationsCenter />
      </Suspense>
    </Guard>
  );
}
