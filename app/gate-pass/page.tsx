'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Guard } from '../guard';
import { GatePassSkeleton } from '../../src/components/Boneyard';

const EmployeeGatePassPortal = dynamic(
  () => import('../../src/views/EmployeeGatePassPortal').then((m) => m.EmployeeGatePassPortal),
  {
    loading: () => <GatePassSkeleton />,
    ssr: false,
  }
);

export default function GatePassPage() {
  return (
    <Guard>
      <EmployeeGatePassPortal />
    </Guard>
  );
}
