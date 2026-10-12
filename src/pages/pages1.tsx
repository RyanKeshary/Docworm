import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, AlertTriangle, ListTodo, Search, Plus } from 'lucide-react';
import { useData } from '../store';
import { Badge, Drawer, EmptyState, ExportMenu, btnGhost, btnPrimary, inputCls } from '../components';
import { computedTaskStatus, detectClashes, exportCSV, exportPDF, exportXLSX, flattenProposal } from '../utils';

export function Login() {
  const { users, signIn, backend, isAuthenticated } = useData();
  const nav = useNavigate();
  const [email, setEmail] = useState('principal@slrtce.in');
  const [password, setPassword] = useState('docworm123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  React.useEffect(() => {
    if (isAuthenticated && backend === 'supabase') nav('/');
  }, [isAuthenticated, backend, nav]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockedUntil) {
      setError(`Too many failed attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)} seconds.`);
      return;
    }
    setBusy(true);
    setError('');
    const err = await signIn(email, password);
    setBusy(false);
    if (err) {
      const n = fails + 1;
      setFails(n);
      if (n >= 5) {
        setLockedUntil(Date.now() + 60000);
        setFails(0);
        setError('Too many failed attempts. Locked for 60 seconds.');
      } else {
        setError(err);
      }
      return;
    }
    nav('/');
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F7F7FA]">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 bg-white border border-gray-200 rounded-card overflow-hidden shadow-sm">
        <div className="bg-primary text-white p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-lg bg-white text-primary flex items-center justify-center"><FileText size={20} /></span>
              <span className="font-bold text-2xl">Docworm</span>
            </div>
            <h1 className="mt-8 text-3xl font-bold leading-tight">Paper permission letters, replaced with a clear digital trail.</h1>
            <p className="mt-3 text-white/85 text-sm leading-relaxed">Submit proposals, route room requests to each HOD, track principal approvals, assign tasks, and export formal letters. Built for SLRTCE administration.</p>
          </div>
          <ul className="mt-8 space-y-2 text-sm text-white/90">
            <li>Approval chain: Submitter, HOD, Dean, Principal</li>
            <li>Room clash detection and sub-requests per HOD</li>
            <li>Tasks, completion reports, and one click exports</li>
          </ul>
        </div>
        <div className="p-8 sm:p-10">
          <h2 className="font-bold text-xl text-slate-900">Sign in to Docworm</h2>
          <p className="text-sm text-slate-500 mt-1">
            {backend === 'supabase'
              ? 'College staff sign in. Contact the principal if you need an account.'
              : 'Use email and password. All demo passwords are docworm123.'}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} type="email" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1`} type="password" required />
            </label>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button className={`${btnPrimary} w-full justify-center`} type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          </form>
          {backend === 'local' && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Demo accounts</p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
              {users.slice(0, 6).map((u) => (
                <button key={u.id} onClick={() => { setEmail(u.email); setPassword(u.password); }} className="text-left px-2 py-1.5 rounded-md hover:bg-primary-pale">
                  <span className="font-semibold text-slate-700">{u.role}</span>
                  <span className="text-slate-500">, {u.email}</span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function useFilteredProposals() {
  const { proposals } = useData();
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').toLowerCase();
  if (!q) return proposals;
  return proposals.filter((p) => [p.refNo, p.eventName, p.submitterName, p.status].join(' ').toLowerCase().includes(q));
}

export function Dashboard() {
  const { proposals, tasks, currentUser, notifications, completions } = useData();
  const [panel, setPanel] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState<string | null>(null);
  const nav = useNavigate();

  const mine = proposals.filter((p) => p.submitterId === currentUser.id);
  const awaiting = proposals.filter((p) => {
    if (currentUser.role === 'Principal') return p.status === 'Submitted' || p.status === 'Under Review';
    if (currentUser.role === 'Dean') return p.approvalChain.some((s) => s.role === 'Dean' && s.action === 'Pending' && (p.status === 'Submitted' || p.status === 'Under Review'));
    if (currentUser.role === 'HOD') {
      const ownStep = p.approvalChain.some((s) => s.userId === currentUser.id && s.action === 'Pending');
      const roomStep = p.resources.some((r) => r.ownerDept === currentUser.department && r.status === 'Pending');
      return ownStep || roomStep;
    }
    return false;
  });
  const myTasks = tasks.filter((t) => t.assignedTo.includes(currentUser.id));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const approvedMonth = proposals.filter((p) => p.status === 'Approved' && p.updatedAt.startsWith(thisMonth)).length;
  const pendingApprovals = proposals.filter((p) => ['Submitted', 'Under Review'].includes(p.status)).length;
  const rejected = proposals.filter((p) => p.status === 'Rejected').length;
  const pendingReports = proposals.filter((p) => p.status === 'Approved' && p.endDate < new Date().toISOString().slice(0, 10) && !completions[p.id]).length;
  const openTasks = tasks.filter((t) => !['Completed', 'Cancelled'].includes(computedTaskStatus(t.dueDate, t.status))).length;
  const overdueTasks = tasks.filter((t) => computedTaskStatus(t.dueDate, t.status) === 'Overdue').length;

  const byDept = useMemo(() => {
    const m: Record<string, number> = {};
    proposals.forEach((p) => p.departments.forEach((d) => { m[d] = (m[d] ?? 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [proposals]);
  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    proposals.forEach((p) => { m[p.status] = (m[p.status] ?? 0) + 1; });
    return Object.entries(m);
  }, [proposals]);
  const clashes = detectClashes(proposals);

  const tiles = [
    { key: 'Pending Approvals', value: pendingApprovals, icon: <Clock size={18} />, span: 'sm:col-span-2', sub: `${awaiting.length} awaiting you` },
    { key: 'Approved This Month', value: approvedMonth, icon: <CheckCircle2 size={18} />, span: '', sub: 'across all departments' },
    { key: 'Rejected', value: rejected, icon: <FileText size={18} />, span: '', sub: 'needs resubmission' },
    { key: 'Pending Reports', value: pendingReports, icon: <AlertTriangle size={18} />, span: '', sub: 'past event date' },
    { key: 'Open Tasks', value: openTasks, icon: <ListTodo size={18} />, span: '', sub: `${myTasks.length} assigned to you` },
    { key: 'Overdue Tasks', value: overdueTasks, icon: <AlertTriangle size={18} />, span: 'sm:col-span-2', sub: 'needs attention' },
  ];

  const panelList = (key: string) => {
    if (key === 'Pending Approvals') return proposals.filter((p) => ['Submitted', 'Under Review'].includes(p.status));
    if (key === 'Rejected') return proposals.filter((p) => p.status === 'Rejected');
    if (key === 'Approved This Month') return proposals.filter((p) => p.status === 'Approved');
    if (key === 'Pending Reports') return proposals.filter((p) => p.status === 'Approved' && !completions[p.id]);
    if (key === 'Open Tasks') return [];
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-xs text-slate-500">Dashboard / {currentUser.role}</p>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {currentUser.role === 'Principal' ? 'Principal Sir' : currentUser.name.split(' ').slice(0, 2).join(' ')}</h1>
        </div>
        <div className="flex-1" />
        <Link to="/proposals/new" className={btnPrimary}><Plus size={16} /> New proposal</Link>
        <Link to="/tasks" className={btnGhost}>View tasks</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <button key={t.key} onClick={() => setPanel(t.key)} className={`text-left bg-white border border-gray-200 rounded-card p-4 hover:border-primary-border hover:shadow-sm transition-all ${t.span}`}>
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-primary-pale text-primary flex items-center justify-center">{t.icon}</span>
              <span className="text-2xl font-bold text-slate-900">{t.value}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-800">{t.key}</p>
            <p className="text-xs text-slate-500">{t.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Proposals by department</h2>
            {chartFilter && <button className="text-xs text-primary font-semibold" onClick={() => setChartFilter(null)}>Clear filter</button>}
          </div>
          <div className="mt-4 space-y-2">
            {byDept.map(([d, c]) => (
              <button key={d} onClick={() => setChartFilter(chartFilter === d ? null : d)} className="w-full flex items-center gap-3 text-left group">
                <span className="w-14 text-xs font-semibold text-slate-600">{d}</span>
                <span className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden">
                  <span className={`block h-full rounded-md ${chartFilter === d ? 'bg-primary-dark' : 'bg-primary'} group-hover:opacity-90`} style={{ width: `${Math.max(8, (c / Math.max(1, byDept[0][1])) * 100)}%` }} />
                </span>
                <span className="text-sm font-bold w-6 text-right">{c}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">Proposals {chartFilter ? `in ${chartFilter}` : 'matching filter'}</p>
            <div className="space-y-1.5">
              {(chartFilter ? proposals.filter((p) => p.departments.includes(chartFilter)) : proposals.slice(0, 4)).map((p) => (
                <Link key={p.id} to={`/proposals/${p.id}`} className="flex items-center gap-2 text-sm hover:bg-gray-50 rounded-md px-2 py-1.5">
                  <span className="font-mono text-xs text-slate-500">{p.refNo}</span>
                  <span className="flex-1 truncate font-medium">{p.eventName}</span>
                  <Badge text={p.status} />
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold">Proposals by status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {byStatus.map(([s, c]) => (
                <button key={s} onClick={() => nav(`/proposals?status=${encodeURIComponent(s)}`)} className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 text-sm hover:border-primary-border">
                  <Badge text={s} /><span className="font-bold">{c}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold">Room clash watch</h2>
            {clashes.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">No overlapping room bookings among active proposals.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {clashes.slice(0, 5).map((c, i) => (
                  <li key={i} className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-md px-3 py-2">{c}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Awaiting your action ({awaiting.length})</h2>
            <Link to="/proposals?tab=awaiting" className="text-sm text-primary font-semibold">View all</Link>
          </div>
          <div className="mt-3 space-y-2">
            {awaiting.slice(0, 5).map((p) => (
              <Link key={p.id} to={`/proposals/${p.id}`} className="block border border-gray-200 rounded-card px-3 py-2.5 hover:border-primary-border">
                <span className="flex items-center gap-2"><span className="font-medium text-sm flex-1 truncate">{p.eventName}</span><Badge text={p.status} /></span>
                <span className="text-xs text-slate-500 font-mono">{p.refNo} | {p.startDate}</span>
              </Link>
            ))}
            {awaiting.length === 0 && <EmptyState title="Nothing awaiting you" hint="New submissions that need your review will appear here." />}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link to="/reports" className="text-sm text-primary font-semibold">Reports</Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {proposals.slice(0, 5).map((p) => (
              <li key={p.id} className="flex gap-2 items-start">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><Link to={`/proposals/${p.id}`} className="font-medium hover:text-primary">{p.eventName}</Link> <span className="text-slate-500">updated {p.updatedAt}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-slate-500">My tasks due soon</p>
            {myTasks.slice(0, 3).map((t) => (
              <Link key={t.id} to={`/tasks/${t.id}`} className="flex items-center gap-2 text-sm py-1">
                <span className="flex-1 truncate">{t.title}</span>
                <Badge text={computedTaskStatus(t.dueDate, t.status)} />
              </Link>
            ))}
            {myTasks.length === 0 && <p className="text-sm text-slate-500">No tasks assigned to you.</p>}
          </div>
        </div>
      </div>

      {panel && (
        <Drawer title={panel} onClose={() => setPanel(null)}>
          <div className="space-y-2">
            {panel === 'Open Tasks' || panel === 'Overdue Tasks' ? (
              tasks.filter((t) => panel === 'Overdue Tasks' ? computedTaskStatus(t.dueDate, t.status) === 'Overdue' : !['Completed', 'Cancelled'].includes(t.status)).map((t) => (
                <Link key={t.id} to={`/tasks/${t.id}`} className="block border border-gray-200 rounded-card p-3 hover:border-primary-border">
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-slate-500">Due {t.dueDate} | <Badge text={computedTaskStatus(t.dueDate, t.status)} /></p>
                </Link>
              ))
            ) : panelList(panel).length === 0 ? (
              <EmptyState title="No items" hint="Nothing in this bucket right now." />
            ) : (
              panelList(panel).map((p) => (
                <Link key={p.id} to={`/proposals/${p.id}`} className="block border border-gray-200 rounded-card p-3 hover:border-primary-border">
                  <p className="font-medium text-sm">{p.eventName}</p>
                  <p className="text-xs text-slate-500 font-mono">{p.refNo}</p>
                  <span className="mt-1 inline-block"><Badge text={p.status} /></span>
                </Link>
              ))
            )}
            {panel !== 'Open Tasks' && panel !== 'Overdue Tasks' && notifications.filter((n) => n.userId === currentUser.id).slice(0, 2).map((n) => (
              <p key={n.id} className="text-xs text-slate-500 border-t border-gray-100 pt-2">{n.title}: {n.body}</p>
            ))}
          </div>
        </Drawer>
      )}
    </div>
  );
}

const ALL_COLS = ['refNo', 'eventName', 'category', 'status', 'startDate', 'departments', 'submitter', 'participants', 'totalExpenses'];

export function ProposalsList() {
  const { proposals, saveProposals, pushAudit, pushNotification, currentUser } = useData();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'all';
  const statusF = params.get('status') ?? '';
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [dept, setDept] = useState('');
  const [cols, setCols] = useState<string[]>(ALL_COLS);
  const [showCols, setShowCols] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const base = useFilteredProposals();
  const list = base.filter((p) => {
    if (tab === 'mine' && p.submitterId !== currentUser.id) return false;
    if (tab === 'awaiting') {
      if (currentUser.role === 'Principal') return ['Submitted', 'Under Review'].includes(p.status);
      if (currentUser.role === 'HOD') {
        return p.approvalChain.some((s) => s.userId === currentUser.id && s.action === 'Pending') || p.resources.some((r) => r.ownerDept === currentUser.department && r.status === 'Pending');
      }
      if (currentUser.role === 'Dean') return p.approvalChain.some((s) => s.role === 'Dean' && s.action === 'Pending');
      return false;
    }
    if (statusF && p.status !== statusF) return false;
    if (dept && !p.departments.includes(dept)) return false;
    if (search && ![p.refNo, p.eventName, p.submitterName].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = list.map(flattenProposal);
  const [visible, setVisible] = useState(50);
  React.useEffect(() => { setVisible(50); }, [tab, statusF, dept, search]);
  const shown = list.slice(0, visible);
  const doExport = (fmt: 'CSV' | 'XLSX' | 'PDF' | 'Print') => {
    if (fmt === 'CSV') exportCSV('docworm-proposals.csv', rows, cols);
    else if (fmt === 'XLSX') exportXLSX('docworm-proposals.xlsx', rows, cols);
    else if (fmt === 'PDF') exportPDF('docworm-proposals.pdf', 'Docworm proposals export', cols, rows);
    else window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-xs text-slate-500">Proposals</p>
          <h1 className="text-2xl font-bold">Permission requests</h1>
        </div>
        <div className="flex-1" />
        <button className={btnGhost} onClick={() => setShowCols((s) => !s)}>Columns</button>
        <ExportMenu onExport={doExport} />
        <Link to="/proposals/new" className={btnPrimary}><Plus size={16} /> New</Link>
      </div>
      {showCols && (
        <div className="bg-white border border-gray-200 rounded-card p-4 flex flex-wrap gap-2">
          {ALL_COLS.map((c) => (
            <label key={c} className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-md px-2 py-1">
              <input type="checkbox" checked={cols.includes(c)} onChange={() => setCols((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} className="accent-[#6D4AFF]" /> {c}
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-card p-3">
        <div className="flex gap-1 bg-gray-100 rounded-card p-1">
          {(['all', 'mine', 'awaiting'] as const).map((t) => (
            <button key={t} onClick={() => setParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', t); return n; })} className={`px-3 py-1.5 text-sm font-medium rounded-md ${tab === t ? 'bg-white shadow-sm text-primary-dark' : 'text-slate-600'}`}>
              {t === 'all' ? 'All' : t === 'mine' ? 'Mine' : 'Awaiting my action'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter list" className={`${inputCls} pl-8 !w-52`} aria-label="Filter proposals" />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className={`${inputCls} !w-36`} aria-label="Filter by department">
          <option value="">All depts</option>
          {['IT', 'CMPN', 'EXTC', 'ECS', 'MECH', 'CIVIL', 'HAS'].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusF} onChange={(e) => setParams((prev) => { const n = new URLSearchParams(prev); if (e.target.value) n.set('status', e.target.value); else n.delete('status'); return n; })} className={`${inputCls} !w-44`} aria-label="Filter by status">
          <option value="">All statuses</option>
          {['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Changes Requested', 'Withdrawn', 'Completed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{list.length} results, filters apply to exports</span>
        {currentUser.role === 'Principal' && selected.length > 0 && (
          <button
            onClick={() => {
              saveProposals(proposals.map((p) => selected.includes(p.id) ? {
                ...p,
                status: 'Approved' as const,
                approvalChain: p.approvalChain.map((s) => s.action === 'Pending' ? { ...s, action: 'Approved' as const, actedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), remark: 'Bulk approved by Principal', userId: currentUser.id, userName: currentUser.name } : s),
                updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              } : p));
              selected.forEach((id) => {
                const p = proposals.find((x) => x.id === id);
                if (p) {
                  pushNotification({ userId: p.submitterId, title: 'Proposal Approved', body: `${p.refNo} approved in bulk by Principal`, link: `/proposals/${p.id}` });
                  pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Bulk approved ${p.refNo}`, entity: 'Proposal', entityId: p.id });
                }
              });
              setSelected([]);
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-md bg-green-600 text-white"
          >
            Bulk approve ({selected.length})
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState title="No proposals found" hint="Adjust filters or create a new proposal." />
      ) : (
        <>
          <div className="hidden md:block bg-white border border-gray-200 rounded-card overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-gray-100">
                  <th className="p-3"><input type="checkbox" aria-label="Select all" checked={selected.length === list.length} onChange={() => setSelected(selected.length === list.length ? [] : list.map((p) => p.id))} className="accent-[#6D4AFF]" /></th>
                  {cols.map((c) => <th key={c} className="p-3 font-semibold capitalize">{c}</th>)}
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-primary-pale/40">
                    <td className="p-3"><input type="checkbox" aria-label={`Select ${p.refNo}`} checked={selected.includes(p.id)} onChange={() => setSelected((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])} className="accent-[#6D4AFF]" /></td>
                    {cols.map((c) => (
                      <td key={c} className="p-3">
                        {c === 'status' ? <Badge text={String(flattenProposal(p)[c])} /> : c === 'refNo' ? <span className="font-mono text-xs">{p.refNo}</span> : String(flattenProposal(p)[c] ?? '')}
                      </td>
                    ))}
                    <td className="p-3"><Link to={`/proposals/${p.id}`} className="text-primary font-semibold text-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {shown.map((p) => (
              <Link key={p.id} to={`/proposals/${p.id}`} className="block bg-white border border-gray-200 rounded-card p-4">
                <span className="flex items-center gap-2"><span className="font-semibold text-sm flex-1">{p.eventName}</span><Badge text={p.status} /></span>
                <span className="text-xs text-slate-500 font-mono">{p.refNo} | {p.startDate} | {p.departments.join(', ')}</span>
              </Link>
            ))}
          </div>
          {visible < list.length && (
            <button onClick={() => setVisible((v) => v + 50)} className={`${btnGhost} w-full justify-center`}>
              Show more ({list.length - visible} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
