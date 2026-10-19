'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  FileText,
  User,
  ChevronRight,
  Send,
  Building,
  Phone,
  Printer,
  Download,
  X,
  Check,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Sparkles,
  Activity,
  Zap,
  MapPin,
  LogOut as ExitIcon,
  LogIn as ReturnIcon,
  UploadCloud,
} from 'lucide-react';
import { useData } from '../store';
import { api } from '../lib/api';
import { realtime } from '../lib/realtime';
import { GatePassSkeleton } from '../components/Boneyard';
import type { EmployeeGatePass, GatePassStatus } from '../types';
import { Modal, btnPrimary, btnGhost, inputCls } from '../components';

const PURPOSE_PRESETS = [
  'Official University / Exam Duty',
  'Bank / Government Office Work',
  'Medical Checkup / Health Emergency',
  'Inter-College Meeting / Conference',
  'Student Project / Field Inspection',
  'Personal Urgent Work',
];

export function EmployeeGatePassPortal() {
  const { currentUser, options } = useData();

  // Instant zero-latency local cache initialization
  const [gatePasses, setGatePasses] = useState<EmployeeGatePass[]>(() => {
    if (typeof window !== 'undefined' && currentUser?.id) {
      try {
        const cached = localStorage.getItem(`docworm_gp_cache_${currentUser.id}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && currentUser?.id) {
      try {
        const cached = localStorage.getItem(`docworm_gp_cache_${currentUser.id}`);
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  // Modals
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<EmployeeGatePass | null>(null);
  const [decisionAction, setDecisionAction] = useState<'Recommend' | 'Approve' | 'Reject'>('Recommend');
  const [decisionRemark, setDecisionRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isBlankPrint, setIsBlankPrint] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Application Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: todayStr,
    department: currentUser.department || 'IT',
    purpose: '',
    time_out: '12:30 PM',
    time_in: '03:30 PM',
    contact_phone: currentUser.phone || '',
  });

  const fetchPasses = async (isBackground = false) => {
    try {
      if (!isBackground && gatePasses.length === 0) setLoading(true);
      setError('');
      const res = await api.gatePasses.list();
      const list = res.gatePasses || res.leaves || [];
      setGatePasses(list);
      if (typeof window !== 'undefined' && currentUser?.id) {
        try {
          localStorage.setItem(`docworm_gp_cache_${currentUser.id}`, JSON.stringify(list));
        } catch {}
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message || 'Failed to load employee gate passes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses(gatePasses.length > 0);

    // Active instant sync via Server-Sent Events & BroadcastChannel
    const unsub = realtime.on('gate_passes_updated', (msg) => {
      console.log('⚡ Real-time gate pass update received:', msg);
      fetchPasses(true);
    });

    const unsubAll = realtime.on('sync_all', () => {
      fetchPasses(true);
    });

    // 20-second heartbeat polling for ultra-reliable fallback
    const interval = setInterval(() => {
      fetchPasses(true);
    }, 20000);

    return () => {
      unsub();
      unsubAll();
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  // Filtered passes
  const filteredPasses = useMemo(() => {
    return gatePasses.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (deptFilter !== 'All' && p.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = p.ref_no?.toLowerCase().includes(q);
        const matchesName = p.employee_name?.toLowerCase().includes(q);
        const matchesPurpose = p.purpose?.toLowerCase().includes(q);
        const matchesDept = p.department?.toLowerCase().includes(q);
        if (!matchesRef && !matchesName && !matchesPurpose && !matchesDept) return false;
      }
      return true;
    });
  }, [gatePasses, statusFilter, deptFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = gatePasses.length;
    const pendingHOD = gatePasses.filter((p) => p.status === 'Pending').length;
    const pendingPrincipal = gatePasses.filter((p) => p.status === 'Recommended').length;
    const approved = gatePasses.filter((p) => p.status === 'Approved').length;
    const rejected = gatePasses.filter((p) => p.status === 'Rejected').length;
    const myPasses = gatePasses.filter((p) => p.employee_id === currentUser.id && p.status === 'Approved').length;
    const currentlyOutside = gatePasses.filter((p) => p.movement_status === 'outside').length;
    const returnedToday = gatePasses.filter((p) => p.movement_status === 'returned').length;

    return { total, pendingHOD, pendingPrincipal, approved, rejected, myPasses, currentlyOutside, returnedToday };
  }, [gatePasses, currentUser.id]);

  // Handle Application Submit
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const finalPurpose = uploadedFileName
        ? `${form.purpose.trim()} [Uploaded Duty Proof / Document: ${uploadedFileName}]`
        : form.purpose;
      await api.gatePasses.create({
        ...form,
        purpose: finalPurpose,
      });
      setSuccessMsg('Gate pass request submitted successfully! Awaiting institutional endorsement.');
      setApplyModalOpen(false);
      setUploadedFileName('');
      setForm({
        date: todayStr,
        department: currentUser.department || 'IT',
        purpose: '',
        time_out: '12:30 PM',
        time_in: '03:30 PM',
        contact_phone: currentUser.phone || '',
      });
      realtime.broadcastLocal({ type: 'gate_passes_updated', action: 'create', timestamp: new Date().toISOString() });
      await fetchPasses();
    } catch (err: any) {
      setError(err.message || 'Failed to submit gate pass request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Decision (HOD Recommend or Principal Approve)
  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPass) return;
    try {
      setSubmitting(true);
      setError('');
      await api.gatePasses.decide(selectedPass.id, {
        action: decisionAction,
        remark: decisionRemark.trim(),
      });
      setSuccessMsg(`Gate pass ${selectedPass.ref_no} ${decisionAction.toLowerCase()}ed successfully.`);
      setDecisionModalOpen(false);
      setDecisionRemark('');
      setSelectedPass(null);
      realtime.broadcastLocal({ type: 'gate_passes_updated', action: 'decide', timestamp: new Date().toISOString() });
      await fetchPasses();
    } catch (err: any) {
      setError(err.message || 'Failed to record gate pass decision.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancel
  const handleCancel = async (pass: EmployeeGatePass) => {
    if (!window.confirm(`Are you sure you want to cancel gate pass ${pass.ref_no}?`)) return;
    try {
      setSubmitting(true);
      setError('');
      await api.gatePasses.cancel(pass.id);
      setSuccessMsg(`Gate pass ${pass.ref_no} has been cancelled.`);
      realtime.broadcastLocal({ type: 'gate_passes_updated', action: 'cancel', timestamp: new Date().toISOString() });
      await fetchPasses();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel gate pass.');
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (gatePasses.length === 0) return;
    const headers = ['Ref No', 'Date', 'Employee Name', 'Department', 'Purpose', 'Time Out', 'Time In', 'Status', 'HOD Endorsement', 'Principal Sanction'];
    const rows = filteredPasses.map((p) => [
      `"${p.ref_no || ''}"`,
      `"${p.date || ''}"`,
      `"${(p.employee_name || '').replace(/"/g, '""')}"`,
      `"${p.department || ''}"`,
      `"${(p.purpose || '').replace(/"/g, '""')}"`,
      `"${p.time_out || ''}"`,
      `"${p.time_in || ''}"`,
      `"${p.status || ''}"`,
      `"${(p.hod_name || '').replace(/"/g, '""')}"`,
      `"${(p.principal_name || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SLRTCE_Employee_Gate_Passes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Departure (Exit) or Return
  const handleMovement = async (passId: string, action: 'exit' | 'return') => {
    try {
      setSubmitting(true);
      setError('');
      await api.gatePasses.updateMovement(passId, action);
      if (action === 'exit') {
        setSuccessMsg('Faculty departure recorded! Status updated to "Outside Premises" and real-time alert sent to the Principal.');
      } else {
        setSuccessMsg('✅ You have successfully entered the campus! Your entry has been recorded and verified.');
      }
      realtime.broadcastLocal({ type: 'gate_passes_updated', action: `movement_${action}`, timestamp: new Date().toISOString() });
      await fetchPasses(true);
    } catch (err: any) {
      setError(err.message || `Failed to mark ${action}.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick 1-Click Approve for Principal
  const handleQuickApprove = async (passId: string, employeeName: string) => {
    try {
      setSubmitting(true);
      setError('');
      await api.gatePasses.quickApprove(passId, 'Instant Real-Time Sanction by Principal upon Exit');
      setSuccessMsg(`Gate pass for ${employeeName} sanctioned and approved successfully!`);
      realtime.broadcastLocal({ type: 'gate_passes_updated', action: 'decide', timestamp: new Date().toISOString() });
      await fetchPasses(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sanction gate pass.');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: GatePassStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} /> Pending HOD
          </span>
        );
      case 'Recommended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send size={12} /> Pending Principal
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Approved & Issued
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <RotateCcw size={12} /> Cancelled
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getMovementBadge = (status?: 'inside' | 'outside' | 'returned', exitTime?: string, returnTime?: string) => {
    if (status === 'outside') {
      const exitFormatted = exitTime ? new Date(exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Outside Premises {exitFormatted ? `(${exitFormatted})` : ''}
        </span>
      );
    }
    if (status === 'returned') {
      const returnFormatted = returnTime ? new Date(returnTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          <CheckCircle2 size={13} className="text-emerald-700" />
          Successfully Entered {returnFormatted ? `(${returnFormatted})` : ''}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        Inside Campus
      </span>
    );
  };

  // Instant layout visibility: if loading with zero cache, show the crafted Boneyard Skeleton
  if (loading && gatePasses.length === 0) {
    return <GatePassSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface p-6 rounded-card border border-primary-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary-pale text-primary border border-primary/20">
              <Ticket size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Employee Gate Pass Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted">
            Institutional gate pass workflow: Request &rarr; HOD Endorsement &rarr; Principal Final Sanction & Security Gate Pass.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsBlankPrint(true);
              setSelectedPass(null);
              setPassModalOpen(true);
            }}
            className={btnGhost}
            title="Print Blank Gate Pass Slip"
          >
            <Printer size={15} />
            <span>Blank Pass</span>
          </button>

          <button onClick={handleExportCSV} className={btnGhost} title="Export CSV Report">
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          {(currentUser.role === 'Faculty' || currentUser.role === 'HOD' || currentUser.role === 'Dean') && (
            <button
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  date: todayStr,
                  department: currentUser.department || 'IT',
                  contact_phone: currentUser.phone || '',
                }));
                setUploadedFileName('');
                setApplyModalOpen(true);
              }}
              className={btnPrimary}
            >
              <Plus size={16} />
              <span>Request Gate Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-100 rounded text-rose-600">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* REAL-TIME CAMPUS PRESENCE & FACULTY MOVEMENT TRACKER                   */}
      {/* ==================================================================== */}
      <div className="bg-surface p-4 sm:p-5 rounded-card border border-primary-border shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-ink">
                  Live Campus Presence &amp; Movement Tracker
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Real-Time Active
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Dynamic tracking of faculty status across campus gates with instant Principal alerts upon exit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-page border border-primary-border text-xs text-ink">
              <span className="text-ink-muted">Currently Away:</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${stats.currentlyOutside > 0 ? 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                {stats.currentlyOutside} Outside
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-page border border-primary-border text-xs text-ink">
              <span className="text-ink-muted">Returned Today:</span>
              <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200">
                {stats.returnedToday}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Faculty Movement / Campus Status Indicator */}
        {(() => {
          const myOutsidePass = gatePasses.find(
            (p) => p.employee_id === currentUser.id && p.movement_status === 'outside'
          );
          const myReturnedPass = gatePasses.find(
            (p) => p.employee_id === currentUser.id && p.movement_status === 'returned'
          );

          if (myOutsidePass) {
            return (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    <ExitIcon size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 text-xs sm:text-sm block">
                      Active Campus Departure: You Are Marked Outside
                    </span>
                    <span className="text-amber-800 text-[11px]">
                      Out from <strong className="font-semibold">{myOutsidePass.time_out}</strong> until <strong className="font-semibold">{myOutsidePass.time_in}</strong>. Tap below once you return through the campus gate.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleMovement(myOutsidePass.id, 'return')}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                >
                  <ReturnIcon size={15} />
                  <span>Mark Entry into Campus</span>
                </button>
              </div>
            );
          }

          if (myReturnedPass) {
            return (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/25 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 text-xs sm:text-sm block">
                      ✓ Successfully Entered Campus
                    </span>
                    <span className="text-emerald-800 text-[11px]">
                      Your gate re-entry has been officially logged and verified. You are recorded as present inside campus.
                      {myReturnedPass.actual_return_at && (
                        <> (Entered at: {new Date(myReturnedPass.actual_return_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})</>
                      )}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-md border border-emerald-300">
                  Status: Inside Campus
                </span>
              </div>
            );
          }

          return null;
        })()}

        {/* Presence Cards / Active Departure Grid */}
        <div>
          {stats.currentlyOutside === 0 ? (
            <div className="py-3 px-4 rounded-xl bg-slate-50/80 border border-primary-border/80 flex items-center justify-between text-xs text-ink">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-ink text-xs">All faculty members are currently inside campus.</span>
                  <span className="text-ink-muted text-[11px] ml-2 hidden sm:inline">Exits and departure alerts will appear here in real time.</span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Gate Status: All Clear
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                Faculty Members Currently Outside Campus ({stats.currentlyOutside})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {gatePasses.filter(p => p.movement_status === 'outside').map((pass) => (
                  <div key={pass.id} className="bg-surface border-2 border-amber-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-ink block">{pass.employee_name}</span>
                          <span className="text-[11px] text-ink-muted">{pass.department} • Ref: {pass.ref_no}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] uppercase">
                          Away
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted italic bg-page p-2 rounded-lg border border-primary-border line-clamp-2">
                        &quot;{pass.purpose}&quot;
                      </p>
                      <div className="mt-2 text-[11px] space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Recorded Departure:</span>
                          <span className="font-mono text-rose-700 font-semibold">
                            {pass.actual_exit_at ? new Date(pass.actual_exit_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : pass.time_out}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Outside Period:</span>
                          <span className="font-semibold text-amber-900">
                            From {pass.time_out} until {pass.time_in}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Expected Return:</span>
                          <span className="font-mono text-emerald-700 font-semibold">{pass.time_in}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Pass Status:</span>
                          <span className={`font-semibold ${pass.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {pass.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-primary-border flex items-center gap-2">
                      {currentUser.role === 'Principal' && pass.status !== 'Approved' && (
                        <button
                          onClick={() => handleQuickApprove(pass.id, pass.employee_name)}
                          disabled={submitting}
                          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Zap size={13} className="text-amber-200 fill-current" />
                          <span>1-Click Sanction</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleMovement(pass.id, 'return')}
                        disabled={submitting}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-primary-border bg-page hover:bg-primary-pale text-ink transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={13} className="text-primary" />
                        <span>Mark Return</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics / Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1 font-medium">
            <span>Total Requests</span>
            <Ticket size={15} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-ink">{stats.total}</p>
          <span className="text-[11px] text-ink-muted">In current portal view</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 mb-1 font-medium">
            <span>Pending HOD</span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800">{stats.pendingHOD}</p>
          <span className="text-[11px] text-ink-muted">Department endorsement</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-700 mb-1 font-medium">
            <span>Pending Principal</span>
            <Send size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-800">{stats.pendingPrincipal}</p>
          <span className="text-[11px] text-ink-muted">Awaiting final sanction</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1 font-medium">
            <span>Approved & Issued</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800">{stats.approved}</p>
          <span className="text-[11px] text-ink-muted">Officially sanctioned</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-purple-700 mb-1 font-medium">
            <span>My Issued Passes</span>
            <ShieldCheck size={15} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {stats.myPasses} <span className="text-xs font-normal text-ink-muted">Passes</span>
          </p>
          <span className="text-[11px] text-ink-muted">Sanctioned for campus exit</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-ink-muted" size={16} />
            <input
              type="text"
              placeholder="Search by employee name, ref no, department, or purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-card border border-primary-border bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-primary outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending HOD</option>
              <option value="Recommended">Pending Principal</option>
              <option value="Approved">Approved & Issued</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {(currentUser.role === 'Principal' || currentUser.role === 'Dean') && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-card border border-primary-border bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-primary outline-none"
              >
                <option value="All">All Departments</option>
                {options.departments.map((dept: string) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            {(searchQuery || statusFilter !== 'All' || deptFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setDeptFilter('All');
                }}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium flex items-center gap-1"
              >
                <RotateCcw size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Gate Pass Table */}
      <div className="bg-surface rounded-card border border-primary-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-ink-muted flex flex-col items-center justify-center gap-2">
            <Clock size={24} className="animate-spin text-primary" />
            <span>Loading employee gate passes...</span>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="p-12 text-center text-ink-muted space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Ticket size={24} />
            </div>
            <p className="text-base font-semibold text-ink">No gate passes found</p>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'All' || deptFilter !== 'All'
                ? 'No gate passes match your current filters. Try resetting them.'
                : 'No gate passes have been submitted yet. Click "Request Gate Pass" above to create one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-primary-border bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="py-3 px-4">Ref No & Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Timing (Out / In)</th>
                  <th className="py-3 px-4">Campus Presence</th>
                  <th className="py-3 px-4">HOD Sign</th>
                  <th className="py-3 px-4">Principal Sign</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-border/60">
                {filteredPasses.map((pass) => {
                  const canHodAct =
                    currentUser.role === 'HOD' &&
                    pass.status === 'Pending' &&
                    (pass.department === currentUser.department ||
                      pass.department_id === currentUser.department_id);
                  const canPrincipalAct =
                    currentUser.role === 'Principal' && (pass.status === 'Recommended' || pass.status === 'Pending');
                  const canCancel = pass.employee_id === currentUser.id && pass.status === 'Pending';

                  return (
                    <tr key={pass.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-primary block">{pass.ref_no}</span>
                        <span className="text-[11px] text-ink-muted block mt-0.5">
                          {new Date(pass.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">{pass.employee_name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-0.5">
                          <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 font-semibold">
                            {pass.department}
                          </span>
                          {pass.contact_phone && <span>• {pass.contact_phone}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs max-w-xs truncate" title={pass.purpose}>
                        <span className="text-ink font-medium">{pass.purpose}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-ink">
                          Out: <span className="font-mono text-rose-700">{pass.time_out}</span>
                        </div>
                        <div className="text-xs font-semibold text-ink mt-0.5">
                          In: <span className="font-mono text-emerald-700">{pass.time_in}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getMovementBadge(pass.movement_status, pass.actual_exit_at, pass.actual_return_at)}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {pass.hod_acted_at ? (
                          <div className="text-emerald-700 font-medium">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px]">
                              ✓ {pass.hod_name || 'HOD'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-muted italic text-[11px]">Awaiting HOD</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {pass.principal_acted_at && pass.status === 'Approved' ? (
                          <div className="text-blue-700 font-medium">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[11px]">
                              ★ Sanctioned
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-muted italic text-[11px]">Awaiting Sanction</span>
                        )}
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(pass.status)}</td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedPass(pass);
                            setIsBlankPrint(false);
                            setPassModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-primary-border hover:bg-primary-pale text-ink transition-colors"
                          title="View & Print Official Gate Pass"
                        >
                          View Pass
                        </button>

                        {/* Movement Action (Mark Exit / Mark Return) */}
                        {pass.movement_status === 'outside' ? (
                          <button
                            onClick={() => handleMovement(pass.id, 'return')}
                            disabled={submitting}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
                            title="Confirm return to campus"
                          >
                            Mark Return
                          </button>
                        ) : (
                          (pass.employee_id === currentUser.id || currentUser.role === 'Principal' || currentUser.role === 'HOD') && (
                            <button
                              onClick={() => handleMovement(pass.id, 'exit')}
                              disabled={submitting}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-600 transition-colors shadow-2xs"
                              title="Mark exit from premises & alert Principal"
                            >
                              Mark Exit
                            </button>
                          )
                        )}

                        {/* Principal Quick Sanction Action */}
                        {currentUser.role === 'Principal' && pass.status !== 'Approved' && (
                          <button
                            onClick={() => handleQuickApprove(pass.id, pass.employee_name)}
                            disabled={submitting}
                            className="px-2.5 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition-colors shadow-2xs inline-flex items-center gap-1"
                            title="Instant 1-Click Principal Sanction"
                          >
                            <Zap size={11} className="fill-current text-amber-300" />
                            <span>Quick Sanction</span>
                          </button>
                        )}

                        {/* HOD Actions */}
                        {canHodAct && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPass(pass);
                                setDecisionAction('Recommend');
                                setDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
                            >
                              Recommend
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPass(pass);
                                setDecisionAction('Reject');
                                setDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Principal Actions */}
                        {canPrincipalAct && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPass(pass);
                                setDecisionAction('Approve');
                                setDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPass(pass);
                                setDecisionAction('Reject');
                                setDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Employee Cancel */}
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(pass)}
                            className="px-2 py-1 rounded-md text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Cancel Request"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* EXACT GATE PASS MODAL & PRINT VIEW (MATCHING IMAGE 2)                 */}
      {/* ==================================================================== */}
      {passModalOpen && (
        <Modal
          title={isBlankPrint ? 'Blank Employee Gate Pass' : `Employee Gate Pass — ${selectedPass?.ref_no}`}
          onClose={() => setPassModalOpen(false)}
          wide
        >
          {/* Printable CSS Hook */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #gate-pass-print-area, #gate-pass-print-area * {
                visibility: visible !important;
              }
              #gate-pass-print-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 16px !important;
                box-shadow: none !important;
                border: 2px solid black !important;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
            }
          ` }} />

          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Official Physical Document Format</span>
                {selectedPass && getStatusBadge(selectedPass.status)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-black font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={14} />
                  <span>Print Gate Pass</span>
                </button>
              </div>
            </div>

            {/* EXACT DOCUMENT CONTAINER MATCHING IMAGE 2 */}
            <div
              id="gate-pass-print-area"
              className="bg-white text-black p-5 sm:p-7 border-2 border-black rounded-sm shadow-md font-sans max-w-3xl mx-auto"
            >
              {/* Institution Header Block */}
              <div className="flex items-center gap-4 border-b-2 border-black pb-3">
                {/* College Seal Logo */}
                <div className="shrink-0 w-20 h-20 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="SLRTCE Seal"
                    className="w-18 h-18 object-contain"
                  />
                </div>

                {/* Header Typography */}
                <div className="flex-1 text-center">
                  <p className="text-[11px] sm:text-xs font-medium text-black tracking-normal">
                    Shree Rahul Education Society's (Regd.)
                  </p>
                  <h1 className="text-lg sm:text-2xl font-serif font-black tracking-tight uppercase leading-tight text-black mt-0.5">
                    SHREE L. R. TIWARI COLLEGE OF ENGINEERING
                  </h1>
                  <p className="text-[11px] sm:text-xs font-semibold text-black mt-0.5">
                    An Autonomous Institute Affiliated to University of Mumbai,
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-black leading-tight mt-0.5">
                    Approved by AICTE & DTE, Maharashtra State | NAAC Accredited, NBA Accredited Programs | ISO 9001:2015 Certified |
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-black leading-tight mt-0.5">
                    DTE Code No: 3423 | Recognized under Section 2(f) of the UGC Act 1956 | Minority Status (Hindi Linguistic)
                  </p>
                </div>
              </div>

              {/* Title Bar: EMPLOYEE GATE PASS */}
              <div className="border-x-2 border-b-2 border-black bg-[#f1f3f5] text-center py-1.5">
                <h2 className="text-lg sm:text-2xl font-serif font-black tracking-wider uppercase text-black">
                  EMPLOYEE GATE PASS
                </h2>
              </div>

              {/* Table Form Content Grid */}
              <table className="w-full border-collapse border-x-2 border-b-2 border-black text-black">
                <tbody>
                  {/* Row 1: Date & Department */}
                  <tr className="border-b-2 border-black">
                    <td className="w-1/2 p-2.5 sm:p-3 border-r-2 border-black align-top">
                      <div className="flex items-center gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Date:-</span>
                        <span className="font-sans font-semibold pl-1 text-black">
                          {isBlankPrint ? '' : selectedPass?.date}
                        </span>
                      </div>
                    </td>
                    <td className="w-1/2 p-2.5 sm:p-3 align-top">
                      <div className="flex items-center gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Department:-</span>
                        <span className="font-sans font-semibold pl-1 text-black">
                          {isBlankPrint ? '' : selectedPass?.department}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 2: Name of the Employee */}
                  <tr className="border-b-2 border-black">
                    <td colSpan={2} className="p-2.5 sm:p-3 align-top">
                      <div className="flex items-center gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Name of the Employee:-</span>
                        <span className="font-sans font-semibold pl-1 uppercase text-black">
                          {isBlankPrint ? '' : selectedPass?.employee_name}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: Purpose */}
                  <tr className="border-b-2 border-black">
                    <td colSpan={2} className="p-2.5 sm:p-3 align-top min-h-[50px]">
                      <div className="flex items-start gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Purpose:-</span>
                        <span className="font-sans font-medium pl-1 text-black break-words leading-snug">
                          {isBlankPrint ? '' : selectedPass?.purpose}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 4: Time Out & Time In */}
                  <tr className="border-b-2 border-black">
                    <td className="w-1/2 p-2.5 sm:p-3 border-r-2 border-black align-top">
                      <div className="flex items-center gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Time Out:-</span>
                        <span className="font-mono font-semibold pl-1 text-black">
                          {isBlankPrint ? '' : selectedPass?.time_out}
                        </span>
                      </div>
                    </td>
                    <td className="w-1/2 p-2.5 sm:p-3 align-top">
                      <div className="flex items-center gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Time In:-</span>
                        <span className="font-mono font-semibold pl-1 text-black">
                          {isBlankPrint ? '' : selectedPass?.time_in}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 5: Sign of HOD & Principal Sign */}
                  <tr>
                    {/* Sign of HOD */}
                    <td className="w-1/2 p-2.5 sm:p-3 border-r-2 border-black align-top h-28 sm:h-32">
                      <div className="flex flex-col justify-between h-full font-bold">
                        <span className="font-serif text-sm sm:text-base">Sign of HOD:-</span>

                        {!isBlankPrint && selectedPass?.hod_acted_at ? (
                          <div className="border border-dashed border-emerald-700 bg-emerald-50/50 p-1.5 rounded text-center my-auto">
                            <span className="text-[10px] font-bold text-emerald-800 tracking-wider block">
                              ✓ ENDORSED & RECOMMENDED
                            </span>
                            <span className="text-xs font-semibold text-emerald-950 block">
                              {selectedPass.hod_name || 'Department HOD'}
                            </span>
                            <span className="text-[9px] text-emerald-700 font-mono block">
                              {new Date(selectedPass.hod_acted_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <div className="text-center pt-8 text-[11px] text-slate-400 italic font-normal">
                            (Physical signature / stamp)
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Principal Sign */}
                    <td className="w-1/2 p-2.5 sm:p-3 align-top h-28 sm:h-32">
                      <div className="flex flex-col justify-between h-full font-bold">
                        <span className="font-serif text-sm sm:text-base">Principal Sign:-</span>

                        {!isBlankPrint && selectedPass?.principal_acted_at && selectedPass.status === 'Approved' ? (
                          <div className="border border-dashed border-blue-700 bg-blue-50/50 p-1.5 rounded text-center my-auto">
                            <span className="text-[10px] font-bold text-blue-800 tracking-wider block">
                              ★ OFFICIALLY SANCTIONED
                            </span>
                            <span className="text-xs font-semibold text-blue-950 block">
                              {selectedPass.principal_name || 'Dr Prof Umesh Bhadade (Principal)'}
                            </span>
                            <span className="text-[9px] text-blue-700 font-mono block">
                              {new Date(selectedPass.principal_acted_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <div className="text-center pt-8 text-[11px] text-slate-400 italic font-normal">
                            (Physical signature / stamp)
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Reference & Security Code Footer */}
              {!isBlankPrint && selectedPass && (
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Ref: {selectedPass.ref_no}</span>
                  <span>Issued: {new Date(selectedPass.created_at).toLocaleDateString('en-IN')}</span>
                  <span>Docworm Institutional Security Verification</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => setPassModalOpen(false)}
                className={btnGhost}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className={btnPrimary}
              >
                <Printer size={15} />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* REQUEST GATE PASS MODAL                                              */}
      {/* ==================================================================== */}
      {applyModalOpen && (
        <Modal title="Request Employee Gate Pass" onClose={() => setApplyModalOpen(false)} wide>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="p-3 bg-primary-pale/40 border border-primary/20 rounded-xl flex items-start gap-2.5 text-xs text-ink-muted">
              <Ticket size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">
                  Gate Pass Request for: {currentUser.name} ({currentUser.department || 'SLRTCE'})
                </p>
                <p>
                  Submit this pass to obtain official institutional approval before exiting the campus during college working hours.
                </p>
              </div>
            </div>

            {/* Row 1: Start Date (Single date only) & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-ink-muted mt-0.5 block">Recorded movement date (single date only; no multi-day gate pass)</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Department *</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className={inputCls}
                >
                  {options.departments.map((dept: string) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Name of Employee (Readonly) */}
            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Name of the Employee</label>
              <input
                type="text"
                disabled
                value={currentUser.name}
                className={`${inputCls} bg-slate-50 text-slate-700 font-medium`}
              />
            </div>

            {/* Row 3: Purpose */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink block">Purpose of Leaving Campus *</label>
                <span className="text-[11px] text-ink-muted">State official/personal reason</span>
              </div>
              <textarea
                rows={2}
                required
                placeholder="e.g. Official University work at Fort Campus / Bank transaction for departmental event..."
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className={inputCls}
              />

              {/* Quick Purpose Tag Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-ink-muted flex items-center gap-1 font-medium mr-1">
                  <Sparkles size={12} className="text-primary" /> Quick Presets:
                </span>
                {PURPOSE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm({ ...form, purpose: preset })}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-primary-border hover:bg-primary-pale hover:text-primary transition-colors text-ink-muted"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Timing (Start Timing & End Timing) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Start Timing (Time Out / Departure) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 01:30 PM"
                  value={form.time_out}
                  onChange={(e) => setForm({ ...form, time_out: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">Recorded time leaving campus</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">End Timing (Expected Return) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 04:30 PM"
                  value={form.time_in}
                  onChange={(e) => setForm({ ...form, time_in: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">Expected return timing (same day)</span>
              </div>
            </div>

            {/* Mobile / Phone Direct Upload */}
            <div className="p-3 bg-primary-pale/30 border border-primary/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <UploadCloud size={14} className="text-primary" />
                  <span>Upload from Phone (Duty Slip / Letter / Photo)</span>
                </label>
                <span className="text-[10px] text-ink-muted">Optional</span>
              </div>
              <p className="text-[11px] text-ink-muted">
                You can capture a photo directly from your smartphone camera or upload a file from your device.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="mobileDutyProof"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedFileName(file.name);
                    }
                  }}
                  className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
                />
                {uploadedFileName && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
                    <Check size={12} /> {uploadedFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Contact Phone During Absence</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-primary-border">
              <button type="button" onClick={() => setApplyModalOpen(false)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={btnPrimary}>
                {submitting ? 'Submitting...' : 'Submit Gate Pass Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* DECISION MODAL (HOD RECOMMEND OR PRINCIPAL APPROVE)                  */}
      {/* ==================================================================== */}
      {decisionModalOpen && selectedPass && (
        <Modal
          title={
            currentUser.role === 'HOD'
              ? `${decisionAction === 'Recommend' ? 'Recommend & Endorse' : 'Reject'} Gate Pass`
              : `${decisionAction === 'Approve' ? 'Approve & Sanction' : 'Reject'} Gate Pass`
          }
          onClose={() => setDecisionModalOpen(false)}
        >
          <form onSubmit={handleDecision} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <p>
                <span className="font-semibold text-slate-700">Ref No:</span>{' '}
                <span className="font-mono text-primary font-bold">{selectedPass.ref_no}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Employee:</span> {selectedPass.employee_name} (
                {selectedPass.department})
              </p>
              <p>
                <span className="font-semibold text-slate-700">Date & Timings:</span> {selectedPass.date} | Out:{' '}
                <span className="font-mono text-rose-700 font-semibold">{selectedPass.time_out}</span> &rarr; In:{' '}
                <span className="font-mono text-emerald-700 font-semibold">{selectedPass.time_in}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Stated Purpose:</span> {selectedPass.purpose}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                {currentUser.role === 'HOD' ? 'HOD Endorsement Remarks' : 'Principal Sanction Order / Remarks'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  decisionAction === 'Recommend'
                    ? 'e.g. Verified. Official work endorsed and recommended to Principal.'
                    : decisionAction === 'Approve'
                    ? 'e.g. Sanctioned. Gate pass issued for campus exit.'
                    : 'Specify reason for rejection...'
                }
                value={decisionRemark}
                onChange={(e) => setDecisionRemark(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-primary-border">
              <button type="button" onClick={() => setDecisionModalOpen(false)} className={btnGhost}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={
                  decisionAction === 'Reject'
                    ? 'px-4 py-2 rounded-card text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                    : btnPrimary
                }
              >
                {submitting ? 'Recording...' : `Confirm ${decisionAction}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
