'use client';

import React from 'react';
import { Guard } from '../guard';
import { PermissionPortal } from '../../src/views/PermissionPortal';

export default function FacultyPage() {
  return (
    <Guard>
      <PermissionPortal />
    </Guard>
  );
}
