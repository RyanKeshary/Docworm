import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, CheckCircle2, XCircle, Clock,
  Search, Printer, ShieldCheck, Building2,
  Calendar, MapPin, Users, X, Send, Check, AlertCircle,
  Eye, RotateCcw, ChevronRight, Star, Layers, BookOpen, RefreshCw,
  Crown,
} from 'lucide-react';
import { useData, nowStr } from '../store';
import { Badge, btnGhost, btnPrimary, inputCls } from '../components';
import type { Proposal } from '../types';
import {
  ROLE_META, PERMISSIONS, canActOnProposal, buildApprovalChain,
  activeChainStep, getProposalsForRole, getRoleActionMeta,
} from '../lib/roleUtils';

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────
function RoleBanner({ role, label, description }: { role: string; label: string; description: string }) {
  const meta = ROLE_META[role as keyof typeof ROLE_META] ?? ROLE_META.Faculty;
  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} px-4 py-3 flex items-start gap-3`}>
      <span className="text-2xl">{meta.icon}</span>
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${meta.accent}`}>{label}</p>
        <p className="text-xs text-ink-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, color = 'blue', onClick, active,
}: {
  label: string; value: number | string; sub: string;
  color?: 'blue' | 'amber' | 'emerald' | 'rose' | 'violet';
  onClick?: () => void; active?: boolean;
}) {
  const colors = {
    blue: { text: 'text-primary', border: active ? 'border-primary ring-1 ring-primary/30' : 'border-primary-border hover:border-primary/40', sub: 'text-primary/70' },
    amber: { text: 'text-amber-700', border: active ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-primary-border hover:border-amber-300', sub: 'text-amber-600' },
    emerald: { text: 'text-emerald-700', border: active ? 'border-emerald-400 ring-1 ring-emerald-400/30' : 'border-primary-border hover:border-emerald-300', sub: 'text-emerald-600' },
    rose: { text: 'text-rose-700', border: active ? 'border-rose-400 ring-1 ring-rose-400/30' : 'border-primary-border hover:border-rose-300', sub: 'text-rose-600' },
    violet: { text: 'text-violet-700', border: active ? 'border-violet-400 ring-1 ring-violet-400/30' : 'border-primary-border hover:border-violet-300', sub: 'text-violet-600' },
  }[color];

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-card border transition-all bg-white ${colors.border} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`text-xs font-semibold ${colors.text}`}>{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${colors.text}`}>{value}</div>
      <div className={`text-[11px] font-medium ${colors.sub}`}>{sub}</div>
    </div>
  );
}

// Approval timeline pill
function ChainStatus({ chain }: { chain: Proposal['approvalChain'] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chain.map((step, idx) => {
        const isApproved = step.action === 'Approved';
        const isPending = step.action === 'Pending';
        const isRejected = step.action === 'Rejected' || step.action === 'Changes Requested';
        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isApproved ? <Check size={9} /> : isPending ? <Clock size={9} /> : <XCircle size={9} />}
              {step.role}
            </div>
            {idx < chain.length - 1 && <ChevronRight size={10} className="text-ink-muted shrink-0" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PORTAL
// ─────────────────────────────────────────────────────────────
export function PermissionPortal() {
  const {
    proposals, saveProposals, currentUser, setCurrentUserId, users,
    letterhead, pushNotification, pushAudit, getNextRefNumber,
  } = useData();

  const role = currentUser.role;
  const canCreate = PERMISSIONS.canCreateProposal(role);
  const canApprove = PERMISSIONS.canApproveProposals(role);
  const canViewAll = PERMISSIONS.canViewAllProposals(role);

  // ── Filters ──────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Mine' | 'Awaiting Me'>('All');
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Modals ────────────────────────────────────────────────
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [letterProposal, setLetterProposal] = useState<Proposal | null>(null);
  const [decidingProposal, setDecidingProposal] = useState<Proposal | null>(null);
  const [decisionAction, setDecisionAction] = useState<'Approved' | 'Rejected' | 'Changes Requested'>('Approved');
  const [decisionRemark, setDecisionRemark] = useState('');

  // ── New Request Form ──────────────────────────────────────
  const [formData, setFormData] = useState({
    eventName: '',
    department: currentUser.department || 'IT',
    organizingBody: `Department of ${currentUser.department || 'IT'}`,
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

  // ── Scoped proposals based on role ────────────────────────
  // - Principal & Dean: see ALL proposals across the institution (Dean oversees all departments/faculties, Principal sees all)
  // - HOD: sees EVERYTHING in their department (all faculty proposals, department activities)
  // - Faculty: sees only their own submissions
  const scopedProposals = useMemo(() => {
    return getProposalsForRole(proposals, currentUser);
  }, [proposals, currentUser]);

  // ── Derived stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const total = scopedProposals.length;
    const pending = scopedProposals.filter((p) => ['Submitted', 'Under Review'].includes(p.status)).length;
    const approved = scopedProposals.filter((p) => p.status === 'Approved').length;
    const rejected = scopedProposals.filter((p) => p.status === 'Rejected').length;
    const awaitingMe = canApprove
      ? scopedProposals.filter((p) => canActOnProposal(role, p.approvalChain)).length
      : 0;
    return { total, pending, approved, rejected, awaitingMe };
  }, [scopedProposals, canApprove, role]);

  // ── Filtered list ─────────────────────────────────────────
  const filteredProposals = useMemo(() => {
    let list = scopedProposals;

    // Status filter
    if (statusFilter === 'Pending') {
      list = list.filter((p) => ['Submitted', 'Under Review'].includes(p.status));
    } else if (statusFilter === 'Approved') {
      list = list.filter((p) => p.status === 'Approved');
    } else if (statusFilter === 'Rejected') {
      list = list.filter((p) => p.status === 'Rejected');
    } else if (statusFilter === 'Mine') {
      list = list.filter((p) => p.submitterId === currentUser.id);
    } else if (statusFilter === 'Awaiting Me') {
      list = list.filter((p) => canActOnProposal(role, p.approvalChain));
    }

    // Dept filter (available for Dean and Principal who oversee all departments)
    if (deptFilter && canViewAll) {
      const df = deptFilter.toLowerCase();
      list = list.filter((p) => (p.departments || []).some((d) => d.toLowerCase() === df) || p.submitterDept.toLowerCase() === df);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.eventName.toLowerCase().includes(q) ||
        p.refNo.toLowerCase().includes(q) ||
        p.submitterName.toLowerCase().includes(q) ||
        p.purpose.toLowerCase().includes(q) ||
        (p.departments || []).some((d) => d.toLowerCase().includes(q))
      );
    }

    return list;
  }, [scopedProposals, statusFilter, deptFilter, searchQuery, canViewAll, role, currentUser.id]);

  // ── Create proposal ───────────────────────────────────────
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventName.trim()) {
      alert('Please enter an event or activity title.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const acYear = `${currentYear}-${String(currentYear + 1).slice(2)}`;
    const propId = `p-${Date.now().toString(36)}`;
    const refNo = await getNextRefNumber(formData.department, 'PERM', acYear);

    // Build the full 3-step chain: HOD → Dean → Principal with unique step IDs
    const hodUser = users.find((u) => u.role === 'HOD' && u.department === formData.department)
      ?? users.find((u) => u.role === 'HOD');
    const deanUser = users.find((u) => u.role === 'Dean');
    const principalUser = users.find((u) => u.role === 'Principal');

    const chain = buildApprovalChain(hodUser, deanUser, principalUser, propId);

    const newProposal: Proposal = {
      id: propId,
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
          id: `${propId}-res-1`,
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
      budgetItems: formData.budgetAmount
        ? [{ id: `${propId}-b1`, item: 'Event Logistics & Refreshments', category: 'Event', quantity: 1, unitCost: Number(formData.budgetAmount) }]
        : [],
      budgetJustification: formData.budgetAmount
        ? `Estimated budget of Rs. ${formData.budgetAmount} requested for event conduct.`
        : '',
      poMappings: [],
      attachments: [],
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      submitterDept: formData.department,
      status: 'Submitted',
      approvalChain: chain,
      createdAt: nowStr(),
      updatedAt: nowStr(),
    };

    saveProposals([newProposal, ...proposals]);

    // Notify first reviewer (HOD)
    if (hodUser) {
      pushNotification({
        userId: hodUser.id,
        title: 'New Permission Request Awaiting Your Review',
        body: `${formData.eventName} submitted by ${currentUser.name} (${formData.department}) needs your review.`,
        link: `/proposals/${newProposal.id}`,
      });
    }

    pushAudit({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: `Submitted permission request ${refNo} for "${formData.eventName}"`,
      entity: 'Proposal',
      entityId: newProposal.id,
    });

    setIsNewModalOpen(false);
    setFormData((prev) => ({ ...prev, eventName: '', purpose: '', budgetAmount: '' }));
  };

  // ── Approver Decision (HOD / Dean / Principal) ────────────
  const handleDecision = () => {
    if (!decidingProposal) return;
    if (decisionAction !== 'Approved' && !decisionRemark.trim()) {
      alert('A remark is required when rejecting or requesting changes.');
      return;
    }

    const active = activeChainStep(decidingProposal.approvalChain);
    if (!active) return;

    const actionMeta = getRoleActionMeta(role);

    const updatedChain = decidingProposal.approvalChain.map((step) => {
      if (step.id === active.id) {
        return {
          ...step,
          action: decisionAction,
          actedAt: nowStr(),
          remark: decisionRemark.trim() || (decisionAction === 'Approved' ? actionMeta.defaultRemark : ''),
          userId: currentUser.id,
          userName: currentUser.name,
        };
      }
      return step;
    });

    // Determine overall status:
    // IMPORTANT: "the approval part stays with principal"
    // Only the Principal's sanction can make the overall proposal status 'Approved'!
    let overallStatus: Proposal['status'] = 'Under Review';
    if (decisionAction === 'Rejected') {
      overallStatus = 'Rejected';
    } else if (decisionAction === 'Changes Requested') {
      overallStatus = 'Changes Requested';
    } else {
      const remaining = updatedChain.filter((s) => s.action === 'Pending');
      if (remaining.length === 0 && role === 'Principal') {
        overallStatus = 'Approved'; // Final official approval
      } else {
        overallStatus = 'Under Review'; // Forwarded to next reviewer
      }
    }

    // Update resource status if fully approved by Principal
    const updatedResources = decidingProposal.resources.map((r) => ({
      ...r,
      status: (overallStatus === 'Approved'
        ? 'Approved'
        : overallStatus === 'Rejected'
        ? 'Rejected'
        : 'Pending') as 'Approved' | 'Rejected' | 'Pending',
      decidedBy: overallStatus === 'Approved' ? currentUser.name : r.decidedBy,
      decidedAt: overallStatus === 'Approved' ? nowStr() : r.decidedAt,
    }));

    const updated: Proposal = {
      ...decidingProposal,
      status: overallStatus,
      updatedAt: nowStr(),
      approvalChain: updatedChain,
      resources: updatedResources,
    };

    saveProposals(proposals.map((p) => (p.id === decidingProposal.id ? updated : p)));

    // Specific notifications per role
    const nextStep = updatedChain.find((s) => s.action === 'Pending');
    if (nextStep && decisionAction === 'Approved') {
      const nextUser = users.find((u) => u.id === nextStep.userId || u.role === nextStep.role);
      if (nextUser) {
        pushNotification({
          userId: nextUser.id,
          title: `Proposal Awaiting Review: ${decidingProposal.refNo}`,
          body: `${decidingProposal.eventName} ${role === 'HOD' ? 'endorsed by Department Head' : 'recommended by Dean'}. Needs your ${nextStep.role === 'Principal' ? 'final sanction' : 'review'}.`,
          link: `/proposals/${decidingProposal.id}`,
        });
      }
    } else if (decisionAction === 'Approved' && role === 'Principal') {
      // Final sanction complete — notify Faculty Coordinator & HOD
      pushNotification({
        userId: decidingProposal.submitterId,
        title: `Official Sanction Granted: ${decidingProposal.refNo}`,
        body: `Congratulations! ${decidingProposal.eventName} has received final official approval from the Principal. You can now download and print the signed letter.`,
        link: `/proposals/${decidingProposal.id}`,
      });
      const hodUser = users.find((u) => u.role === 'HOD' && u.department === decidingProposal.submitterDept);
      if (hodUser && hodUser.id !== currentUser.id) {
        pushNotification({
          userId: hodUser.id,
          title: `Event Sanctioned: ${decidingProposal.refNo}`,
          body: `${decidingProposal.eventName} from Dept of ${decidingProposal.submitterDept} was officially sanctioned by the Principal.`,
          link: `/proposals/${decidingProposal.id}`,
        });
      }
    } else {
      // Rejected or changes requested — notify submitter
      pushNotification({
        userId: decidingProposal.submitterId,
        title: `Permission ${decisionAction === 'Rejected' ? 'Rejected' : 'Changes Requested'}: ${decidingProposal.refNo}`,
        body: `${decidingProposal.eventName} was ${decisionAction === 'Rejected' ? 'rejected' : 'returned for changes'} by ${currentUser.name} (${role}).${decisionRemark ? ` Note: "${decisionRemark}"` : ''}`,
        link: `/proposals/${decidingProposal.id}`,
      });
    }

    pushAudit({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: `${role === 'Principal' ? 'Sanctioned' : role === 'Dean' ? 'Recommended' : 'Endorsed'} proposal ${decidingProposal.refNo} as ${role}: ${decisionRemark || 'Proceeding'}`,
      entity: 'Proposal',
      entityId: decidingProposal.id,
    });

    setDecidingProposal(null);
    setDecisionRemark('');
  };

  // ── Role-specific panel header ────────────────────────────
  const panelInfo = {
    Principal: { label: 'Principal Sanction Desk', desc: 'Final authority: issue official sanctions, view all departments, manage the institution.' },
    Dean: { label: 'Dean Review Panel', desc: 'Cross-department oversight: review endorsed proposals before Principal sanction.' },
    HOD: { label: 'HOD Department Panel', desc: 'Department authority: review submissions from your faculty before forwarding to Dean.' },
    Faculty: { label: 'Faculty Submission Desk', desc: 'Submit activity permission requests and track their approval status.' },
  }[role] ?? { label: 'Permission Portal', desc: '' };

  const meta = ROLE_META[role];

  // Tab options per role
  const tabs: { key: typeof statusFilter; label: string }[] = [
    { key: 'All', label: 'All' },
    ...(canApprove ? [{ key: 'Awaiting Me' as typeof statusFilter, label: `⚡ Awaiting Me (${stats.awaitingMe})` }] : []),
    { key: 'Pending', label: 'In Review' },
    { key: 'Approved', label: 'Approved' },
    { key: 'Rejected', label: 'Rejected' },
    ...(!canViewAll ? [{ key: 'Mine' as typeof statusFilter, label: 'My Submissions' }] : []),
  ];

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── TOP BANNER ──────────────────────────────────────── */}
      <div className={`border rounded-card p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badge}`}>
              <span>{meta.icon}</span> {role}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink mt-0.5">{panelInfo.label}</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">{panelInfo.desc}</p>
        </div>

        {/* Real institutional actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {role === 'Principal' && (
            <Link
              to="/settings?tab=leadership"
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Crown size={14} className="text-violet-600" />
              Manage Leadership & Faculty
              {users.filter((u) => u.status === 'pending_approval').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold ml-1 animate-pulse">
                  {users.filter((u) => u.status === 'pending_approval').length}
                </span>
              )}
            </Link>
          )}

          {canCreate && (
            <button
              onClick={() => {
                setFormData({
                  eventName: '',
                  department: currentUser.department || 'IT',
                  organizingBody: `Department of ${currentUser.department || 'IT'}`,
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
                setIsNewModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary-dark text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus size={15} />
              New Permission Request
            </button>
          )}
        </div>
      </div>

      {/* ── ROLE-SPECIFIC CONTEXT CARD ──────────────────────── */}
      <RoleContextCard role={role} stats={stats} proposals={proposals} currentUser={currentUser} />

      {/* ── STATS ROW ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Requests" value={stats.total} sub="Visible to you" color="blue"
          onClick={() => setStatusFilter('All')} active={statusFilter === 'All'} />
        <StatCard label="Awaiting Review" value={stats.pending} sub="In approval chain" color="amber"
          onClick={() => setStatusFilter('Pending')} active={statusFilter === 'Pending'} />
        <StatCard label="Approved / Sanctioned" value={stats.approved} sub="Letters issued" color="emerald"
          onClick={() => setStatusFilter('Approved')} active={statusFilter === 'Approved'} />
        <StatCard label="Rejected / Revise" value={canApprove ? stats.awaitingMe : stats.rejected}
          sub={canApprove ? 'Needs your action' : 'Needs revision'}
          color={canApprove ? 'violet' : 'rose'}
          onClick={() => setStatusFilter(canApprove ? 'Awaiting Me' : 'Rejected')}
          active={statusFilter === (canApprove ? 'Awaiting Me' : 'Rejected')} />
      </div>

      {/* ── FILTER & ACTION BAR ─────────────────────────────── */}
      <div className="bg-white border border-primary-border rounded-card p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1 sm:pb-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  statusFilter === t.key
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-page'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {canCreate && (
              <button onClick={() => setIsNewModalOpen(true)} className={`${btnPrimary} shrink-0`}>
                <Plus size={16} /> New Permission Request
              </button>
            )}
          </div>
        </div>

        {/* Search + Dept filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-primary-border/60">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-ink-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title, coordinator, ref no..."
              className={`${inputCls} pl-9 py-1.5 text-xs`}
            />
          </div>
          {canViewAll && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`${inputCls} sm:w-48 py-1.5 text-xs`}
            >
              <option value="">All Departments</option>
              {['IT', 'CMPN', 'EXTC', 'ECS', 'MECH', 'CIVIL', 'HAS'].map((d) => (
                <option key={d} value={d}>Dept of {d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── PROPOSALS GRID ──────────────────────────────────── */}
      {filteredProposals.length === 0 ? (
        <div className="bg-white border border-dashed border-primary-border rounded-card p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary-pale text-primary flex items-center justify-center mb-3">
            <FileText size={22} />
          </div>
          <h3 className="font-semibold text-ink text-base">No Permission Requests Found</h3>
          <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'All' || deptFilter
              ? 'No requests match your filters. Try resetting.'
              : canCreate
              ? 'No requests yet. Click "New Permission Request" to create your first.'
              : 'No requests available in your scope right now.'}
          </p>
          {(searchQuery || statusFilter !== 'All' || deptFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDeptFilter(''); }}
              className={`${btnGhost} mt-4 mx-auto`}
            >
              <RefreshCw size={14} /> Clear Filters
            </button>
          )}
          {canCreate && proposals.length === 0 && (
            <button onClick={() => setIsNewModalOpen(true)} className={`${btnPrimary} mt-4 mx-auto`}>
              <Plus size={15} /> Create Request
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredProposals.map((p) => {
            const isPending = ['Submitted', 'Under Review'].includes(p.status);
            const isApproved = p.status === 'Approved';
            const iCanAct = canActOnProposal(role, p.approvalChain);
            const isMySubmission = p.submitterId === currentUser.id;

            return (
              <div
                key={p.id}
                className={`bg-white border rounded-card p-5 hover:shadow-md transition-all flex flex-col justify-between ${
                  iCanAct ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-primary-border hover:border-primary/40'
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-primary bg-primary-pale px-2 py-0.5 rounded border border-primary-border">
                      {p.refNo}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {iCanAct && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-white rounded-full animate-pulse">
                          ACTION NEEDED
                        </span>
                      )}
                      <Badge text={p.status} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-ink mt-2.5 line-clamp-2">{p.eventName}</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    By <span className="font-medium text-ink">{p.submitterName}</span> •{' '}
                    <span className="text-ink">{p.organizingBody || `Dept of ${p.submitterDept}`}</span>
                  </p>

                  {/* Meta grid */}
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
                      <span>{p.hasBudget ? `Rs. ${p.budgetItems[0]?.unitCost || 0}` : 'No Budget'}</span>
                    </div>
                  </div>

                  {/* Approval chain visual */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100">
                    <p className="text-[10px] text-ink-muted uppercase font-semibold mb-1.5">Approval Flow</p>
                    <ChainStatus chain={p.approvalChain} />
                  </div>

                  {/* Purpose snippet */}
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700">Purpose: </span>{p.purpose}
                  </p>
                </div>

                {/* ── Card footer actions ── */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setLetterProposal(p)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark px-2.5 py-1.5 rounded-lg border border-primary-border bg-primary-pale hover:bg-primary-light transition-colors"
                      title="Print or view official permission letter"
                    >
                      <Printer size={13} /> Official Letter
                    </button>
                    <button
                      onClick={() => setSelectedProposal(p)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Eye size={12} className="inline mr-1" />Details
                    </button>
                  </div>

                  {/* Approver role-differentiated actions:
                      - Principal: "Sanction & Approve" (Final institutional authority)
                      - Dean: "Recommend to Principal" (Forwards)
                      - HOD: "Endorse to Dean" (Forwards)
                  */}
                  {canApprove && iCanAct && (
                    <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                      {role === 'Principal' ? (
                        <button
                          onClick={() => {
                            setDecidingProposal(p);
                            setDecisionAction('Approved');
                            setDecisionRemark('Sanctioned and approved by Principal Office. Permitted to proceed.');
                          }}
                          className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-700 hover:bg-violet-800 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
                          title="Final sanction: officially approves event and generates signed letter"
                        >
                          <Crown size={13} />
                          Sanction & Approve
                        </button>
                      ) : role === 'Dean' ? (
                        <button
                          onClick={() => {
                            setDecidingProposal(p);
                            setDecisionAction('Approved');
                            setDecisionRemark('Reviewed and recommended for Principal sanction.');
                          }}
                          className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
                          title="Recommend and forward to Principal Office for final sanction"
                        >
                          <Send size={13} />
                          Recommend to Principal
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setDecidingProposal(p);
                            setDecisionAction('Approved');
                            setDecisionRemark('Department verified and endorsed. Forwarding to Dean.');
                          }}
                          className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
                          title="Department clearance: endorse and forward to Dean"
                        >
                          <Send size={13} />
                          Endorse to Dean
                        </button>
                      )}

                      <button
                        onClick={() => { setDecidingProposal(p); setDecisionAction('Changes Requested'); setDecisionRemark(''); }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                        title="Request revisions from submitter"
                      >
                        Revise
                      </button>
                      <button
                        onClick={() => { setDecidingProposal(p); setDecisionAction('Rejected'); setDecisionRemark(''); }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Reject proposal"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Submitter status tag */}
                  {!canApprove && isPending && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium flex items-center gap-1">
                        <Clock size={11} /> Under Review
                      </span>
                      {isMySubmission && (
                        <button
                          onClick={() => {
                            if (window.confirm('Withdraw this request?')) {
                              saveProposals(proposals.filter((x) => x.id !== p.id));
                            }
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 underline font-medium"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  )}

                  {/* Review needed indicator */}
                  {canApprove && iCanAct && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                      ⚡ Action Required
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════ */}

      {/* 1. NEW REQUEST MODAL */}
      {isNewModalOpen && canCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-card border border-primary-border shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-ink text-base">New Permission Request</h2>
                <p className="text-xs text-ink-muted">Submit to the approval chain: HOD → Dean → Principal</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1.5 rounded-lg text-ink-muted hover:bg-primary-pale">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 overflow-y-auto space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Event / Activity Title *</label>
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Department / Cell *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, organizingBody: `Department of ${e.target.value}` })}
                    className={inputCls}
                    required
                  >
                    {[
                      'IT', 'CMPN', 'EXTC', 'ECS', 'MECH', 'CIVIL', 'HAS',
                      'Cultural Committee', 'Student Council', 'Sports Committee',
                      'E-Cell', 'NSS', 'Training & Placement', 'Rotaract Club', 'Technical Committee',
                    ].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Venue / Hall Needed</label>
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                  <input type="date" required value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Start Time</label>
                  <input type="time" value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">End Time</label>
                  <input type="time" value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Expected Participants</label>
                  <input type="number" min="5" max="1000" value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: Number(e.target.value) })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Budget Needed (Rs. optional)</label>
                  <input type="number" placeholder="e.g. 5000 (leave blank if none)"
                    value={formData.budgetAmount}
                    onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Purpose & Event Overview</label>
                <textarea rows={3} value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Explain objectives, expected outcomes, and logistics..."
                  className={inputCls} />
              </div>

              {/* Approval chain preview */}
              <div className="p-3 bg-primary-pale rounded-lg border border-primary-border">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">Approval Chain (after submission)</p>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-semibold">HOD Review</span>
                  <ChevronRight size={12} className="text-ink-muted" />
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">Dean Review</span>
                  <ChevronRight size={12} className="text-ink-muted" />
                  <span className="px-2 py-1 bg-violet-100 text-violet-800 rounded font-semibold">Principal Sanction</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className={btnGhost}>Cancel</button>
                <button type="submit" className={btnPrimary}>
                  <Send size={15} /> Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. DECISION MODAL (HOD / Dean / Principal) */}
      {decidingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-card border border-primary-border shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 ${
              decisionAction === 'Approved' ? 'bg-emerald-50' : decisionAction === 'Rejected' ? 'bg-rose-50' : 'bg-amber-50'
            }`}>
              <div>
                <h3 className="font-bold text-ink text-base">
                  {decisionAction === 'Approved'
                    ? (role === 'Principal' ? '✅ Sanction Request' : '✅ Endorse & Forward')
                    : decisionAction === 'Rejected'
                    ? '❌ Reject Request'
                    : '⚠️ Request Modifications'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Acting as: <span className="font-semibold">{currentUser.name} ({role})</span></p>
              </div>
              <button onClick={() => setDecidingProposal(null)} className="p-1.5 rounded-lg text-ink-muted hover:bg-white/60">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-slate-900">{decidingProposal.eventName}</p>
                <p className="text-slate-500">{decidingProposal.refNo} • {decidingProposal.submitterName} ({decidingProposal.submitterDept})</p>
                <p className="text-slate-600">Venue: {decidingProposal.resources[0]?.roomNo || 'Main Hall'} | Date: {decidingProposal.startDate}</p>
              </div>

              {/* Current chain */}
              <div>
                <p className="text-[10px] text-ink-muted uppercase font-semibold mb-1.5">Approval Flow</p>
                <ChainStatus chain={decidingProposal.approvalChain} />
              </div>

              {/* Header banner clarifying role authority */}
              <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                role === 'Principal'
                  ? 'bg-violet-50 border-violet-200 text-violet-900'
                  : role === 'Dean'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                {role === 'Principal' ? (
                  <p>
                    <span className="font-bold">👑 Final Sanction Desk:</span> As Principal, approving this request gives the official institutional sanction, confirms venue bookings, and issues the signed permission letter.
                  </p>
                ) : role === 'Dean' ? (
                  <p>
                    <span className="font-bold">🎓 Dean Recommendation:</span> Recommending this proposal forwards it to the Principal Office for final sanction. Final sanction authority stays with the Principal.
                  </p>
                ) : (
                  <p>
                    <span className="font-bold">🏢 Department Clearance:</span> Endorsing this proposal certifies department approval and forwards it to the Dean. Final sanction stays with the Principal.
                  </p>
                )}
              </div>

              {/* Action picker */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Action to Take *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  {(['Approved', 'Changes Requested', 'Rejected'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setDecisionAction(a)}
                      className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                        decisionAction === a
                          ? a === 'Approved'
                            ? role === 'Principal'
                              ? 'bg-violet-700 text-white border-violet-700 shadow-xs'
                              : role === 'Dean'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : a === 'Rejected'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-ink-muted border-primary-border hover:bg-page'
                      }`}
                    >
                      {a === 'Approved' ? (
                        <>
                          {role === 'Principal' ? <Crown size={12} /> : <Send size={12} />}
                          <span>{role === 'Principal' ? 'Sanction & Approve' : role === 'Dean' ? 'Recommend to Principal' : 'Endorse to Dean'}</span>
                        </>
                      ) : a === 'Changes Requested' ? (
                        <>
                          <RotateCcw size={12} />
                          <span>Request Revision</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          <span>Reject Request</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Remark {decisionAction !== 'Approved' && '*'}
                </label>
                <textarea
                  rows={3}
                  value={decisionRemark}
                  onChange={(e) => setDecisionRemark(e.target.value)}
                  placeholder={
                    decisionAction === 'Approved'
                      ? (role === 'Principal' ? 'e.g. Sanctioned and approved by Principal Office.' : role === 'Dean' ? 'e.g. Recommended for Principal sanction.' : 'e.g. Department verified and endorsed.')
                      : 'Explain the reason for rejection or required changes...'
                  }
                  className={inputCls}
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button onClick={() => setDecidingProposal(null)} className={btnGhost}>Cancel</button>
                <button
                  onClick={handleDecision}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-card text-white shadow-xs ${
                    decisionAction === 'Approved'
                      ? role === 'Principal' ? 'bg-violet-700 hover:bg-violet-800' : role === 'Dean' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      : decisionAction === 'Rejected'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Confirm {decisionAction === 'Approved' ? (role === 'Principal' ? 'Sanction & Approval' : role === 'Dean' ? 'Recommendation' : 'Endorsement') : decisionAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. OFFICIAL LETTER MODAL */}
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

            <div className="p-6 sm:p-8 overflow-y-auto bg-white text-ink text-sm leading-relaxed print-full">
              <div className="text-center border-b-2 border-primary pb-4 mb-5">
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-primary">{letterhead.collegeName}</h2>
                <p className="text-xs text-slate-600 mt-1">{letterhead.address}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{letterhead.phone} • {letterhead.email}</p>
              </div>

              <div className="flex justify-between text-xs font-mono border-b border-gray-200 pb-2 mb-4">
                <span>Ref: <b>{letterProposal.refNo}</b></span>
                <span>Date: <b>{letterProposal.dateOfRequest}</b></span>
              </div>

              <div className="text-xs text-slate-800 space-y-0.5 mb-4">
                <p>To,</p>
                <p className="font-bold">The Principal,</p>
                <p>{letterhead.collegeName},</p>
                <p>Mira Road (East), Thane.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-md font-bold text-xs text-slate-900 mb-4">
                Subject: Permission to organise "{letterProposal.eventName}" on {letterProposal.startDate}.
              </div>

              <div className="text-xs text-slate-800 space-y-2 leading-relaxed">
                <p>Respected Sir,</p>
                <p>
                  The <b>{letterProposal.organizingBody || `Department of ${letterProposal.submitterDept}`}</b> hereby requests your kind permission to conduct an event titled <b>"{letterProposal.eventName}"</b> on campus.
                </p>
                <p><b>Event Details & Facilities Requested:</b></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>Date & Time:</b> {letterProposal.startDate} from {letterProposal.startTime} to {letterProposal.endTime}</li>
                  <li><b>Requested Venue:</b> {letterProposal.resources[0]?.roomNo || 'Main Auditorium'}</li>
                  <li><b>Expected Participants:</b> {letterProposal.participants} students/faculty</li>
                  <li><b>Activity Purpose:</b> {letterProposal.purpose}</li>
                  {letterProposal.hasBudget && (
                    <li><b>Sanctioned Budget:</b> Rs. {letterProposal.budgetItems[0]?.unitCost || 0} ({letterProposal.budgetHead})</li>
                  )}
                </ul>
                <p className="mt-2">Kindly grant permission and sanction the necessary campus infrastructure for the successful conduct of this activity.</p>
              </div>

              {/* Approval chain on letter */}
              <div className="mt-5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-[10px] uppercase font-bold text-slate-600 mb-2">Institutional Approval Record</p>
                <div className="space-y-1.5">
                  {letterProposal.approvalChain.map((step) => (
                    <div key={step.id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{step.role}</span>
                        {step.userName && <span className="text-slate-500"> — {step.userName}</span>}
                        {step.actedAt && <span className="text-slate-400 text-[10px] ml-1">({step.actedAt})</span>}
                        {step.remark && <p className="text-slate-500 italic text-[10px]">"{step.remark}"</p>}
                      </div>
                      <Badge text={step.action} />
                    </div>
                  ))}
                </div>
              </div>

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
                      <span className="text-[10px] block">Pending Approval Chain</span>
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
                  <span className="font-semibold text-slate-800">{selectedProposal.startDate} ({selectedProposal.startTime} – {selectedProposal.endTime})</span>
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
                  <span className="font-semibold text-slate-800">
                    {selectedProposal.hasBudget ? `Rs. ${selectedProposal.budgetItems[0]?.unitCost || 0}` : 'None'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Purpose & Description</span>
                <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">{selectedProposal.purpose}</p>
              </div>

              {/* Full approval timeline */}
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1.5">Full Approval Chain</span>
                <div className="space-y-1.5">
                  {selectedProposal.approvalChain.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{s.role}</span>
                          <span className="text-slate-500 ml-1.5">({s.userName})</span>
                          {s.actedAt && <span className="text-[10px] text-slate-400 ml-1">• {s.actedAt}</span>}
                        </div>
                        <Badge text={s.action} />
                      </div>
                      {s.remark && <p className="text-[11px] text-slate-500 italic mt-0.5">"{s.remark}"</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                {canApprove && canActOnProposal(role, selectedProposal.approvalChain) && (
                  <button
                    onClick={() => {
                      setSelectedProposal(null);
                      setDecidingProposal(selectedProposal);
                      setDecisionAction('Approved');
                      setDecisionRemark('');
                    }}
                    className={btnPrimary}
                  >
                    <ShieldCheck size={14} /> Review & Decide
                  </button>
                )}
                <button
                  onClick={() => { setSelectedProposal(null); setLetterProposal(selectedProposal); }}
                  className={btnGhost}
                >
                  <Printer size={14} /> Open Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Role Switcher Bar (demo mode only)
// ─────────────────────────────────────────────────────────────
function RoleSwitcherBar({
  currentRole,
  users,
  setCurrentUserId,
}: {
  currentRole: string;
  users: { id: string; role: string; name: string }[];
  setCurrentUserId: (id: string) => void;
}) {
  const roles: { role: string; label: string; icon: string }[] = [
    { role: 'Faculty', label: 'Faculty', icon: '👤' },
    { role: 'HOD', label: 'HOD', icon: '🏢' },
    { role: 'Dean', label: 'Dean', icon: '🎓' },
    { role: 'Principal', label: 'Principal', icon: '🏛️' },
  ];

  return (
    <div className="flex items-center gap-1 bg-page p-1.5 rounded-xl border border-primary-border self-start md:self-center flex-wrap">
      <span className="text-[10px] font-medium text-ink-muted px-1.5 hidden sm:inline">Preview as:</span>
      {roles.map(({ role, label, icon }) => {
        const u = users.find((x) => x.role === role);
        const isActive = currentRole === role;
        return (
          <button
            key={role}
            onClick={() => { if (u) setCurrentUserId(u.id); }}
            title={u?.name ?? label}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
              isActive
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Role-specific context cards
// ─────────────────────────────────────────────────────────────
function RoleContextCard({
  role, stats, proposals, currentUser,
}: {
  role: string;
  stats: { total: number; pending: number; approved: number; rejected: number; awaitingMe: number };
  proposals: Proposal[];
  currentUser: { id: string; name: string; department: string; designation: string };
}) {
  if (role === 'Principal') {
    return (
      <div className="bg-gradient-to-r from-violet-50/90 via-white to-violet-50/40 border border-violet-200 rounded-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-xl shrink-0">🏛️</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-violet-950 text-base sm:text-lg">Principal's Sanction Desk (Head of Institution)</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-700 text-white">Exclusive Final Authority</span>
            </div>
            <p className="text-xs text-violet-800 mt-1 leading-relaxed">
              Complete institutional oversight across all departments, HODs, and faculty. You hold the <b>exclusive final sanction & approval authority</b> that generates official signed permission letters.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
              <span className="font-semibold text-violet-900 bg-violet-100/90 border border-violet-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Crown size={13} className="text-violet-700" /> {stats.awaitingMe} awaiting final sanction
              </span>
              <span className="font-semibold text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-700" /> {stats.approved} total approved
              </span>
              <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Building2 size={13} className="text-slate-600" /> All departments & faculties visible ({proposals.length} total)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'Dean') {
    return (
      <div className="bg-gradient-to-r from-blue-50/90 via-white to-blue-50/40 border border-blue-200 rounded-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-xl shrink-0">🎓</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-blue-950 text-base sm:text-lg">Dean's Cross-Department Review Panel</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-700 text-white">All HODs & Faculties Visible</span>
            </div>
            <p className="text-xs text-blue-800 mt-1 leading-relaxed">
              Cross-department student welfare & academic oversight. You see <b>all HODs, faculties, and proposals across the entire institution</b>. You review and recommend proposals to the Principal (final sanction stays with Principal).
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
              <span className="font-semibold text-blue-900 bg-blue-100/90 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Send size={13} className="text-blue-700" /> {stats.awaitingMe} proposals awaiting Dean review
              </span>
              <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Building2 size={13} className="text-slate-600" /> Overseeing all college departments ({proposals.length} total requests)
              </span>
              <span className="font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                ⚠️ Final sanction rests exclusively with Principal
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'HOD') {
    const deptProposals = proposals.filter(
      (p) => p.submitterDept === currentUser.department || (p.departments || []).includes(currentUser.department)
    );
    return (
      <div className="bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/40 border border-emerald-200 rounded-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xl shrink-0">🏢</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-emerald-950 text-base sm:text-lg">HOD — Department of {currentUser.department} Desk</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-700 text-white">Department Overview</span>
            </div>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Department Head authority. You see <b>everything in your department</b>: all faculty submissions, event requests, and venue bookings. You verify and endorse proposals to forward to the Dean (final sanction stays with Principal).
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
              <span className="font-semibold text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Building2 size={13} className="text-emerald-700" /> {deptProposals.length} total department proposals
              </span>
              <span className="font-semibold text-amber-900 bg-amber-100/90 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Clock size={13} className="text-amber-700" /> {stats.awaitingMe} awaiting your endorsement
              </span>
              <span className="font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                🔒 Forwards to Dean &rarr; Principal for final sanction
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Faculty
  const myProposals = proposals.filter((p) => p.submitterId === currentUser.id);
  const myApproved = myProposals.filter((p) => p.status === 'Approved').length;
  return (
    <div className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 border border-amber-200 rounded-card p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl shrink-0">👤</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-amber-950 text-base sm:text-lg">Faculty Submission Desk — {currentUser.name}</h3>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-700 text-white">Dept of {currentUser.department}</span>
          </div>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Submit activity & event permission requests. Track real-time progress through the 3-step institutional approval chain: <b>HOD &rarr; Dean &rarr; Principal</b>.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
            <span className="font-semibold text-amber-900 bg-amber-100/90 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <FileText size={13} className="text-amber-700" /> {myProposals.length} my submitted requests
            </span>
            <span className="font-semibold text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-700" /> {myApproved} sanctioned by Principal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
