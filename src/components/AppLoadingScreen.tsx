'use client';

import React, { useState, useEffect } from 'react';
import { Shimmer, PageSkeleton } from './Boneyard';

export function AppLoadingScreen() {
  const [stage, setStage] = useState('Verifying institutional session...');
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(65);
      setStage('Connecting campus real-time synchronizer...');
    }, 280);

    const t2 = setTimeout(() => {
      setProgress(90);
      setStage('Loading institutional workspace...');
    }, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="relative min-h-screen h-screen w-screen overflow-hidden bg-[#F4F8FC] flex flex-col font-sans select-none">
      {/* Top micro progress track */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200/60 z-50 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-indigo-500 to-sky-400 transition-all duration-300 ease-out shadow-sm"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Modern Center Loading Card Overlay */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[2px]">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col items-center text-center animate-fade-in relative overflow-hidden">
          {/* Subtle accent light */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          {/* Logo Badge with smooth pulse */}
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/25 border-2 border-white">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
            </span>
          </div>

          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Docworm Institutional Portal</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Shree L. R. Tiwari College of Engineering</p>

          {/* Status Capsule */}
          <div className="mt-5 mb-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>{stage}</span>
          </div>

          <p className="text-[11px] text-slate-400">Instant multi-user active sync enabled</p>
        </div>
      </div>

      {/* Render underlying Boneyard layout so structure is instantly visible */}
      <div className="opacity-70 pointer-events-none filter blur-[0.5px]">
        <PageSkeleton />
      </div>
    </div>
  );
}
