'use client';

import React from 'react';
import { Guard } from './guard';
import { PermissionPortal } from '../src/views/PermissionPortal';

export default function HomePage() {
  return (
    <Guard>
      <PermissionPortal />
    </Guard>
  );
}
