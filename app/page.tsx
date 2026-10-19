'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Guard } from './guard';
import { PermissionPortalSkeleton } from '../src/components/Boneyard';

const PermissionPortal = dynamic(
  () => import('../src/views/PermissionPortal').then((m) => m.PermissionPortal),
  {
    loading: () => <PermissionPortalSkeleton />,
    ssr: false,
  }
);

export default function HomePage() {
  return (
    <Guard>
      <PermissionPortal />
    </Guard>
  );
}
