'use client';

import React, { Suspense } from 'react';
import { Login } from '../../src/views/pages1';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F4F8FC]">Loading login...</div>}>
      <Login />
    </Suspense>
  );
}
