'use client';

import React from 'react';
import { Guard } from '../guard';
import { FacultyLeavePortal } from '../../src/views/FacultyLeavePortal';

export default function LeavesPage() {
  return (
    <Guard>
      <FacultyLeavePortal />
    </Guard>
  );
}
