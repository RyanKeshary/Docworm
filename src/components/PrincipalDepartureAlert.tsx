'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useData } from '../store';
import { api } from '../lib/api';
import type { EmployeeGatePass } from '../types';
import { AlertCircle, CheckCircle2, Clock, X, ExternalLink, Zap, ShieldAlert, ArrowRight } from 'lucide-react';
import { useNavigate } from '../lib/router-compat';

function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle 2-tone notification chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch (e) {
    // Graceful fallback if audio is blocked by user gesture policy
  }
}

export function PrincipalDepartureAlert() {
  const { currentUser } = useData();
  const nav = useNavigate();
  const [activeAlerts, setActiveAlerts] = useState<EmployeeGatePass[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);
  const seenExitIdsRef = useRef<Set<string>>(new Set());

  // Only active for Principal
  const isPrincipal = currentUser?.role === 'Principal';

  useEffect(() => {
    if (!isPrincipal) return;

    let isMounted = true;

    const checkDepartures = async () => {
      try {
        const res = await api.gatePasses.list();
        if (!isMounted) return;
        const allPasses: EmployeeGatePass[] = res.gatePasses || res.leaves || [];

        // Find passes where faculty is currently OUTSIDE campus
        const outsidePasses = allPasses.filter(
          (p) => p.movement_status === 'outside'
        );

        // Check if there are newly exited passes to play a notification sound
        outsidePasses.forEach((p) => {
          if (!seenExitIdsRef.current.has(p.id)) {
            seenExitIdsRef.current.add(p.id);
            // Play sound chime for new departure
            playAlertChime();
          }
        });

        setActiveAlerts(outsidePasses);
      } catch (err) {
        // Silently retry on next tick
      }
    };

    // Initial check
    checkDepartures();

    // Real-time polling every 4 seconds for immediate alert delivery
    const timer = setInterval(checkDepartures, 4000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isPrincipal]);

  if (!isPrincipal) return null;

  // Filter out dismissed alerts
  const visibleAlerts = activeAlerts.filter((p) => !dismissedIds.has(p.id));
  if (visibleAlerts.length === 0) return null;

  // Show top most urgent alert (e.g. pending ones first, then newest)
  const currentPass = visibleAlerts.sort((a, b) => {
    if (a.status !== 'Approved' && b.status === 'Approved') return -1;
    if (a.status === 'Approved' && b.status !== 'Approved') return 1;
    return new Date(b.actual_exit_at || b.date).getTime() - new Date(a.actual_exit_at || a.date).getTime();
  })[0];

  const isPendingApproval = currentPass.status === 'Pending' || currentPass.status === 'Recommended';

  const handleQuickApprove = async () => {
    try {
      setApprovingId(currentPass.id);
      await api.gatePasses.quickApprove(currentPass.id, 'Instant Real-Time Sanction by Principal upon Exit');
      setQuickSuccessMsg(`Sanctioned gate pass for ${currentPass.employee_name}!`);
      setTimeout(() => {
        setQuickSuccessMsg(null);
        setDismissedIds((prev) => new Set([...prev, currentPass.id]));
      }, 2500);
      // Refresh alert list
      const res = await api.gatePasses.list();
      setActiveAlerts(res.gatePasses || res.leaves || []);
    } catch (err: any) {
      alert(err.message || 'Failed to approve gate pass.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDismiss = () => {
    setDismissedIds((prev) => new Set([...prev, currentPass.id]));
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-3 sm:px-0 animate-bounce-in">
      <div className="bg-surface rounded-card border border-primary-border shadow-xl p-4 sm:p-5 overflow-hidden relative transition-all">

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                  Real-Time Exit Alert
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Ref: {currentPass.ref_no}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1">
                Faculty Exited Campus Premises
              </h3>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>

        {/* Details Card */}
        <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-xs text-slate-700">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-900 text-sm">
              {currentPass.employee_name}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px]">
              🟡 Outside Campus
            </span>
          </div>

          <div className="text-[11px] text-slate-600 flex items-center gap-2">
            <span className="font-medium text-slate-800">Dept:</span> {currentPass.department}
            {currentPass.contact_phone && <span>• 📞 {currentPass.contact_phone}</span>}
          </div>

          <div className="text-[11px] text-slate-600">
            <span className="font-medium text-slate-800">Purpose:</span> {currentPass.purpose}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-500">Scheduled:</span>{' '}
              <span className="font-semibold text-rose-700">{currentPass.time_out}</span> &rarr;{' '}
              <span className="font-semibold text-emerald-700">{currentPass.time_in}</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>{' '}
              <span className={`font-bold ${isPendingApproval ? 'text-amber-700' : 'text-emerald-700'}`}>
                {currentPass.status}
              </span>
            </div>
          </div>
        </div>

        {quickSuccessMsg ? (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{quickSuccessMsg}</span>
          </div>
        ) : (
          <div className="mt-3.5 flex items-center gap-2">
            {isPendingApproval ? (
              <button
                onClick={handleQuickApprove}
                disabled={approvingId === currentPass.id}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md transition-all disabled:opacity-50"
              >
                <Zap size={14} className="fill-current text-amber-300" />
                <span>{approvingId === currentPass.id ? 'Sanctioning...' : '⚡ Quick Sanction & Approve'}</span>
              </button>
            ) : (
              <button
                onClick={() => nav('/gate-pass')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-all shadow-sm"
              >
                <span>View in Gate Pass Hub</span>
                <ArrowRight size={13} />
              </button>
            )}

            <button
              onClick={() => {
                nav('/gate-pass');
                handleDismiss();
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Open Hub
            </button>
          </div>
        )}

        {visibleAlerts.length > 1 && (
          <div className="mt-2 text-center text-[10px] text-slate-500">
            +{visibleAlerts.length - 1} more faculty currently off-campus
          </div>
        )}
      </div>
    </div>
  );
}
