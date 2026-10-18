'use client';

import React from 'react';
import { Guard } from '../guard';
import { EmployeeGatePassPortal } from '../../src/views/EmployeeGatePassPortal';

export default function GatePassPage() {
  return (
    <Guard>
      <EmployeeGatePassPortal />
    </Guard>
  );
}
