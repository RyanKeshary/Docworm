import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FileText, LayoutDashboard, CheckSquare, BarChart3, Bell, Settings,
  Menu, X, Search, LogOut, ChevronLeft, FilePlus2, CalendarDays, Bug, User, Database, Shield,
} from 'lucide-react';
import { useData } from './store';

export const STATUS_STYLE: Record<string, string> = {
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Changes Requested': 'bg-orange-50 text-orange-700 border-orange-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  Draft: 'bg-slate-100 text-slate-600 border-slate-200',
  Withdrawn: 'bg-slate-100 text-slate-600 border-slate-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-200',
  'In Progress': 'bg-primary-light text-primary-dark border-primary-border',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function Badge({ text }: { text: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLE[text] ?? 'bg-primary-light text-primary-dark border-primary-border'}`}>
      {text}
    </span>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint: string; icon?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-primary-border rounded-card bg-surface p-8 sm:p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-primary-pale text-primary flex items-center justify-center mb-3 shadow-sm">
        {icon ?? <FileText size={22} />}
      </div>
      <p className="font-semibold text-ink text-base">{title}</p>
      <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">{hint}</p>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-10 rounded-card animate-shimmer" />
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface rounded-card border border-primary-border shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] flex flex-col overflow-hidden animate-fade-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-border">
          <h2 className="font-semibold text-ink text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary-pale text-ink-muted transition-colors" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-primary-border shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-border bg-surface">
          <h2 className="font-semibold text-ink text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary-pale text-ink-muted transition-colors" aria-label="Close panel"><X size={18} /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-xs text-ink-muted mt-1 block">{hint}</span>}
      {error && <span className="text-xs text-rose-600 font-medium mt-1 block">{error}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-card border border-primary-border bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all';
export const btnPrimary = 'inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50';
export const btnGhost = 'inline-flex items-center gap-2 rounded-card border border-primary-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-primary-pale hover:border-primary/30 shadow-sm transition-all disabled:opacity-50';

export function ExportMenu({ onExport }: { onExport: (fmt: 'CSV' | 'XLSX' | 'PDF' | 'Print') => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative print-hidden">
      <button className={btnGhost} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        Export
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-surface border border-primary-border rounded-card shadow-lg z-20 animate-fade-in" role="menu">
          {(['CSV', 'XLSX', 'PDF', 'Print'] as const).map((f) => (
            <button key={f} role="menuitem" className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-primary-pale transition-colors first:rounded-t-card last:rounded-b-card" onClick={() => { onExport(f); setOpen(false); }}>
              {f === 'Print' ? 'Print' : `Download ${f}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, users, setCurrentUserId, notifications, backend, signOut, refresh, backendError, syncState, lastSyncedAt } = useData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const unread = notifications.filter((n) => n.userId === currentUser.id && !n.read).length;

  // Streamlined primary navigation links for core functionality
  const links = [
    { to: '/', label: 'Permission Requests', icon: <FileText size={18} /> },
    { to: '/notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { to: '/settings', label: 'Settings & Database', icon: <Settings size={18} /> },
  ];

  const searchGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/proposals?q=${encodeURIComponent(q.trim())}`);
  };

  const side = (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center justify-between px-4 py-4 border-b border-primary-border">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-dark to-primary text-white flex items-center justify-center shadow-sm">
            <FileText size={19} />
          </span>
          {!collapsed && (
            <div>
              <span className="font-bold text-lg text-ink tracking-tight block">Docworm</span>
              <span className="text-[10px] text-ink-muted font-medium uppercase tracking-wider block -mt-1">Institutional Portal</span>
            </div>
          )}
        </Link>
        {mobileOpen && (
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-primary-pale text-ink-muted">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Primary">
        {links.map((l) => (
          <NavLink
            key={l.to + l.label}
            to={l.to}
            end={l.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary-light text-primary font-semibold'
                : 'text-ink-muted hover:bg-primary-pale hover:text-ink'
            }`}
          >
            <span className="shrink-0">{l.icon}</span>
            {!collapsed && <span className="truncate">{l.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-primary-border space-y-2 bg-page">
        <Link
          to="/settings?tab=database"
          onClick={() => setMobileOpen(false)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-card text-xs font-medium border border-primary-border bg-surface hover:border-primary/40 hover:bg-primary-pale text-ink transition-colors"
          title="Inspect database and backend access"
        >
          <Database size={14} className={backend === 'supabase' ? 'text-emerald-600' : 'text-primary'} />
          {!collapsed && (
            <span className="truncate">
              Database: {backend === 'supabase' ? 'Supabase' : 'Local Storage'}
            </span>
          )}
        </Link>

        {backend === 'local' && (
          <button
            onClick={() => setDevOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-card text-xs font-semibold border border-primary-border text-primary bg-primary-pale hover:bg-primary-light transition-colors"
          >
            <User size={14} /> {!collapsed && `Switch Role: ${currentUser.role}`}
          </button>
        )}

        {!collapsed && (
          <div className="px-1 py-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary-light text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink truncate">{currentUser.name}</p>
                <p className="text-[11px] text-ink-muted truncate">{currentUser.role} • {currentUser.department}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-page">
      <aside className={`hidden lg:block border-r border-primary-border bg-surface transition-all ${collapsed ? 'w-16' : 'w-60'} shrink-0 sticky top-0 h-screen z-20`}>
        {side}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-surface shadow-2xl animate-slide-in">{side}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-primary-border print-hidden">
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <button className="lg:hidden p-2 rounded-lg hover:bg-primary-pale text-ink" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <button className="hidden lg:block p-2 rounded-lg hover:bg-primary-pale text-ink-muted" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar"><ChevronLeft size={18} className={collapsed ? 'rotate-180 transition-transform' : 'transition-transform'} /></button>

            <form onSubmit={searchGo} className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-ink-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search ref no, event name, department..."
                  className={`${inputCls} pl-9 py-1.5 text-xs sm:text-sm`}
                  aria-label="Global search"
                />
              </div>
            </form>

            <div className="flex-1 sm:hidden" />

            {/* Database status chip — links to Settings → Database tab */}
            <Link
              to="/settings?tab=database"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                backend === 'supabase'
                  ? syncState === 'live'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : syncState === 'loading'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-primary-light text-primary border-primary-border hover:bg-primary-pale'
              }`}
              title="Database Access & Status. Click to inspect."
            >
              <span className={`w-2 h-2 rounded-full ${backend === 'supabase' ? (syncState === 'live' ? 'bg-emerald-500 animate-pulse-dot' : syncState === 'loading' ? 'bg-amber-500' : 'bg-rose-500') : 'bg-primary animate-pulse-dot'}`} />
              <span className="hidden md:inline">
                {backend === 'supabase' ? (syncState === 'live' ? 'Database: Supabase Live' : syncState === 'loading' ? 'Database: Syncing...' : 'Database: Offline') : 'Database: Local'}
              </span>
              <span className="md:hidden">DB</span>
            </Link>

            <button
              onClick={() => nav('/notifications')}
              className="relative p-2 rounded-lg hover:bg-primary-pale text-ink-muted transition-colors"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>

            <button
              onClick={() => { signOut(); nav('/login'); }}
              className="p-2 rounded-lg hover:bg-rose-50 text-ink-muted hover:text-rose-600 transition-colors"
              title="Sign Out"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>

          {backend === 'supabase' && (
            <button
              onClick={refresh}
              className="w-full text-left px-4 py-1 text-[11px] text-ink-muted hover:text-primary border-t border-primary-border bg-page/60 flex items-center justify-between"
            >
              <span>{syncState === 'live' ? `Connected to college database (synced ${lastSyncedAt ?? 'just now'})` : syncState === 'loading' ? 'Syncing with Supabase...' : 'Database connection interrupted. Showing cached state.'}</span>
              <span className="font-semibold text-primary">Click to refresh</span>
            </button>
          )}
        </header>

        {syncState === 'offline' && (
          <div className="mx-4 sm:mx-6 mt-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-card px-3 py-2 print-hidden flex items-center gap-2" role="alert">
            <span className="flex-1">Connection to the college database was lost. Your view may be out of date.</span>
            <button onClick={refresh} className="px-2.5 py-1 font-bold rounded-md bg-rose-600 text-white">Retry</button>
          </div>
        )}
        {backendError && (
          <div className="mx-4 sm:mx-6 mt-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-card px-3 py-2 print-hidden" role="status">
            Sync note: {backendError}
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      {devOpen && (
        <Modal title="Switch Active Account" onClose={() => setDevOpen(false)}>
          <p className="text-sm text-ink-muted mb-3">Select an account to test permissions and approvals as that role.</p>
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => { setCurrentUserId(u.id); setDevOpen(false); nav('/'); }}
                className={`w-full text-left px-3 py-2 rounded-card border text-sm transition-colors ${
                  u.id === currentUser.id
                    ? 'border-primary bg-primary-light text-ink'
                    : 'border-primary-border hover:bg-primary-pale text-ink'
                }`}
              >
                <span className="font-semibold">{u.name}</span>
                <span className="text-ink-muted">, {u.role}, {u.department}, {u.email}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AttachmentUploader({ files, onChange, max = 5 }: {
  files: { id: string; name: string; size: string; kind: string; storagePath?: string }[];
  onChange: (files: { id: string; name: string; size: string; kind: string; storagePath?: string }[]) => void;
  max?: number;
}) {
  const { uploadFile, backend, currentUser } = useData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!list.length) return;
    if (files.length + list.length > max) {
      setErr(`Maximum ${max} files allowed.`);
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const uploaded = [];
      for (const f of list) {
        if (backend === 'supabase') {
          const meta = await uploadFile(f);
          uploaded.push({ id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...meta });
        } else {
          uploaded.push({
            id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: f.name, size: '', kind: 'File', storagePath: '',
          });
        }
      }
      onChange([...files, ...uploaded]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (f: { name: string; storagePath?: string }) => {
    if (!f.storagePath || backend !== 'supabase') return;
    try {
      const { supabase } = await import('./lib/supabase');
      const { signedDownloadUrl } = await import('./lib/backend');
      const url = await signedDownloadUrl(supabase(), f.storagePath);
      window.open(url, '_blank', 'noopener');
    } catch {
      setErr('Could not generate a download link. Try again.');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className={`${btnGhost} cursor-pointer`}>
          {busy ? 'Uploading...' : 'Upload files'}
          <input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={pick} disabled={busy} aria-label="Upload attachments" />
        </label>
        <span className="text-xs text-ink-muted">
          {files.length} of {max} files. PDF, DOC, DOCX, images only, 10 MB each.
          {backend === 'local' && ' Files stored in local storage.'}
        </span>
      </div>
      {err && <p className="text-xs text-rose-600 mt-1" role="alert">{err}</p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm border border-primary-border rounded-card px-2.5 py-1.5 bg-page">
              <span className="font-medium flex-1 truncate text-ink">{f.name}</span>
              <span className="text-xs text-ink-muted">{f.size || f.kind}</span>
              {f.storagePath && (
                <button onClick={() => download(f)} className="text-xs text-primary font-semibold hover:text-primary-dark">Download</button>
              )}
              <button onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="text-xs text-rose-500 hover:text-rose-700" aria-label={`Remove ${f.name}`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <span className="hidden">{currentUser.id}</span>
    </div>
  );
}
