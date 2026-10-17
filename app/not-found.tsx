'use client';

import React from 'react';
import { Guard } from './guard';
import { PermissionPortal } from '../src/views/PermissionPortal';

export default function NotFound() {
  return (
    <Guard>
      <PermissionPortal />
    </Guard>
  );
}
