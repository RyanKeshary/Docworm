'use client';

import React from 'react';

// ====================================================================
// Custom-Crafted Boneyard (Skeleton) System for Docworm
// Provides rich, animated layout placeholders so the full page structure
// is instantly visible to users even before data arrives.
// ====================================================================

export function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-slate-200/80 rounded-lg animate-pulse ${className}`} />
  );
}

// 1. Full Page Boneyard (Sidebar + Header + Dynamic Content Frame)
export function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen h-screen flex bg-slate-50/70 overflow-hidden font-sans">
      {/* Sidebar Boneyard */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-slate-200/80 bg-white flex-col justify-between p-4 h-full">
        <div className="space-y-6">
          {/* Logo Frame */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <Shimmer className="w-9 h-9 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-4 w-24 rounded" />
              <Shimmer className="h-2.5 w-16 rounded" />
            </div>
          </div>

          {/* User Role Pill */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
            <Shimmer className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-3 w-16 rounded" />
              <Shimmer className="h-2.5 w-24 rounded" />
            </div>
          </div>

          {/* Nav Items */}
          <div className="space-y-2 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50/60">
                <Shimmer className="w-5 h-5 rounded" />
                <Shimmer className="h-3.5 flex-1 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Sidebar */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <Shimmer className="h-8 w-full rounded-xl" />
          <Shimmer className="h-8 w-full rounded-xl" />
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Boneyard */}
        <header className="h-16 shrink-0 bg-white/95 border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shimmer className="w-8 h-8 rounded-xl lg:hidden" />
            <Shimmer className="h-9 w-64 sm:w-96 rounded-xl hidden sm:block" />
          </div>
          <div className="flex items-center gap-3">
            <Shimmer className="h-8 w-20 rounded-xl" />
            <Shimmer className="w-8 h-8 rounded-xl" />
            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />
            <Shimmer className="w-8 h-8 rounded-full" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
          {children || <GatePassSkeleton />}
        </main>
      </div>
    </div>
  );
}

// 2. Specific Employee Gate Pass Boneyard
export function GatePassSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Shimmer className="h-6 w-60 rounded-md" />
              <Shimmer className="h-3.5 w-80 rounded" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-28 rounded-xl" />
          <Shimmer className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Presence Tracker Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shimmer className="w-3 h-3 rounded-full" />
            <Shimmer className="h-4 w-52 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-7 w-28 rounded-lg" />
            <Shimmer className="h-7 w-28 rounded-lg" />
          </div>
        </div>
        <Shimmer className="h-10 w-full rounded-xl" />
      </div>

      {/* Stat Cards Grid (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <Shimmer className="h-3 w-20 rounded" />
              <Shimmer className="w-4 h-4 rounded" />
            </div>
            <Shimmer className="h-8 w-14 rounded-md" />
            <Shimmer className="h-2.5 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Filters & Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <Shimmer className="h-9 w-full sm:w-80 rounded-xl" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Shimmer className="h-9 w-32 rounded-xl" />
            <Shimmer className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-3 px-3 bg-slate-50/50 rounded-xl gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Shimmer className="w-9 h-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Shimmer className="h-4 w-40 rounded" />
                  <Shimmer className="h-3 w-56 rounded" />
                </div>
              </div>
              <Shimmer className="h-6 w-24 rounded-full hidden sm:block" />
              <Shimmer className="h-8 w-20 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. Permission Requests / Home Boneyard
export function PermissionPortalSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
        <div className="space-y-2">
          <Shimmer className="h-7 w-64 rounded-md" />
          <Shimmer className="h-4 w-96 rounded" />
        </div>
        <Shimmer className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <Shimmer className="h-4 w-24 rounded" />
            <Shimmer className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
        <Shimmer className="h-10 w-full rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Shimmer key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
