'use client';

import React from 'react';
import { Guard } from '../guard';
import { EmployeeGatePassPortal } from '../../src/views/EmployeeGatePassPortal';

export default function LeavesPage() {
  return (
    <Guard>
      <EmployeeGatePassPortal />
    </Guard>
  );
}
