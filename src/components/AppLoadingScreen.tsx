'use client';

import React from 'react';

export function AppLoadingScreen() {
  return (
    <div className="min-h-screen h-screen w-screen bg-[#F4F8FC] flex items-center justify-center font-sans select-none p-4">
      {/* Top micro progress track */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200/70 z-50 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-indigo-500 to-sky-400 animate-pulse w-3/4" />
      </div>

      {/* Modern Center Loading Card */}
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-lg p-6 sm:p-7 flex flex-col items-center text-center animate-fade-in">
        {/* Logo Badge */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white p-1 flex items-center justify-center shadow-xs border border-slate-200">
            <img src="/logo.png" alt="Shree L R Tiwari College of Engineering Logo" className="w-full h-full object-contain" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white animate-pulse" />
          </span>
        </div>

        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Shree L R Tiwari College of Engineering</h1>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">Institutional Workflow & Gate Pass Portal</p>

        {/* Status Indicator */}
        <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Synchronizing institutional workspace...</span>
        </div>
      </div>
    </div>
  );
}
