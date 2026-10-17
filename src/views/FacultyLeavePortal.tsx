'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
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
  Paperclip,
  Printer,
  Download,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useData } from '../store';
import { api } from '../lib/api';
import type { FacultyLeave, LeaveType, LeaveStatus } from '../types';
import { Modal, btnPrimary, btnGhost, inputCls } from '../components';

const LEAVE_TYPES: { type: LeaveType; code: string; desc: string; badge: string }[] = [
  { type: 'Casual Leave', code: 'CL', desc: 'Short personal absence (max 3 days consecutive)', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'Medical Leave', code: 'ML', desc: 'Health / medical reasons (certificate recommended)', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  { type: 'On Duty (OD)', code: 'OD', desc: 'Official duties, conferences, university valuation', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'Earned Leave', code: 'EL', desc: 'Privilege leave for non-vacation staff', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'Compensatory Off', code: 'Comp-Off', desc: 'Against holiday or weekend duty worked', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export function FacultyLeavePortal() {
  const { currentUser, options } = useData();
  const [leaves, setLeaves] = useState<FacultyLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  // Modals
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<FacultyLeave | null>(null);
  const [decisionAction, setDecisionAction] = useState<'Recommend' | 'Approve' | 'Reject'>('Recommend');
  const [decisionRemark, setDecisionRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Application Form State
  const [form, setForm] = useState({
    leave_type: 'Casual Leave' as LeaveType,
    start_date: '',
    end_date: '',
    total_days: 1,
    is_half_day: false,
    half_day_session: 'Full Day' as 'Morning' | 'Afternoon' | 'Full Day',
    reason: '',
    alternate_faculty: '',
    lecture_adjustments: '',
    contact_phone: currentUser.phone || '',
    attachment_url: '',
  });

  // Calculate days when dates change
  useEffect(() => {
    if (!form.start_date) return;
    if (form.is_half_day) {
      setForm((prev) => ({ ...prev, end_date: prev.start_date, total_days: 0.5 }));
      return;
    }
    if (!form.end_date) {
      setForm((prev) => ({ ...prev, total_days: 1 }));
      return;
    }
    const d1 = new Date(form.start_date);
    const d2 = new Date(form.end_date);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setForm((prev) => ({ ...prev, total_days: diffDays > 0 ? diffDays : 1 }));
    }
  }, [form.start_date, form.end_date, form.is_half_day]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.leaves.list();
      setLeaves(res.leaves || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leave applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      if (typeFilter !== 'All' && l.leave_type !== typeFilter) return false;
      if (deptFilter !== 'All' && l.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = l.ref_no?.toLowerCase().includes(q);
        const matchesName = l.faculty_name?.toLowerCase().includes(q);
        const matchesReason = l.reason?.toLowerCase().includes(q);
        const matchesAlternate = l.alternate_faculty?.toLowerCase().includes(q);
        if (!matchesRef && !matchesName && !matchesReason && !matchesAlternate) return false;
      }
      return true;
    });
  }, [leaves, statusFilter, typeFilter, deptFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = leaves.length;
    const pendingHOD = leaves.filter((l) => l.status === 'Pending').length;
    const pendingPrincipal = leaves.filter((l) => l.status === 'Recommended').length;
    const approved = leaves.filter((l) => l.status === 'Approved').length;
    const rejected = leaves.filter((l) => l.status === 'Rejected').length;
    const myDaysTaken = leaves
      .filter((l) => l.faculty_id === currentUser.id && l.status === 'Approved')
      .reduce((sum, l) => sum + Number(l.total_days || 0), 0);

    return { total, pendingHOD, pendingPrincipal, approved, rejected, myDaysTaken };
  }, [leaves, currentUser.id]);

  // Handle Application Submit
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await api.leaves.create(form);
      setSuccessMsg('Leave application submitted successfully! It has been forwarded to the HOD.');
      setApplyModalOpen(false);
      // Reset form
      setForm({
        leave_type: 'Casual Leave',
        start_date: '',
        end_date: '',
        total_days: 1,
        is_half_day: false,
        half_day_session: 'Full Day',
        reason: '',
        alternate_faculty: '',
        lecture_adjustments: '',
        contact_phone: currentUser.phone || '',
        attachment_url: '',
      });
      await fetchLeaves();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Decision Submit (HOD Recommend/Reject or Principal Approve/Reject)
  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;
    try {
      setSubmitting(true);
      setError('');
      await api.leaves.decide(selectedLeave.id, {
        action: decisionAction,
        remark: decisionRemark,
      });
      setSuccessMsg(`Leave application ${selectedLeave.ref_no} has been ${decisionAction === 'Recommend' ? 'recommended to Principal' : decisionAction.toLowerCase() + 'ed'}.`);
      setDecisionModalOpen(false);
      setSelectedLeave(null);
      setDecisionRemark('');
      await fetchLeaves();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to record decision.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancel Leave
  const handleCancel = async (leave: FacultyLeave) => {
    if (!window.confirm(`Are you sure you want to cancel your leave application ${leave.ref_no}?`)) return;
    try {
      setSubmitting(true);
      await api.leaves.cancel(leave.id);
      setSuccessMsg(`Leave application ${leave.ref_no} cancelled.`);
      await fetchLeaves();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open('/api/export/csv/faculty_leaves', '_blank');
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'Pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock size={12} /> Pending HOD</span>;
      case 'Recommended':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Send size={12} /> Pending Principal</span>;
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12} /> Sanctioned</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle size={12} /> Rejected</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"><RotateCcw size={12} /> Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface p-6 rounded-card border border-primary-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary-pale text-primary border border-primary/20">
              <Calendar size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Faculty Leave Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted">
            Institutional leave workflow: Application &rarr; HOD Recommendation &rarr; Principal Final Sanction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className={btnGhost} title="Export CSV Report">
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          {(currentUser.role === 'Faculty' || currentUser.role === 'HOD') && (
            <button
              onClick={() => {
                setForm((prev) => ({ ...prev, contact_phone: currentUser.phone || '' }));
                setApplyModalOpen(true);
              }}
              className={btnPrimary}
            >
              <Plus size={16} />
              <span>Apply for Leave</span>
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
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-100 rounded text-rose-600"><X size={14} /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded text-emerald-700"><X size={14} /></button>
        </div>
      )}

      {/* Analytics / Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1 font-medium">
            <span>Total Requests</span>
            <Calendar size={15} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-ink">{stats.total}</p>
          <span className="text-[11px] text-ink-muted">In this view</span>
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
            <span>Approved & Granted</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800">{stats.approved}</p>
          <span className="text-[11px] text-ink-muted">Officially sanctioned</span>
        </div>

        <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-purple-700 mb-1 font-medium">
            <span>My Sanctioned Days</span>
            <User size={15} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.myDaysTaken} <span className="text-xs font-normal text-ink-muted">Days</span></p>
          <span className="text-[11px] text-ink-muted">Current academic year</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-4 rounded-card border border-primary-border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-ink-muted" size={16} />
            <input
              type="text"
              placeholder="Search by faculty name, ref no, or reason..."
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
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-card border border-primary-border bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-primary outline-none"
            >
              <option value="All">All Leave Types</option>
              <option value="Casual Leave">Casual Leave (CL)</option>
              <option value="Medical Leave">Medical Leave (ML)</option>
              <option value="On Duty (OD)">On Duty (OD)</option>
              <option value="Earned Leave">Earned Leave (EL)</option>
              <option value="Compensatory Off">Compensatory Off</option>
            </select>

            {(currentUser.role === 'Principal' || currentUser.role === 'Dean') && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-card border border-primary-border bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-primary outline-none"
              >
                <option value="All">All Departments</option>
                {options.departments.map((dept: string) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}

            {(searchQuery || statusFilter !== 'All' || typeFilter !== 'All' || deptFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setTypeFilter('All');
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

      {/* Main Leave Table */}
      <div className="bg-surface rounded-card border border-primary-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-ink-muted flex flex-col items-center justify-center gap-2">
            <Clock size={24} className="animate-spin text-primary" />
            <span>Loading faculty leave applications...</span>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-ink-muted space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Calendar size={24} />
            </div>
            <p className="text-base font-semibold text-ink">No leave applications found</p>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'All'
                ? 'No leave applications match your current filters. Try resetting them.'
                : 'No leaves have been submitted yet. Faculty members can click "Apply for Leave" above to create one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-primary-border bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="py-3 px-4">Ref No & Date</th>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration & Dates</th>
                  <th className="py-3 px-4">Substitute Faculty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-border/60">
                {filteredLeaves.map((leave) => {
                  const canHodAct = currentUser.role === 'HOD' && leave.status === 'Pending' &&
                    (leave.department === currentUser.department || leave.department_id === currentUser.department_id);
                  const canPrincipalAct = currentUser.role === 'Principal' && (leave.status === 'Recommended' || leave.status === 'Pending');
                  const canFacultyCancel = (leave.faculty_id === currentUser.id && leave.status === 'Pending');

                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-primary block">{leave.ref_no}</span>
                        <span className="text-[11px] text-ink-muted block mt-0.5">
                          {new Date(leave.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">{leave.faculty_name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-0.5">
                          <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 font-semibold">{leave.department}</span>
                          {leave.faculty_phone && <span>• {leave.contact_phone || leave.faculty_phone}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-pale text-primary border border-primary/20">
                          {leave.leave_type}
                        </span>
                        {leave.is_half_day && (
                          <span className="block text-[10px] text-amber-700 font-medium mt-1">
                            Half Day ({leave.half_day_session})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-ink">
                          {leave.start_date} {leave.start_date !== leave.end_date && `→ ${leave.end_date}`}
                        </div>
                        <div className="text-[11px] text-ink-muted font-semibold mt-0.5">
                          {leave.total_days} {leave.total_days === 1 ? 'Day' : 'Days'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {leave.alternate_faculty ? (
                          <span className="text-ink font-medium">{leave.alternate_faculty}</span>
                        ) : (
                          <span className="text-ink-muted italic">Not specified</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(leave.status)}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedLeave(leave);
                            setDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-primary-border hover:bg-primary-pale text-ink transition-colors"
                        >
                          View
                        </button>

                        {/* HOD Actions */}
                        {canHodAct && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
                                setDecisionAction('Recommend');
                                setDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
                            >
                              Recommend
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
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
                                setSelectedLeave(leave);
                                setDecisionAction('Approve');
                                setDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
                                setDecisionAction('Reject');
                                setDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Faculty Cancel */}
                        {canFacultyCancel && (
                          <button
                            onClick={() => handleCancel(leave)}
                            className="px-2 py-1 rounded-md text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Cancel Application"
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

      {/* Apply for Leave Modal */}
      {applyModalOpen && (
        <Modal title="Faculty Leave Application" onClose={() => setApplyModalOpen(false)} wide>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="p-3 bg-primary-pale/40 border border-primary/20 rounded-xl flex items-start gap-2.5 text-xs text-ink-muted">
              <Calendar size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">Application for: {currentUser.name} ({currentUser.department || 'SLRTCE'})</p>
                <p>Ensure that all lectures and lab sessions during your absence are adjusted with colleague faculty before submitting.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Leave Type *</label>
                <select
                  required
                  value={form.leave_type}
                  onChange={(e) => setForm({ ...form, leave_type: e.target.value as LeaveType })}
                  className={inputCls}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>{t.type} ({t.code})</option>
                  ))}
                </select>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  {LEAVE_TYPES.find((t) => t.type === form.leave_type)?.desc}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Contact Phone During Leave *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Dates & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">From Date *</label>
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">To Date *</label>
                <input
                  type="date"
                  required
                  disabled={form.is_half_day}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Total Duration</label>
                <div className="h-9 flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{form.total_days}</span>
                  <span className="text-xs font-medium text-slate-600">{form.total_days === 1 ? 'Day' : 'Days'}</span>
                </div>
              </div>

              <div className="sm:col-span-3 flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_half_day}
                    onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Half Day Leave</span>
                </label>

                {form.is_half_day && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-600">Session:</label>
                    <select
                      value={form.half_day_session}
                      onChange={(e) => setForm({ ...form, half_day_session: e.target.value as any })}
                      className="text-xs rounded border border-slate-300 px-2 py-1 bg-white"
                    >
                      <option value="Morning">Morning Session (Pre-lunch)</option>
                      <option value="Afternoon">Afternoon Session (Post-lunch)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Alternate Faculty & Adjustments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Substitute / Alternate Faculty *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. R. Kulkarni"
                  value={form.alternate_faculty}
                  onChange={(e) => setForm({ ...form, alternate_faculty: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-ink-muted mt-1 block">Colleague taking charge of urgent tasks</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Supporting Document URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={form.attachment_url}
                  onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-ink-muted mt-1 block">Medical certificate / duty invite letter link</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Lecture & Lab Adjustments Details</label>
              <textarea
                rows={2}
                placeholder="e.g. Mon 10-11 AM: BE IT Cloud Computing taken by Prof. Sharma; Tue 2-4 PM: SE IT Lab swapped with Prof. Patil."
                value={form.lecture_adjustments}
                onChange={(e) => setForm({ ...form, lecture_adjustments: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Reason for Leave *</label>
              <textarea
                rows={3}
                required
                placeholder="State the reason for leave clearly..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-primary-border">
              <button type="button" onClick={() => setApplyModalOpen(false)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={btnPrimary}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Decision Modal (HOD Recommend or Principal Approve) */}
      {decisionModalOpen && selectedLeave && (
        <Modal
          title={
            currentUser.role === 'HOD'
              ? `${decisionAction === 'Recommend' ? 'Recommend' : 'Reject'} Leave Application`
              : `${decisionAction === 'Approve' ? 'Approve & Sanction' : 'Reject'} Leave Application`
          }
          onClose={() => setDecisionModalOpen(false)}
        >
          <form onSubmit={handleDecision} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p><span className="font-semibold text-slate-700">Ref No:</span> <span className="font-mono text-primary font-bold">{selectedLeave.ref_no}</span></p>
              <p><span className="font-semibold text-slate-700">Faculty:</span> {selectedLeave.faculty_name} ({selectedLeave.department})</p>
              <p><span className="font-semibold text-slate-700">Type & Duration:</span> {selectedLeave.leave_type} — {selectedLeave.total_days} Days ({selectedLeave.start_date} to {selectedLeave.end_date})</p>
              <p><span className="font-semibold text-slate-700">Reason:</span> {selectedLeave.reason}</p>
              {selectedLeave.alternate_faculty && (
                <p><span className="font-semibold text-slate-700">Substitute Faculty:</span> {selectedLeave.alternate_faculty}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                {currentUser.role === 'HOD' ? 'HOD Remarks & Recommendation Notes' : 'Principal Sanction Remarks'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  decisionAction === 'Recommend'
                    ? 'e.g. Lectures adjusted. Recommended to Principal for sanction.'
                    : decisionAction === 'Approve'
                    ? 'e.g. Sanctioned and approved.'
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

      {/* Details View Modal */}
      {detailModalOpen && selectedLeave && (
        <Modal title={`Leave Application Dossier: ${selectedLeave.ref_no}`} onClose={() => setDetailModalOpen(false)} wide>
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-2">
              <div>
                <span className="font-mono text-sm font-bold text-primary">{selectedLeave.ref_no}</span>
                <p className="text-base font-bold text-ink mt-0.5">{selectedLeave.faculty_name}</p>
                <p className="text-xs text-ink-muted">Department: {selectedLeave.department} • Applied on {new Date(selectedLeave.created_at).toLocaleString('en-IN')}</p>
              </div>
              <div>{getStatusBadge(selectedLeave.status)}</div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-surface border border-primary-border rounded-lg">
                <span className="text-ink-muted block mb-1">Leave Type</span>
                <span className="font-semibold text-ink text-sm">{selectedLeave.leave_type}</span>
              </div>

              <div className="p-3 bg-surface border border-primary-border rounded-lg">
                <span className="text-ink-muted block mb-1">Total Duration</span>
                <span className="font-semibold text-ink text-sm">{selectedLeave.total_days} {selectedLeave.total_days === 1 ? 'Day' : 'Days'}</span>
                {selectedLeave.is_half_day && <span className="text-[10px] text-amber-700 block">({selectedLeave.half_day_session})</span>}
              </div>

              <div className="p-3 bg-surface border border-primary-border rounded-lg">
                <span className="text-ink-muted block mb-1">Start Date</span>
                <span className="font-semibold text-ink text-sm">{selectedLeave.start_date}</span>
              </div>

              <div className="p-3 bg-surface border border-primary-border rounded-lg">
                <span className="text-ink-muted block mb-1">End Date</span>
                <span className="font-semibold text-ink text-sm">{selectedLeave.end_date}</span>
              </div>
            </div>

            {/* Substitution & Adjustments */}
            <div className="p-4 bg-surface border border-primary-border rounded-xl space-y-2 text-xs">
              <h3 className="font-semibold text-ink text-sm flex items-center gap-1.5">
                <User size={15} className="text-primary" /> Alternate Faculty & Lecture Adjustments
              </h3>
              <p><span className="font-semibold text-ink">In-charge Faculty:</span> {selectedLeave.alternate_faculty || 'None specified'}</p>
              <p><span className="font-semibold text-ink">Emergency Contact:</span> {selectedLeave.contact_phone || 'None provided'}</p>
              {selectedLeave.lecture_adjustments && (
                <div className="mt-2 pt-2 border-t border-primary-border/60">
                  <span className="font-semibold text-ink block mb-1">Lecture Swaps / Lab Schedule:</span>
                  <p className="text-ink-muted bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {selectedLeave.lecture_adjustments}
                  </p>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="p-4 bg-surface border border-primary-border rounded-xl space-y-1.5 text-xs">
              <h3 className="font-semibold text-ink text-sm flex items-center gap-1.5">
                <FileText size={15} className="text-primary" /> Stated Reason
              </h3>
              <p className="text-ink whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedLeave.reason}
              </p>
              {selectedLeave.attachment_url && (
                <div className="pt-2">
                  <a
                    href={selectedLeave.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <Paperclip size={13} /> View Attached Supporting Document &rarr;
                  </a>
                </div>
              )}
            </div>

            {/* Institutional Approval Chain Timeline */}
            <div className="p-4 bg-surface border border-primary-border rounded-xl space-y-3">
              <h3 className="font-semibold text-ink text-sm">Approval Chain & Institutional Sanction</h3>
              <div className="relative pl-6 border-l-2 border-primary/20 space-y-4 text-xs">
                {/* Step 1: Submitter */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[9px]">
                    ✓
                  </div>
                  <p className="font-semibold text-ink">Submitted by {selectedLeave.faculty_name}</p>
                  <p className="text-[11px] text-ink-muted">{new Date(selectedLeave.created_at).toLocaleString('en-IN')}</p>
                </div>

                {/* Step 2: HOD */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                    selectedLeave.hod_acted_at ? 'bg-primary' : 'bg-slate-300'
                  }`}>
                    {selectedLeave.hod_acted_at ? '✓' : '2'}
                  </div>
                  <p className="font-semibold text-ink">
                    HOD Review ({selectedLeave.department})
                  </p>
                  {selectedLeave.hod_acted_at ? (
                    <div>
                      <p className="text-[11px] text-ink-muted">Endorsed by {selectedLeave.hod_name || 'HOD'} on {new Date(selectedLeave.hod_acted_at).toLocaleString('en-IN')}</p>
                      {selectedLeave.hod_remark && (
                        <p className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 mt-1 italic text-slate-700">
                          Remark: "{selectedLeave.hod_remark}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700">Pending HOD recommendation</p>
                  )}
                </div>

                {/* Step 3: Principal */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                    selectedLeave.principal_acted_at ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}>
                    {selectedLeave.principal_acted_at ? '✓' : '3'}
                  </div>
                  <p className="font-semibold text-ink">Principal Final Sanction</p>
                  {selectedLeave.principal_acted_at ? (
                    <div>
                      <p className="text-[11px] text-ink-muted">Sanctioned by {selectedLeave.principal_name || 'Principal'} on {new Date(selectedLeave.principal_acted_at).toLocaleString('en-IN')}</p>
                      {selectedLeave.principal_remark && (
                        <p className="text-[11px] bg-emerald-50 p-2 rounded border border-emerald-200 mt-1 italic text-emerald-800">
                          Sanction Order: "{selectedLeave.principal_remark}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink-muted">Awaiting final sanction</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setDetailModalOpen(false)} className={btnGhost}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
