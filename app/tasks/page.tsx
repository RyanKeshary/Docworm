'use client';

import React, { Suspense } from 'react';
import { Guard } from '../guard';
import { TasksList } from '../../src/views/pages3';

export default function TasksPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading tasks...</div>}>
        <TasksList />
      </Suspense>
    </Guard>
  );
}
