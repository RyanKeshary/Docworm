import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle2, AlertTriangle, ListTodo, Search, Plus,
  GraduationCap, Building2, Landmark, Briefcase, Zap, User, ArrowRight,
  ShieldCheck, Sparkles, Check,
} from 'lucide-react';
import { useData } from '../store';
import { Badge, Drawer, EmptyState, ExportMenu, btnGhost, btnPrimary, inputCls } from '../components';
import { computedTaskStatus, detectClashes, exportCSV, exportPDF, exportXLSX, flattenProposal } from '../utils';

type RolePortal = 'Faculty' | 'HOD' | 'Dean' | 'Principal';

export function Login() {
  const { signIn, signUp, backend, isAuthenticated } = useData();
  const nav = useNavigate();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [portal, setPortal] = useState<RolePortal>('Faculty');
  const [email, setEmail] = useState('faculty@slrtce.in');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Principal' | 'Dean' | 'HOD' | 'Faculty'>('Faculty');
  const [department, setDepartment] = useState('IT');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  React.useEffect(() => {
    if (isAuthenticated) nav('/');
  }, [isAuthenticated, nav]);

  const selectPortal = (r: RolePortal) => {
    setPortal(r);
    setError('');
    if (r === 'Faculty') {
      setEmail('faculty@slrtce.in');
      setPassword('password123');
    } else if (r === 'HOD') {
      setEmail('hod.it@slrtce.in');
      setPassword('password123');
    } else if (r === 'Dean') {
      setEmail('dean@slrtce.in');
      setPassword('password123');
    } else if (r === 'Principal') {
      setEmail('principal@slrtce.in');
      setPassword('password123');
    }
  };

  const quickLoginAs = async (r: RolePortal) => {
    selectPortal(r);
    setBusy(true);
    setError('');
    const testEmail = r === 'Faculty' ? 'faculty@slrtce.in'
      : r === 'HOD' ? 'hod.it@slrtce.in'
      : r === 'Dean' ? 'dean@slrtce.in' : 'principal@slrtce.in';
    const err = await signIn(testEmail, 'password123');
    setBusy(false);
    if (err) setError(err);
    else nav('/');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockedUntil) {
      setError(`Too many failed attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)} seconds.`);
      return;
    }
    setBusy(true);
    setError('');

    if (tab === 'register') {
      if (!name.trim()) { setError('Full name is required.'); setBusy(false); return; }
      const err = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        department,
        designation: designation.trim() || role,
        phone: phone.trim(),
      });
      setBusy(false);
      if (err) { setError(err); return; }
      nav('/');
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-100 via-purple-50/30 to-indigo-50/20">
      <div className="w-full max-w-5xl grid md:grid-cols-5 gap-0 bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-xl">
        {/* Left institutional hero panel */}
        <div className="md:col-span-2 bg-gradient-to-br from-primary-dark via-primary to-indigo-700 text-white p-7 sm:p-9 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-md">
                <FileText size={22} />
              </span>
              <div>
                <span className="font-bold text-2xl tracking-tight block">Docworm</span>
                <span className="text-xs text-white/80 font-medium">College Permission System</span>
              </div>
            </div>

            <h1 className="mt-8 text-2xl sm:text-3xl font-extrabold leading-snug">
              Digital permission letters & approval workflows.
            </h1>
            <p className="mt-3 text-white/85 text-xs sm:text-sm leading-relaxed">
              Replace paper movement with instant transparent routing from Faculty Coordinator to HOD, Dean, and Principal.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/15 space-y-3">
            <div className="flex items-center gap-2.5 text-xs text-white/90">
              <ShieldCheck size={16} className="text-emerald-300 shrink-0" />
              <span>Multi-tier approval chain with digital trail</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/90">
              <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
              <span>Automated room clash detection & resource routing</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/90">
              <Sparkles size={16} className="text-emerald-300 shrink-0" />
              <span>Task delegations and one-click letter exports</span>
            </div>
          </div>
        </div>

        {/* Right login & role portal panel */}
        <div className="md:col-span-3 p-6 sm:p-9 flex flex-col justify-between">
          <div>
            {/* Sign in vs Register tabs */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
              <div className="flex gap-2">
                <button
                  onClick={() => { setTab('signin'); setError(''); }}
                  className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all ${
                    tab === 'signin'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setTab('register'); setError(''); }}
                  className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all ${
                    tab === 'register'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Register Account
                </button>
              </div>

              <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {backend === 'supabase' ? 'Supabase Live' : 'Local Storage Mode'}
              </span>
            </div>

            {/* DEDICATED ROLE PORTAL SELECTOR: Faculty, HOD, Dean, Principal */}
            {tab === 'signin' && (
              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Select Institutional Portal:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Faculty', label: 'Faculty', icon: <GraduationCap size={15} /> },
                    { id: 'HOD', label: 'HOD', icon: <Building2 size={15} /> },
                    { id: 'Dean', label: 'Dean', icon: <Landmark size={15} /> },
                    { id: 'Principal', label: 'Principal', icon: <Briefcase size={15} /> },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectPortal(r.id as RolePortal)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-card text-xs font-semibold border transition-all ${
                        portal === r.id
                          ? 'border-primary bg-primary text-white shadow-xs'
                          : 'border-gray-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {r.icon}
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>

                {/* Faculty portal callout */}
                <div className="mt-3 p-3 bg-purple-50/70 border border-primary-border/60 rounded-card flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-primary text-white shrink-0 mt-0.5">
                    {portal === 'Faculty' ? <GraduationCap size={14} /> : portal === 'HOD' ? <Building2 size={14} /> : portal === 'Dean' ? <Landmark size={14} /> : <Briefcase size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900">
                      {portal === 'Faculty'
                        ? 'Faculty Portal Login'
                        : `${portal} Portal Login`}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {portal === 'Faculty'
                        ? 'Draft permission letters, route room/lab requests to HODs, view assigned tasks & submit event reports.'
                        : portal === 'HOD'
                        ? 'Review department proposals, clear room requests, and delegate tasks to faculty.'
                        : portal === 'Dean'
                        ? 'Student welfare & institutional event clearances.'
                        : 'Final administrative sanction, budget reviews, and institutional approvals.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => quickLoginAs(portal)}
                    disabled={busy}
                    className="shrink-0 text-[11px] font-bold bg-primary text-white hover:bg-primary-dark px-2.5 py-1.5 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                    title={`Instant 1-click test sign in as ${portal}`}
                  >
                    <Zap size={12} /> Quick Login
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-3.5">
              {tab === 'register' && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">Full Name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Prof. Rajesh Sharma"
                      className={`${inputCls} mt-1`}
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-700">Role</span>
                      <select value={role} onChange={(e) => setRole(e.target.value as any)} className={`${inputCls} mt-1`}>
                        <option value="Faculty">Faculty Coordinator</option>
                        <option value="HOD">Head of Department (HOD)</option>
                        <option value="Dean">Dean (SWDC)</option>
                        <option value="Principal">Principal</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-slate-700">Department</span>
                      <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`${inputCls} mt-1`}>
                        {['IT', 'CMPN', 'EXTC', 'ECS', 'MECH', 'CIVIL', 'HAS'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">Designation</span>
                    <input
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Assistant Professor"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Institutional Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@slrtce.in"
                  className={`${inputCls} mt-1`}
                  type="email"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} mt-1`}
                  type="password"
                  required
                />
              </label>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <button
                className={`${btnPrimary} w-full justify-center py-2.5 text-sm !mt-4`}
                type="submit"
                disabled={busy}
              >
                {busy
                  ? (tab === 'signin' ? 'Authenticating...' : 'Registering...')
                  : (tab === 'signin' ? `Sign In as ${portal}` : 'Create Account')}
              </button>
            </form>
          </div>

          {/* Quick Demo Institutional Accounts */}
          {backend === 'local' && tab === 'signin' && (
            <div className="mt-5 border-t border-gray-100 pt-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Test Accounts (Password: <code>password123</code>):
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => quickLoginAs('Faculty')}
                  className="text-left p-1.5 rounded-lg border border-gray-200 hover:border-primary-border hover:bg-primary-pale/40 transition-colors"
                >
                  <span className="font-semibold text-primary block">Faculty</span>
                  <span className="text-[11px] text-slate-500 font-mono">faculty@slrtce.in</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickLoginAs('HOD')}
                  className="text-left p-1.5 rounded-lg border border-gray-200 hover:border-primary-border hover:bg-primary-pale/40 transition-colors"
                >
                  <span className="font-semibold text-primary block">HOD IT</span>
                  <span className="text-[11px] text-slate-500 font-mono">hod.it@slrtce.in</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickLoginAs('Dean')}
                  className="text-left p-1.5 rounded-lg border border-gray-200 hover:border-primary-border hover:bg-primary-pale/40 transition-colors"
                >
                  <span className="font-semibold text-primary block">Dean SWDC</span>
                  <span className="text-[11px] text-slate-500 font-mono">dean@slrtce.in</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickLoginAs('Principal')}
                  className="text-left p-1.5 rounded-lg border border-gray-200 hover:border-primary-border hover:bg-primary-pale/40 transition-colors"
                >
                  <span className="font-semibold text-primary block">Principal</span>
                  <span className="text-[11px] text-slate-500 font-mono">principal@slrtce.in</span>
                </button>
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
    { key: 'Pending Approvals', value: pendingApprovals, icon: <Clock size={19} />, color: 'from-amber-500 to-amber-600', sub: `${awaiting.length} awaiting you` },
    { key: 'Approved This Month', value: approvedMonth, icon: <CheckCircle2 size={19} />, color: 'from-emerald-500 to-emerald-600', sub: 'across departments' },
    { key: 'Rejected', value: rejected, icon: <FileText size={19} />, color: 'from-rose-500 to-rose-600', sub: 'needs resubmission' },
    { key: 'Pending Reports', value: pendingReports, icon: <AlertTriangle size={19} />, color: 'from-orange-500 to-orange-600', sub: 'past event date' },
    { key: 'Open Tasks', value: openTasks, icon: <ListTodo size={19} />, color: 'from-primary to-indigo-600', sub: `${myTasks.length} assigned to you` },
    { key: 'Overdue Tasks', value: overdueTasks, icon: <AlertTriangle size={19} />, color: 'from-rose-500 to-pink-600', sub: 'needs attention' },
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
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Overview</span>
            <span className="text-[11px] bg-primary-pale text-primary font-medium px-2 py-0.5 rounded-full border border-primary-border">
              {currentUser.role} Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Welcome, {currentUser.name || currentUser.role}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Department of {currentUser.department} • {currentUser.designation || currentUser.role}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/proposals/new" className={btnPrimary}>
            <Plus size={16} /> New Proposal
          </Link>
          <Link to="/faculty" className={btnGhost}>
            Faculty Panel
          </Link>
          <Link to="/tasks" className={btnGhost}>
            Tasks ({myTasks.length})
          </Link>
        </div>
      </div>

      {/* Responsive Metric Tiles (2 cols on mobile, 3 on tablet, 6 on desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => setPanel(t.key)}
            className="text-left bg-white border border-gray-200/90 rounded-card p-4 hover:border-primary-border card-hover shadow-xs transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${t.color} text-white flex items-center justify-center shadow-xs`}>
                {t.icon}
              </span>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.value}</span>
            </div>
            <p className="mt-3 text-xs sm:text-sm font-bold text-slate-800 line-clamp-1">{t.key}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{t.sub}</p>
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
                  <span className={`block h-full rounded-md ${chartFilter === d ? 'bg-primary-dark' : 'bg-primary'} group-hover:opacity-90`} style={{ width: `${Math.max(8, (c / Math.max(1, byDept[0]?.[1] ?? 1)) * 100)}%` }} />
                </span>
                <span className="text-sm font-bold w-6 text-right">{c}</span>
              </button>
            ))}
            {byDept.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">
                No department proposals yet.
              </div>
            )}
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
              {proposals.length === 0 && <p className="text-xs text-slate-400 py-1">No proposals recorded yet.</p>}
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
              {byStatus.length === 0 && <p className="text-sm text-slate-400">No proposals recorded yet.</p>}
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
            {proposals.length === 0 && <p className="text-sm text-slate-400 py-2">No recent proposal activity.</p>}
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
