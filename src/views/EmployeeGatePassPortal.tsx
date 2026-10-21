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
  ArrowRightLeft,
  Crown,
  Eye,
  Trash2,
  BarChart3,
  Users,
  TrendingUp,
  Building2,
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

function formatTimeTo24h(val: string): string {
  if (!val) return '';
  const match = val.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '';
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = match[3]?.toUpperCase();
  if (ampm) {
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  }
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

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
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<EmployeeGatePass | null>(null);
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null);
  const [decisionAction, setDecisionAction] = useState<'Recommend' | 'Approve' | 'Reject'>('Recommend');
  const [decisionRemark, setDecisionRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isBlankPrint, setIsBlankPrint] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Principal Summary Report Filters
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('All');

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
      setGatePasses((prev) => {
        if (
          prev.length === list.length &&
          prev.every(
            (p, i) =>
              p.id === list[i].id &&
              p.status === list[i].status &&
              p.updated_at === list[i].updated_at &&
              p.movement_status === list[i].movement_status
          )
        ) {
          return prev;
        }
        return list;
      });
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

    // 45-second heartbeat polling for ultra-reliable fallback
    const interval = setInterval(() => {
      fetchPasses(true);
    }, 45000);

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

  // User-wise summary data computed for Principal
  const userSummaries = useMemo(() => {
    if (currentUser.role !== 'Principal') return [];

    const map = new Map<string, {
      userId: string;
      name: string;
      department: string;
      total: number;
      approved: number;
      pending: number;
      rejected: number;
      cancelled: number;
      currentlyOutside: boolean;
      lastDate: string;
      lastPurpose: string;
      passes: EmployeeGatePass[];
    }>();

    for (const pass of gatePasses) {
      const key = pass.employee_id || pass.employee_name || 'unknown';
      let entry = map.get(key);
      if (!entry) {
        entry = {
          userId: pass.employee_id,
          name: pass.employee_name || 'Staff Member',
          department: pass.department || 'General',
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
          currentlyOutside: false,
          lastDate: pass.date,
          lastPurpose: pass.purpose || '',
          passes: [],
        };
        map.set(key, entry);
      }
      entry.total += 1;
      if (pass.status === 'Approved') entry.approved += 1;
      else if (pass.status === 'Pending' || pass.status === 'Recommended') entry.pending += 1;
      else if (pass.status === 'Rejected') entry.rejected += 1;
      else if (pass.status === 'Cancelled') entry.cancelled += 1;

      if (pass.movement_status === 'outside') {
        entry.currentlyOutside = true;
      }
      if (new Date(pass.date) >= new Date(entry.lastDate)) {
        entry.lastDate = pass.date;
        entry.lastPurpose = pass.purpose || '';
      }
      entry.passes.push(pass);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [gatePasses, currentUser.role]);

  // Active selected employee summary for drilldown audit
  const activeUserSummary = useMemo(() => {
    if (!selectedUserKey) return null;
    return userSummaries.find((u) => (u.userId || u.name) === selectedUserKey) || null;
  }, [selectedUserKey, userSummaries]);

  // Filtered user summaries based on search and department
  const filteredUserSummaries = useMemo(() => {
    return userSummaries.filter((u) => {
      if (userDeptFilter !== 'All' && u.department !== userDeptFilter) return false;
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q);
      }
      return true;
    });
  }, [userSummaries, userDeptFilter, userSearchQuery]);

  // Department-wise usage breakdown
  const departmentUsage = useMemo(() => {
    const map = new Map<string, { total: number; approved: number; outside: number }>();
    for (const p of gatePasses) {
      const dept = p.department || 'General';
      const cur = map.get(dept) || { total: 0, approved: 0, outside: 0 };
      cur.total += 1;
      if (p.status === 'Approved') cur.approved += 1;
      if (p.movement_status === 'outside') cur.outside += 1;
      map.set(dept, cur);
    }
    return Array.from(map.entries())
      .map(([dept, data]) => ({ dept, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [gatePasses]);

  // Export User Summary CSV
  const handleExportUserSummaryCSV = () => {
    if (userSummaries.length === 0) return;
    const headers = ['Employee Name', 'Department', 'Total Passes', 'Approved & Issued', 'Pending', 'Rejected', 'Cancelled', 'Currently Outside', 'Last Gate Pass Date'];
    const rows = userSummaries.map((u) => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.department.replace(/"/g, '""')}"`,
      u.total,
      u.approved,
      u.pending,
      u.rejected,
      u.cancelled,
      u.currentlyOutside ? 'Yes (Outside Campus)' : 'No',
      `"${u.lastDate}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SLRTCE_Gate_Pass_User_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Permanently Delete Specific Gate Pass (Principal Only)
  const handleDeletePass = async (pass: EmployeeGatePass) => {
    if (!window.confirm(`Permanently delete gate pass ${pass.ref_no} for ${pass.employee_name}?\n\nThis will completely erase this record from the database.`)) return;
    try {
      setSubmitting(true);
      setError('');
      await api.gatePasses.deletePermanent(pass.id);
      setSuccessMsg(`Gate pass ${pass.ref_no} permanently deleted.`);
      realtime.broadcastLocal({ type: 'gate_passes_updated', action: 'delete', timestamp: new Date().toISOString() });
      await fetchPasses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete gate pass.');
    } finally {
      setSubmitting(false);
    }
  };

  // Permanently Delete All Gate Passes (Principal Only)
  const handleDeleteAllPasses = async () => {
    const confirmWipe = window.prompt(
      '⚠️ CRITICAL: You are about to permanently delete ALL employee gate passes across the entire institution.\n\nType DELETE to confirm:'
    );
    if (confirmWipe !== 'DELETE') return;
    try {
      setSubmitting(true);
      setError('');
      await api.gatePasses.deleteAll();
      setSuccessMsg('All employee gate passes have been permanently deleted.');
      realtime.broadcastLocal({ type: 'gate_passes_updated', action: 'delete_all', timestamp: new Date().toISOString() });
      await fetchPasses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete all gate passes.');
    } finally {
      setSubmitting(false);
    }
  };

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

  // Quick 1-Click Approve for Principal or Dean
  const handleQuickApprove = async (passId: string, employeeName: string) => {
    try {
      setSubmitting(true);
      setError('');
      const remark = `Instant Real-Time Sanction by ${currentUser.role} upon Exit`;
      await api.gatePasses.quickApprove(passId, remark);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs whitespace-nowrap">
            <Clock size={12} className="text-amber-600 shrink-0" />
            <span>Pending HOD</span>
          </span>
        );
      case 'Recommended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/90 shadow-2xs whitespace-nowrap">
            <Send size={12} className="text-blue-600 shrink-0" />
            <span>Pending Principal</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs whitespace-nowrap">
            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
            <span>Approved &amp; Issued</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/90 shadow-2xs whitespace-nowrap">
            <XCircle size={12} className="text-rose-600 shrink-0" />
            <span>Rejected</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs whitespace-nowrap">
            <RotateCcw size={12} className="text-slate-500 shrink-0" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  const getMovementBadge = (status?: 'inside' | 'outside' | 'returned', exitTime?: string, returnTime?: string) => {
    if (status === 'outside') {
      const exitFormatted = exitTime ? new Date(exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>Outside Premises</span>
          {exitFormatted && (
            <span className="font-mono text-[10px] bg-amber-200/90 px-1.5 py-0.2 rounded font-semibold text-amber-950">
              ({exitFormatted})
            </span>
          )}
        </span>
      );
    }
    if (status === 'returned') {
      const returnFormatted = returnTime ? new Date(returnTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs whitespace-nowrap">
          <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
          <span>Successfully Entered</span>
          {returnFormatted && (
            <span className="font-mono text-[10px] bg-emerald-200/90 px-1.5 py-0.2 rounded font-semibold text-emerald-950">
              ({returnFormatted})
            </span>
          )}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-900 border border-blue-200/90 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
        <span>Inside Campus</span>
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
          {currentUser.role === 'Principal' && (
            <>
              <button
                onClick={() => setSummaryModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Principal Confidential: View overall usage analytics and user-wise gate pass summaries"
              >
                <Crown size={15} className="text-amber-600 fill-amber-500" />
                <span>Executive Summary Report</span>
              </button>

              <button
                onClick={handleDeleteAllPasses}
                className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Principal Authority: Permanently delete all gate passes"
              >
                <Trash2 size={15} className="text-rose-600" />
                <span>Delete All Passes</span>
              </button>
            </>
          )}

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
                      {(currentUser.role === 'Principal' || currentUser.role === 'Dean') && pass.status !== 'Approved' && (
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
        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1 font-medium">
            <span>Total Requests</span>
            <Ticket size={15} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-ink">{stats.total}</p>
          <span className="text-[11px] text-ink-muted">In current portal view</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-amber-700 mb-1 font-medium">
            <span>Pending HOD</span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800">{stats.pendingHOD}</p>
          <span className="text-[11px] text-ink-muted">Department endorsement</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-blue-700 mb-1 font-medium">
            <span>Pending Principal</span>
            <Send size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-800">{stats.pendingPrincipal}</p>
          <span className="text-[11px] text-ink-muted">Awaiting final sanction</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1 font-medium">
            <span>Approved & Issued</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800">{stats.approved}</p>
          <span className="text-[11px] text-ink-muted">Officially sanctioned</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-sky-800 mb-1 font-medium">
            <span>My Issued Passes</span>
            <ShieldCheck size={15} className="text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-950">
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
      <div className="bg-surface rounded-2xl border border-primary-border shadow-xs overflow-hidden transition-all">
        {/* Table Toolbar Header */}
        <div className="px-5 py-4 border-b border-primary-border bg-gradient-to-r from-slate-50/90 via-blue-50/30 to-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-100/80 text-blue-800 border border-blue-200/80">
              <Ticket size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Institutional Gate Pass Register</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  {filteredPasses.length} {filteredPasses.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">
                Official exit permissions, real-time gate movements &amp; executive sanctions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/70 text-blue-900 text-[11px] font-medium shadow-2xs">
              <ArrowRightLeft size={12} className="text-blue-600 shrink-0" />
              <span>Scroll horizontally for full register &bull; Responsive layout</span>
            </span>
          </div>
        </div>

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
          <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-blue-200 hover:scrollbar-thumb-blue-300 scrollbar-track-slate-50/40">
            <table className="w-full min-w-[1260px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-primary-border bg-slate-50/95 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                  <th className="py-3.5 px-4 w-[150px] min-w-[150px] whitespace-nowrap">Ref No &amp; Date</th>
                  <th className="py-3.5 px-4 w-[210px] min-w-[210px] whitespace-nowrap">Employee</th>
                  <th className="py-3.5 px-4 w-[210px] min-w-[210px] whitespace-nowrap">Purpose</th>
                  <th className="py-3.5 px-4 w-[230px] min-w-[230px] whitespace-nowrap">Check-out / Check-in Timing</th>
                  <th className="py-3.5 px-4 w-[190px] min-w-[190px] whitespace-nowrap">Campus Presence</th>
                  <th className="py-3.5 px-4 w-[150px] min-w-[150px] whitespace-nowrap">HOD / Dean Sign</th>
                  <th className="py-3.5 px-4 w-[150px] min-w-[150px] whitespace-nowrap">Principal Sign</th>
                  <th className="py-3.5 px-4 w-[150px] min-w-[150px] whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 w-[180px] min-w-[180px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-border/60">
                {filteredPasses.map((pass) => {
                  const canHodAct =
                    (currentUser.role === 'HOD' || currentUser.role === 'Dean') &&
                    pass.status === 'Pending' &&
                    (currentUser.role === 'Dean' ||
                      pass.department === currentUser.department ||
                      pass.department_id === currentUser.department_id);
                  const canPrincipalAct =
                    (currentUser.role === 'Principal' || currentUser.role === 'Dean') && (pass.status === 'Recommended' || pass.status === 'Pending');
                  const canCancel = pass.employee_id === currentUser.id && pass.status === 'Pending';

                  const initials = (pass.employee_name || '')
                    .replace(/^(Mr\.|Mrs\.|Dr\.|Prof\.)\s*/i, '')
                    .slice(0, 2)
                    .toUpperCase() || 'EM';

                  return (
                    <tr key={pass.id} className="hover:bg-blue-50/40 transition-colors duration-150 group">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50/90 border border-blue-200/80 px-2.5 py-0.5 rounded-md inline-block shadow-2xs hover:bg-blue-100 transition-colors">
                            {pass.ref_no}
                          </span>
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <Calendar size={11} className="text-slate-400 shrink-0" />
                            {new Date(pass.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-sky-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-ink text-xs sm:text-sm group-hover:text-primary transition-colors">
                              {pass.employee_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-0.5">
                              <span className="inline-block px-1.5 py-0.2 rounded bg-blue-50 text-blue-900 border border-blue-100 font-bold text-[10px] tracking-wide">
                                {pass.department}
                              </span>
                              {pass.contact_phone && (
                                <span className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                                  <Phone size={9} className="text-slate-400" />
                                  {pass.contact_phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-[210px]" title={pass.purpose}>
                          <span className="text-xs font-medium text-ink line-clamp-2 block leading-relaxed">
                            {pass.purpose}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1.5 w-[210px]">
                          <div className="flex items-center justify-between gap-1.5 text-xs bg-rose-50/80 border border-rose-200/70 rounded-md px-2.5 py-1">
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-800 text-[11px]">
                              <ExitIcon size={12} className="text-rose-600 shrink-0" />
                              <span>Out:</span>
                              <span className="font-mono text-xs font-bold text-rose-700">{pass.time_out}</span>
                            </span>
                            {pass.actual_exit_at && (
                              <span className="text-[10px] font-semibold text-rose-900 bg-rose-100/90 px-1.5 py-0.2 rounded border border-rose-300/80">
                                Exit: {new Date(pass.actual_exit_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1.5 text-xs bg-emerald-50/80 border border-emerald-200/70 rounded-md px-2.5 py-1">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 text-[11px]">
                              <ReturnIcon size={12} className="text-emerald-600 shrink-0" />
                              <span>In:</span>
                              <span className="font-mono text-xs font-bold text-emerald-700">{pass.time_in}</span>
                            </span>
                            {pass.actual_return_at && (
                              <span className="text-[10px] font-semibold text-emerald-900 bg-emerald-100/90 px-1.5 py-0.2 rounded border border-emerald-300/80">
                                Entry: {new Date(pass.actual_return_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getMovementBadge(pass.movement_status, pass.actual_exit_at, pass.actual_return_at)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        {pass.hod_acted_at ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs shadow-2xs">
                            <Check size={12} className="text-emerald-600 stroke-[2.5]" />
                            <span>{pass.hod_name || 'HOD'}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 italic text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                            <Clock size={10} /> Awaiting HOD
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        {pass.principal_acted_at && pass.status === 'Approved' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-900 text-white border border-blue-950 font-semibold text-xs shadow-2xs">
                            <Crown size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                            <span>Sanctioned</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 italic text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                            <Clock size={10} /> Awaiting Sanction
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(pass.status)}</td>

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedPass(pass);
                            setIsBlankPrint(false);
                            setPassModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary-border bg-surface hover:bg-blue-50/70 hover:border-blue-300 text-ink transition-all shadow-2xs inline-flex items-center gap-1 active:scale-[0.98]"
                          title="View & Print Official Gate Pass"
                        >
                          <Eye size={12} className="text-blue-600" />
                          <span>View Pass</span>
                        </button>

                        {/* Movement Action (Mark Exit / Mark Return) */}
                        {pass.movement_status === 'outside' ? (
                          <button
                            onClick={() => handleMovement(pass.id, 'return')}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-2xs hover:shadow-xs inline-flex items-center gap-1 active:scale-[0.98]"
                            title="Confirm return to campus"
                          >
                            <ReturnIcon size={12} />
                            <span>Mark Return</span>
                          </button>
                        ) : (
                          (pass.employee_id === currentUser.id || currentUser.role === 'Principal' || currentUser.role === 'HOD') && (
                            <button
                              onClick={() => handleMovement(pass.id, 'exit')}
                              disabled={submitting}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-600 transition-all shadow-2xs hover:shadow-xs inline-flex items-center gap-1 active:scale-[0.98]"
                              title="Mark exit from premises & alert Principal"
                            >
                              <ExitIcon size={12} />
                              <span>Mark Exit</span>
                            </button>
                          )
                        )}

                        {/* Principal & Dean Quick Sanction Action */}
                        {(currentUser.role === 'Principal' || currentUser.role === 'Dean') && pass.status !== 'Approved' && (
                          <button
                            onClick={() => handleQuickApprove(pass.id, pass.employee_name)}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition-all shadow-2xs inline-flex items-center gap-1 active:scale-[0.98]"
                            title="Instant 1-Click Sanction"
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
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-all shadow-xs"
                            >
                              Recommend
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPass(pass);
                                setDecisionAction('Reject');
                                setDecisionModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
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
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPass(pass);
                                setDecisionAction('Reject');
                                setDecisionModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Employee Cancel */}
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(pass)}
                            className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Cancel Request"
                          >
                            Cancel
                          </button>
                        )}

                        {/* Principal Permanent Delete */}
                        {currentUser.role === 'Principal' && (
                          <button
                            onClick={() => handleDeletePass(pass)}
                            disabled={submitting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center"
                            title="Permanently Delete Gate Pass (Principal Only)"
                          >
                            <Trash2 size={13} />
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
                    alt="Shree L R Tiwari College of Engineering Seal"
                    className="w-18 h-18 object-contain"
                  />
                </div>

                {/* Header Typography */}
                <div className="flex-1 text-center">
                  <p className="text-[11px] sm:text-xs font-medium text-black tracking-normal">
                    Shree Rahul Education Society's (Regd.)
                  </p>
                  <h1 className="text-lg sm:text-2xl font-serif font-black tracking-tight uppercase leading-tight text-black mt-0.5">
                    SHREE L R TIWARI COLLEGE OF ENGINEERING
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

                  {/* Row 4: Scheduled Check-out & Check-in Timings */}
                  <tr className="border-b-2 border-black">
                    <td className="w-1/2 p-2.5 sm:p-3 border-r-2 border-black align-top">
                      <div className="flex items-center gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Check-out Timing (Time Out):-</span>
                        <span className="font-mono font-semibold pl-1 text-black">
                          {isBlankPrint ? '' : selectedPass?.time_out}
                        </span>
                      </div>
                    </td>
                    <td className="w-1/2 p-2.5 sm:p-3 align-top">
                      <div className="flex items-center gap-1 text-sm sm:text-base font-bold">
                        <span className="font-serif shrink-0">Check-in Timing (Time In):-</span>
                        <span className="font-mono font-semibold pl-1 text-black">
                          {isBlankPrint ? '' : selectedPass?.time_in}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 5: Actual Security Gate Timings */}
                  <tr className="border-b-2 border-black bg-slate-50/50">
                    <td className="w-1/2 p-2.5 sm:p-3 border-r-2 border-black align-top">
                      <div className="flex flex-col gap-0.5 text-xs sm:text-sm font-bold">
                        <div className="flex items-center gap-1">
                          <span className="font-serif shrink-0 text-slate-800">Actual Check-out (Gate Exit):-</span>
                          <span className="font-mono font-semibold pl-1 text-black">
                            {!isBlankPrint && selectedPass?.actual_exit_at
                              ? new Date(selectedPass.actual_exit_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : isBlankPrint ? '' : 'Not logged'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">Security Guard stamp / Departure log</span>
                      </div>
                    </td>
                    <td className="w-1/2 p-2.5 sm:p-3 align-top">
                      <div className="flex flex-col gap-0.5 text-xs sm:text-sm font-bold">
                        <div className="flex items-center gap-1">
                          <span className="font-serif shrink-0 text-slate-800">Actual Check-in (Gate Return):-</span>
                          <span className="font-mono font-semibold pl-1 text-black">
                            {!isBlankPrint && selectedPass?.actual_return_at
                              ? new Date(selectedPass.actual_return_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : isBlankPrint ? '' : 'Not logged'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">Security Guard stamp / Re-entry log</span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 5: Sign of HOD & Principal Sign */}
                  <tr>
                    {/* Sign of HOD */}
                    <td className="w-1/2 p-2.5 sm:p-3 border-r-2 border-black align-top h-28 sm:h-32">
                      <div className="flex flex-col justify-between h-full font-bold">
                        <span className="font-serif text-sm sm:text-base">Sign of HOD / Dean:-</span>

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

            {/* Row 4: Timing (Check-out & Check-in Timing) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gatepass-departure-time-picker" className="text-xs font-semibold text-slate-700 block mb-1">Check-out Timing (Departure / Out) *</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="gatepass-departure-time-picker"
                      aria-label="Departure time"
                      type="time"
                      value={formatTimeTo24h(form.time_out)}
                      className={`${inputCls} font-mono w-28 shrink-0`}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [h, m] = e.target.value.split(':');
                        const hour = parseInt(h, 10);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const formattedHour = (hour % 12 || 12).toString().padStart(2, '0');
                        setForm({ ...form, time_out: `${formattedHour}:${m} ${ampm}` });
                      }}
                    />
                    <input
                      id="gatepass-departure-details-text"
                      aria-label="Departure details"
                      type="text"
                      required
                      placeholder="e.g. 12:30 PM"
                      value={form.time_out}
                      onChange={(e) => setForm({ ...form, time_out: e.target.value })}
                      className={`${inputCls} font-semibold font-mono`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Scheduled departure / exit timing</span>
                </div>

                <div>
                  <label htmlFor="gatepass-return-time-picker" className="text-xs font-semibold text-slate-700 block mb-1">Check-in Timing (Expected Return / In) *</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="gatepass-return-time-picker"
                      aria-label="Return time"
                      type="time"
                      value={formatTimeTo24h(form.time_in)}
                      className={`${inputCls} font-mono w-28 shrink-0`}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [h, m] = e.target.value.split(':');
                        const hour = parseInt(h, 10);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const formattedHour = (hour % 12 || 12).toString().padStart(2, '0');
                        setForm({ ...form, time_in: `${formattedHour}:${m} ${ampm}` });
                      }}
                    />
                    <input
                      id="gatepass-return-details-text"
                      aria-label="Return details"
                      type="text"
                      required
                      placeholder="e.g. 03:30 PM"
                      value={form.time_in}
                      onChange={(e) => setForm({ ...form, time_in: e.target.value })}
                      className={`${inputCls} font-semibold font-mono`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Expected campus return timing</span>
                </div>
              </div>

              {/* Quick Timing Presets */}
              <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Quick Timing Presets:</span>
                {[
                  { label: '1 Hr (12:30 PM - 01:30 PM)', out: '12:30 PM', in: '01:30 PM' },
                  { label: '2 Hrs (01:00 PM - 03:00 PM)', out: '01:00 PM', in: '03:00 PM' },
                  { label: 'Afternoon (02:00 PM - 05:00 PM)', out: '02:00 PM', in: '05:00 PM' },
                  { label: 'Remaining Duty', out: '01:30 PM', in: '05:30 PM' },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm({ ...form, time_out: p.out, time_in: p.in })}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
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

      {/* ==================================================================== */}
      {/* PRINCIPAL EXECUTIVE SUMMARY REPORT MODAL                             */}
      {/* ==================================================================== */}
      {summaryModalOpen && currentUser.role === 'Principal' && (
        <Modal
          title="Gate Pass Executive Summary & Staff Usage Report"
          onClose={() => setSummaryModalOpen(false)}
          wide
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header / Export Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                    Confidential • Principal Audit
                  </span>
                  <span className="text-xs text-slate-300">
                    Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">Campus Movement & Employee Usage Overview</h3>
                <p className="text-xs text-slate-300">Real-time gate pass distribution and individual staff compliance audit.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportUserSummaryCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
                  title="Export complete user breakdown to CSV"
                >
                  <Download size={13} /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-sm"
                  title="Print this executive summary"
                >
                  <Printer size={13} /> Print Report
                </button>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl border border-primary-border bg-surface shadow-xs">
                <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
                  <span>Total Passes</span>
                  <Ticket size={14} className="text-primary" />
                </div>
                <div className="text-2xl font-bold text-ink mt-1.5">{stats.total}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">All-time applications</div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
                <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
                  <span>Approved</span>
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-800 mt-1.5">{stats.approved}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">
                  {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% approval rate
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
                <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
                  <span>Pending Action</span>
                  <Clock size={14} className="text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-800 mt-1.5">{stats.pendingHOD + stats.pendingPrincipal}</div>
                <div className="text-[11px] text-amber-600 mt-0.5">
                  {stats.pendingPrincipal} awaiting Principal
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 shadow-xs">
                <div className="flex items-center justify-between text-sky-700 text-xs font-medium">
                  <span>Outside Now</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                </div>
                <div className="text-2xl font-bold text-sky-800 mt-1.5">{stats.currentlyOutside}</div>
                <div className="text-[11px] text-sky-600 mt-0.5">Active campus exits</div>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 shadow-xs">
                <div className="flex items-center justify-between text-indigo-700 text-xs font-medium">
                  <span>Returned</span>
                  <RotateCcw size={14} className="text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-indigo-800 mt-1.5">{stats.returnedToday}</div>
                <div className="text-[11px] text-indigo-600 mt-0.5">Completed entries</div>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 shadow-xs">
                <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
                  <span>Rejected</span>
                  <XCircle size={14} className="text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-rose-800 mt-1.5">{stats.rejected}</div>
                <div className="text-[11px] text-rose-600 mt-0.5">
                  {stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}% rejected
                </div>
              </div>
            </div>

            {/* Department Usage Breakdown */}
            <div className="p-4 rounded-xl border border-primary-border bg-surface">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-primary" />
                <h4 className="text-sm font-bold text-ink">Department-wise Gate Pass Distribution</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {departmentUsage.map((d) => {
                  const pct = stats.total > 0 ? Math.round((d.total / stats.total) * 100) : 0;
                  return (
                    <div key={d.dept} className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate" title={d.dept}>{d.dept}</span>
                        <span className="text-xs font-bold text-primary bg-primary-pale px-2 py-0.5 rounded-md">
                          {d.total} passes ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span>Approved: <strong className="text-emerald-700">{d.approved}</strong></span>
                        {d.outside > 0 ? (
                          <span className="text-sky-700 font-semibold">{d.outside} outside</span>
                        ) : (
                          <span>0 outside</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual User Summary Section */}
            <div className="p-4 rounded-xl border border-primary-border bg-surface">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <h4 className="text-sm font-bold text-ink">Individual Staff Member Summaries</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {filteredUserSummaries.length} staff records
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Click "Audit Passes" on any staff member to view full movement logs.</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative w-48">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search staff..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-primary-border bg-surface text-ink outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {/* Dept filter */}
                  <select
                    value={userDeptFilter}
                    onChange={(e) => setUserDeptFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-primary-border bg-surface text-ink outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Departments</option>
                    {Array.from(new Set(userSummaries.map((u) => u.department))).map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredUserSummaries.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-muted border border-dashed border-slate-200 rounded-lg">
                  No staff gate pass records match the selected filter.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5">Staff Member</th>
                        <th className="px-3 py-2.5">Department</th>
                        <th className="px-3 py-2.5 text-center">Total Passes</th>
                        <th className="px-3 py-2.5 text-center">Approved</th>
                        <th className="px-3 py-2.5 text-center">Pending</th>
                        <th className="px-3 py-2.5 text-center">Rejected</th>
                        <th className="px-3 py-2.5">Current Status</th>
                        <th className="px-3 py-2.5">Last Gate Pass</th>
                        <th className="px-3 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUserSummaries.map((u) => (
                        <tr key={u.userId || u.name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-ink">
                            {u.name}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {u.department}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-ink">
                            {u.total}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {u.approved}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {u.pending > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                {u.pending}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {u.rejected > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                {u.rejected}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {u.currentlyOutside ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> Outside Campus
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                In Campus
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                            {u.lastDate ? new Date(u.lastDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedUserKey(u.userId || u.name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-primary-pale text-primary hover:bg-primary hover:text-white transition-colors"
                            >
                              <Eye size={12} /> Audit Passes ({u.total})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* PRINCIPAL DRILLDOWN MODAL: INDIVIDUAL USER'S PASSES                  */}
      {/* ==================================================================== */}
      {activeUserSummary && currentUser.role === 'Principal' && (
        <Modal
          title={`Staff Pass Audit — ${activeUserSummary.name} (${activeUserSummary.department})`}
          onClose={() => setSelectedUserKey(null)}
          wide
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{activeUserSummary.name}</h4>
                <p className="text-xs text-slate-500">Department: {activeUserSummary.department} • Total Recorded Passes: {activeUserSummary.passes.length}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserKey(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Back to Summary
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Ref No</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Timing</th>
                    <th className="px-3 py-2">Purpose</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Movement</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeUserSummary.passes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800">{p.ref_no}</td>
                      <td className="px-3 py-2 text-slate-600">{p.date}</td>
                      <td className="px-3 py-2 text-slate-600">{p.time_out} – {p.time_in}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={p.purpose}>{p.purpose}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {p.movement_status === 'outside' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-300">
                            Outside ({p.actual_exit_at ? new Date(p.actual_exit_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'})
                          </span>
                        ) : p.movement_status === 'returned' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            Returned ({p.actual_return_at ? new Date(p.actual_return_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed'})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Inside</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPass(p);
                            setIsBlankPrint(false);
                            setPassModalOpen(true);
                          }}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          View Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePass(p)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Permanently Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
