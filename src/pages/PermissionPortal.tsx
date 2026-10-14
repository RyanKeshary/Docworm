import React, { useMemo, useState } from 'react';
import {
  FileText, Plus, CheckCircle2, XCircle, Clock,
  Search, Printer, User, ShieldCheck, Building2,
  Calendar, MapPin, Users, X, Send, Check
} from 'lucide-react';
import { useData, nowStr } from '../store';
import { Badge, btnGhost, btnPrimary, inputCls } from '../components';
import type { Proposal } from '../types';

export function PermissionPortal() {
  const {
    proposals, saveProposals, currentUser, setCurrentUserId, users,
    letterhead, pushNotification, pushAudit
  } = useData();

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested'>('All');
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [letterProposal, setLetterProposal] = useState<Proposal | null>(null);

  // Decision Modal for Principal
  const [decidingProposal, setDecidingProposal] = useState<Proposal | null>(null);
  const [decisionAction, setDecisionAction] = useState<'Approved' | 'Rejected' | 'Changes Requested'>('Approved');
  const [decisionRemark, setDecisionRemark] = useState('');

  // New Request Form State
  const [formData, setFormData] = useState({
    eventName: '',
    department: currentUser.department || 'IT',
    organizingBody: 'Department of IT',
    startDate: new Date(Date.now() + 864e5 * 3).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 864e5 * 3).toISOString().slice(0, 10),
    startTime: '10:00',
    endTime: '16:00',
    venue: 'Seminar Hall 1',
    participants: 100,
    purpose: '',
    budgetAmount: '',
    budgetFunding: 'College Budget Head',
  });

  const isPrincipal = currentUser.role === 'Principal';

  // Statistics
  const stats = useMemo(() => {
    const total = proposals.length;
    const pending = proposals.filter((p) => ['Submitted', 'Under Review', 'Pending'].includes(p.status)).length;
    const approved = proposals.filter((p) => p.status === 'Approved').length;
    const rejected = proposals.filter((p) => p.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [proposals]);

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Status filter
      if (statusFilter === 'Pending') {
        if (!['Submitted', 'Under Review', 'Pending'].includes(p.status)) return false;
      } else if (statusFilter !== 'All') {
        if (p.status !== statusFilter) return false;
      }

      // Department filter
      if (deptFilter && !p.departments.includes(deptFilter) && p.submitterDept !== deptFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          p.eventName.toLowerCase().includes(q) ||
          p.refNo.toLowerCase().includes(q) ||
          p.submitterName.toLowerCase().includes(q) ||
          p.purpose.toLowerCase().includes(q) ||
          (p.departments || []).some((d) => d.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [proposals, statusFilter, deptFilter, searchQuery]);

  // Handle Create Permission Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventName.trim()) {
      alert('Please enter an event or activity title.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const acYear = `${currentYear}-${String(currentYear + 1).slice(2)}`;
    const count = proposals.length + 1;
    const refNo = `SLRTCE/${formData.department}/PERM/${acYear}-${String(count).padStart(3, '0')}`;

    const newProposal: Proposal = {
      id: `p-${Date.now().toString(36)}`,
      refNo,
      academicYear: acYear,
      dateOfRequest: new Date().toISOString().slice(0, 10),
      eventName: formData.eventName.trim(),
      eventCategory: 'Institutional Event',
      organizingBody: formData.organizingBody,
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      purpose: formData.purpose.trim() || 'Requesting institutional permission and hall facility for event conduct.',
      audience: ['Students', 'Faculty'],
      departments: [formData.department],
      years: ['All Years'],
      participants: Number(formData.participants) || 50,
      resources: [
        {
          id: `r-${Date.now().toString(36)}`,
          resourceType: 'Venue / Hall',
          roomNo: formData.venue,
          ownerDept: formData.department,
          date: formData.startDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          status: 'Pending',
        },
      ],
      hasBudget: Boolean(formData.budgetAmount && Number(formData.budgetAmount) > 0),
      budgetHead: formData.budgetFunding,
      openingBalance: 0,
      budgetItems: formData.budgetAmount ? [{ id: 'b1', item: 'Event Logistics & Refreshments', category: 'Event', quantity: 1, unitCost: Number(formData.budgetAmount) }] : [],
      budgetJustification: formData.budgetAmount ? `Estimated budget of Rs. ${formData.budgetAmount} requested for event conduct.` : '',
      poMappings: [],
      attachments: [],
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      submitterDept: formData.department,
      status: 'Submitted',
      approvalChain: [
        { id: 's-hod', role: 'HOD', userId: '', userName: 'Department Head', action: 'Approved', actedAt: nowStr(), remark: 'Endorsed for Principal Sanction' },
        { id: 's-prin', role: 'Principal', userId: '', userName: 'Principal Office', action: 'Pending' },
      ],
      createdAt: nowStr(),
      updatedAt: nowStr(),
    };

    saveProposals([newProposal, ...proposals]);

    // Push notification to Principal
    pushNotification({
      userId: 'u-principal',
      title: 'New Permission Request Submitted',
      body: `${formData.eventName} submitted by ${currentUser.name} (${formData.department})`,
      link: `/proposals/${newProposal.id}`,
    });

    pushAudit({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: `Submitted permission request ${refNo} for "${formData.eventName}"`,
      entity: 'Proposal',
      entityId: newProposal.id,
    });

    setIsNewModalOpen(false);
    // Reset form
    setFormData((prev) => ({
      ...prev,
      eventName: '',
      purpose: '',
      budgetAmount: '',
    }));
  };

  // Handle Principal Decision
  const handlePrincipalDecision = () => {
    if (!decidingProposal) return;
    if (decisionAction !== 'Approved' && !decisionRemark.trim()) {
      alert('A remark is required when requesting changes or rejecting.');
      return;
    }

    const updated = {
      ...decidingProposal,
      status: decisionAction,
      updatedAt: nowStr(),
      approvalChain: decidingProposal.approvalChain.map((step) => {
        if (step.role === 'Principal') {
          return {
            ...step,
            action: decisionAction,
            actedAt: nowStr(),
            remark: decisionRemark.trim() || 'Sanctioned by Principal',
            userId: currentUser.id,
            userName: currentUser.name,
          };
        }
        return step;
      }),
      resources: decidingProposal.resources.map((r) => ({
        ...r,
        status: (decisionAction === 'Approved' ? 'Approved' : decisionAction === 'Rejected' ? 'Rejected' : 'Pending') as 'Approved' | 'Rejected' | 'Pending',
        decidedBy: currentUser.name,
        decidedAt: nowStr(),
        remark: decisionRemark.trim(),
      })),
    };

    saveProposals(proposals.map((p) => (p.id === decidingProposal.id ? updated : p)));

    pushNotification({
      userId: decidingProposal.submitterId,
      title: `Permission ${decisionAction}: ${decidingProposal.refNo}`,
      body: `${decidingProposal.eventName} was ${decisionAction.toLowerCase()} by Principal. ${decisionRemark ? `Remark: "${decisionRemark}"` : ''}`,
      link: `/proposals/${decidingProposal.id}`,
    });

    pushAudit({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: `${decisionAction} request ${decidingProposal.refNo} with remark: ${decisionRemark || 'Official Sanction'}`,
      entity: 'Proposal',
      entityId: decidingProposal.id,
    });

    setDecidingProposal(null);
    setDecisionRemark('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Dynamic Role Switcher & Context Bar */}
      <div className="bg-white border border-primary-border/80 rounded-card p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Institutional Permission Portal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink mt-0.5">
            Event & Activity Permission Requests
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            {isPrincipal
              ? 'Principal Sanction Desk: Review incoming requests, evaluate venues & budgets, and issue official sanctions.'
              : 'Faculty Desk: Submit activity permission requests for Principal sanction and download official permission letters.'}
          </p>
        </div>

        {/* Quick Role Toggle Bar */}
        <div className="flex items-center gap-2 bg-page p-1.5 rounded-xl border border-primary-border self-start md:self-center">
          <span className="text-xs font-medium text-ink-muted px-2 hidden sm:inline">Active Mode:</span>
          <button
            onClick={() => {
              const fac = users.find((u) => u.role === 'Faculty');
              if (fac) setCurrentUserId(fac.id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !isPrincipal
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <User size={13} />
            <span>Faculty (Submitter)</span>
          </button>
          <button
            onClick={() => {
              const prin = users.find((u) => u.role === 'Principal');
              if (prin) setCurrentUserId(prin.id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPrincipal
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Principal (Approver)</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('All')}
          className={`p-4 rounded-card border transition-all cursor-pointer bg-white ${
            statusFilter === 'All'
              ? 'border-primary ring-1 ring-primary/30 shadow-xs'
              : 'border-primary-border hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>Total Requests</span>
            <FileText size={16} className="text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">{stats.total}</div>
          <span className="text-[11px] text-ink-muted">All submissions</span>
        </div>

        <div
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 rounded-card border transition-all cursor-pointer bg-white ${
            statusFilter === 'Pending'
              ? 'border-amber-400 ring-1 ring-amber-400/30 shadow-xs'
              : 'border-primary-border hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
            <span>Pending Sanction</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{stats.pending}</div>
          <span className="text-[11px] text-amber-600 font-medium">Awaiting decision</span>
        </div>

        <div
          onClick={() => setStatusFilter('Approved')}
          className={`p-4 rounded-card border transition-all cursor-pointer bg-white ${
            statusFilter === 'Approved'
              ? 'border-emerald-400 ring-1 ring-emerald-400/30 shadow-xs'
              : 'border-primary-border hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Approved / Sanctioned</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.approved}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Letters issued</span>
        </div>

        <div
          onClick={() => setStatusFilter('Rejected')}
          className={`p-4 rounded-card border transition-all cursor-pointer bg-white ${
            statusFilter === 'Rejected'
              ? 'border-rose-400 ring-1 ring-rose-400/30 shadow-xs'
              : 'border-primary-border hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Rejected / Clarify</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700">{stats.rejected}</div>
          <span className="text-[11px] text-rose-600 font-medium">Needs revision</span>
        </div>
      </div>

      {/* Action & Filter Controls */}
      <div className="bg-white border border-primary-border rounded-card p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1 sm:pb-0">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  statusFilter === tab
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-page'
                }`}
              >
                {tab === 'All' ? 'All Requests' : tab}
              </button>
            ))}
          </div>

          {/* New Request Button */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className={`${btnPrimary} shrink-0 justify-center`}
          >
            <Plus size={16} />
            <span>New Permission Request</span>
          </button>
        </div>

        {/* Search & Department Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-primary-border/60">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-ink-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title, coordinator, venue, or ref..."
              className={`${inputCls} pl-9 py-1.5 text-xs`}
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className={`${inputCls} sm:w-48 py-1.5 text-xs`}
          >
            <option value="">All Departments</option>
            {['IT', 'CMPN', 'EXTC', 'ECS', 'MECH', 'CIVIL', 'HAS', 'Cultural', 'Sports'].map((d) => (
              <option key={d} value={d}>Dept of {d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests Grid / Cards List */}
      {filteredProposals.length === 0 ? (
        <div className="bg-white border border-dashed border-primary-border rounded-card p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary-pale text-primary flex items-center justify-center mb-3">
            <FileText size={22} />
          </div>
          <h3 className="font-semibold text-ink text-base">No Permission Requests Found</h3>
          <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'All' || deptFilter
              ? 'No requests match your current filters. Try resetting the search or filter.'
              : 'No permission requests submitted yet. Click "New Permission Request" to create the first request.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {(searchQuery || statusFilter !== 'All' || deptFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setDeptFilter('');
                }}
                className={btnGhost}
              >
                Clear Filters
              </button>
            )}
            <button onClick={() => setIsNewModalOpen(true)} className={btnPrimary}>
              <Plus size={15} /> Create Request
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredProposals.map((p) => {
            const isPending = ['Submitted', 'Under Review', 'Pending'].includes(p.status);
            const isApproved = p.status === 'Approved';
            const principalStep = p.approvalChain.find((s) => s.role === 'Principal');

            return (
              <div
                key={p.id}
                className="bg-white border border-primary-border rounded-card p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Ref & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-primary bg-primary-pale px-2 py-0.5 rounded border border-primary-border">
                      {p.refNo}
                    </span>
                    <Badge text={p.status} />
                  </div>

                  {/* Title & Department */}
                  <h3 className="text-base font-bold text-ink mt-2.5 line-clamp-2">
                    {p.eventName}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Organized by <span className="font-medium text-ink">{p.organizingBody || `Dept of ${p.submitterDept}`}</span> • Submitter: <span className="text-ink">{p.submitterName}</span>
                  </p>

                  {/* Event Particulars Pills */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar size={14} className="text-primary shrink-0" />
                      <span className="truncate">{p.startDate} ({p.startTime})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={14} className="text-primary shrink-0" />
                      <span className="truncate">{p.resources[0]?.roomNo || 'Main Auditorium'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users size={14} className="text-primary shrink-0" />
                      <span>{p.participants} Participants</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building2 size={14} className="text-primary shrink-0" />
                      <span>{p.hasBudget ? `Rs. ${p.budgetItems[0]?.unitCost || 'Allocated'}` : 'No Budget Needed'}</span>
                    </div>
                  </div>

                  {/* Purpose Snippet */}
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700">Purpose: </span>
                    {p.purpose}
                  </p>

                  {/* Principal Decision Remarks (if any) */}
                  {principalStep?.remark && (
                    <div className={`mt-3 p-2.5 rounded-lg text-xs border ${
                      isApproved ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}>
                      <span className="font-bold block">Principal Office Note ({principalStep.actedAt || 'Reviewed'}):</span>
                      <p className="italic mt-0.5">"{principalStep.remark}"</p>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLetterProposal(p)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark px-2.5 py-1.5 rounded-lg border border-primary-border bg-primary-pale hover:bg-primary-light transition-colors"
                      title="Preview and print official permission letter"
                    >
                      <Printer size={13} />
                      <span>Official Letter</span>
                    </button>
                    <button
                      onClick={() => setSelectedProposal(p)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Full Details
                    </button>
                  </div>

                  {/* Action buttons depending on role */}
                  {isPrincipal && isPending && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setDecidingProposal(p);
                          setDecisionAction('Approved');
                          setDecisionRemark('Sanctioned and approved for campus conduct.');
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => {
                          setDecidingProposal(p);
                          setDecisionAction('Rejected');
                          setDecisionRemark('');
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {!isPrincipal && isPending && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
                      Under Principal Review
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. NEW PERMISSION REQUEST MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-card border border-primary-border shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-ink text-base">New Permission Request</h2>
                <p className="text-xs text-ink-muted">Submit activity details to the Principal Office for sanction</p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:bg-primary-pale hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 overflow-y-auto space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Event / Activity Title *
                </label>
                <input
                  required
                  value={formData.eventName}
                  onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                  placeholder="e.g. AI & Robotics Hands-on Student Bootcamp"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Department / Cell
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, organizingBody: `Department of ${e.target.value}` })}
                    className={inputCls}
                  >
                    {['IT', 'CMPN', 'EXTC', 'ECS', 'MECH', 'CIVIL', 'HAS', 'Cultural Committee', 'Student Council'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Venue / Hall Needed
                  </label>
                  <select
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className={inputCls}
                  >
                    {['Seminar Hall 1', 'Seminar Hall 2', 'Main Auditorium', 'Lab 302 (IT)', 'Lab 405 (CMPN)', 'College Amphitheatre', 'Campus Ground'].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Expected Participants
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Budget Needed (Rs. optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000 (leave blank if 0)"
                    value={formData.budgetAmount}
                    onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Purpose & Event Overview
                </label>
                <textarea
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Explain the objectives, expected learning outcomes, and logistics..."
                  className={inputCls}
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className={btnGhost}
                >
                  Cancel
                </button>
                <button type="submit" className={btnPrimary}>
                  <Send size={15} />
                  <span>Submit for Principal Sanction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PRINCIPAL DECISION MODAL */}
      {decidingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-card border border-primary-border shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-ink text-base">
                {decisionAction === 'Approved' ? 'Approve Permission Request' : decisionAction === 'Rejected' ? 'Reject Permission Request' : 'Request Modifications'}
              </h3>
              <button onClick={() => setDecidingProposal(null)} className="p-1.5 rounded-lg text-ink-muted hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-slate-900">{decidingProposal.eventName}</p>
                <p className="text-slate-500">{decidingProposal.refNo} • {decidingProposal.submitterName} ({decidingProposal.submitterDept})</p>
                <p className="text-slate-600">Venue: {decidingProposal.resources[0]?.roomNo || 'Main Hall'} | Date: {decidingProposal.startDate}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Principal Decision Remark {decisionAction !== 'Approved' && '*'}
                </label>
                <textarea
                  rows={3}
                  value={decisionRemark}
                  onChange={(e) => setDecisionRemark(e.target.value)}
                  placeholder={
                    decisionAction === 'Approved'
                      ? 'e.g. Sanctioned. Ensure hall cleanup after session.'
                      : 'Please explain the reason for rejection or required changes...'
                  }
                  className={inputCls}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setDecidingProposal(null)} className={btnGhost}>Cancel</button>
                <button
                  onClick={handlePrincipalDecision}
                  className={`px-4 py-2 text-sm font-semibold rounded-card text-white shadow-xs ${
                    decisionAction === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : decisionAction === 'Rejected'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Confirm {decisionAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. OFFICIAL PRINTABLE PERMISSION LETTER MODAL */}
      {letterProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-card border border-primary-border shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-slate-50 print-hidden">
              <span className="font-semibold text-xs text-slate-700">Official Permission Letter Preview</span>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className={btnPrimary}>
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button onClick={() => setLetterProposal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Sheet */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-white text-ink text-sm leading-relaxed print-full">
              {/* College Header */}
              <div className="text-center border-b-2 border-primary pb-4 mb-5">
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-primary">
                  {letterhead.collegeName}
                </h2>
                <p className="text-xs text-slate-600 mt-1">{letterhead.address}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{letterhead.phone} • {letterhead.email}</p>
              </div>

              {/* Reference and Date Bar */}
              <div className="flex justify-between text-xs font-mono border-b border-gray-200 pb-2 mb-4">
                <span>Ref: <b>{letterProposal.refNo}</b></span>
                <span>Date: <b>{letterProposal.dateOfRequest}</b></span>
              </div>

              {/* Addressed to */}
              <div className="text-xs text-slate-800 space-y-0.5 mb-4">
                <p>To,</p>
                <p className="font-bold">The Principal,</p>
                <p>{letterhead.collegeName},</p>
                <p>Mira Road (East), Thane.</p>
              </div>

              {/* Subject */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-md font-bold text-xs text-slate-900 mb-4">
                Subject: Permission to organise "{letterProposal.eventName}" on {letterProposal.startDate}.
              </div>

              {/* Body */}
              <div className="text-xs text-slate-800 space-y-2 leading-relaxed">
                <p>Respected Sir,</p>
                <p>
                  The <b>{letterProposal.organizingBody || `Department of ${letterProposal.submitterDept}`}</b> hereby requests your kind permission to conduct an event titled <b>"{letterProposal.eventName}"</b> on campus.
                </p>
                <p>
                  <b>Event Details & Facilities Requested:</b>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>Date & Time:</b> {letterProposal.startDate} from {letterProposal.startTime} to {letterProposal.endTime}</li>
                  <li><b>Requested Venue:</b> {letterProposal.resources[0]?.roomNo || 'Main Auditorium'}</li>
                  <li><b>Expected Beneficiaries:</b> {letterProposal.participants} students/participants</li>
                  <li><b>Activity Purpose:</b> {letterProposal.purpose}</li>
                  {letterProposal.hasBudget && <li><b>Sanctioned Budget:</b> Rs. {letterProposal.budgetItems[0]?.unitCost || 0} ({letterProposal.budgetHead})</li>}
                </ul>
                <p className="mt-2">
                  Kindly grant permission and sanction the necessary campus infrastructure for the successful conduct of this activity.
                </p>
              </div>

              {/* Signature Blocks & Digital Approval Stamp */}
              <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-end text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{letterProposal.submitterName}</p>
                  <p className="text-slate-500">Event Coordinator, Dept of {letterProposal.submitterDept}</p>
                </div>

                <div className="text-right">
                  {letterProposal.status === 'Approved' ? (
                    <div className="border-2 border-emerald-600 bg-emerald-50/50 p-2 rounded-lg inline-block text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Digitally Approved & Sanctioned</span>
                      <span className="font-bold text-xs text-emerald-900 block mt-0.5">Principal Office</span>
                      <span className="text-[9px] text-emerald-700 block">{letterProposal.updatedAt}</span>
                    </div>
                  ) : letterProposal.status === 'Rejected' ? (
                    <div className="border-2 border-rose-500 bg-rose-50 p-2 rounded-lg inline-block text-center">
                      <span className="text-[10px] font-bold uppercase text-rose-700 block">Not Sanctioned</span>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 p-2 rounded-lg inline-block text-center text-slate-400">
                      <span className="text-[10px] block">Awaiting Principal Sanction</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FULL DETAILS MODAL */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-card border border-primary-border shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-ink text-base">{selectedProposal.eventName}</h3>
                <span className="font-mono text-xs text-slate-500">{selectedProposal.refNo}</span>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="p-1.5 rounded-lg text-ink-muted hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-slate-500">Current Status</span>
                <Badge text={selectedProposal.status} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date & Time</span>
                  <span className="font-semibold text-slate-800">{selectedProposal.startDate} ({selectedProposal.startTime} - {selectedProposal.endTime})</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Venue</span>
                  <span className="font-semibold text-slate-800">{selectedProposal.resources[0]?.roomNo || 'Main Auditorium'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Participants</span>
                  <span className="font-semibold text-slate-800">{selectedProposal.participants} Attendees</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Budget</span>
                  <span className="font-semibold text-slate-800">{selectedProposal.hasBudget ? `Rs. ${selectedProposal.budgetItems[0]?.unitCost || 0}` : 'None'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Purpose & Description</span>
                <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">{selectedProposal.purpose}</p>
              </div>

              {/* Approval Timeline */}
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1.5">Review History</span>
                <div className="space-y-1.5">
                  {selectedProposal.approvalChain.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800">{s.role} ({s.userName})</span>
                        {s.remark && <p className="text-[11px] text-slate-500 italic mt-0.5">"{s.remark}"</p>}
                      </div>
                      <Badge text={s.action} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const p = selectedProposal;
                    setSelectedProposal(null);
                    setLetterProposal(p);
                  }}
                  className={btnPrimary}
                >
                  <Printer size={14} /> Open Official Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
