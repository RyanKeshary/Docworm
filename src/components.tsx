import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText, LayoutDashboard, CheckSquare, BarChart3, Bell, Settings,
  Menu, X, Search, LogOut, ChevronLeft, FilePlus2, CalendarDays, Bug, User,
} from 'lucide-react';
import { useData } from './store';

export const STATUS_STYLE: Record<string, string> = {
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Completed: 'bg-green-100 text-green-800 border-green-200',
  Submitted: 'bg-amber-100 text-amber-800 border-amber-200',
  'Under Review': 'bg-amber-100 text-amber-800 border-amber-200',
  'Changes Requested': 'bg-amber-100 text-amber-800 border-amber-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Overdue: 'bg-red-100 text-red-800 border-red-200',
  Draft: 'bg-gray-100 text-gray-700 border-gray-200',
  Withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  'Not Started': 'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
  Cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function Badge({ text }: { text: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLE[text] ?? 'bg-purple-100 text-purple-800 border-purple-200'}`}>
      {text}
    </span>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint: string; icon?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-card bg-white p-10 text-center">
      <div className="mx-auto w-10 h-10 rounded-lg bg-primary-pale text-primary flex items-center justify-center mb-3">
        {icon ?? <FileText size={20} />}
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-sm text-slate-500 mt-1">{hint}</p>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-card" />
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className={`relative bg-white rounded-card border border-gray-200 shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-auto animate-fade-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-xl overflow-auto animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100" aria-label="Close panel"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-xs text-slate-500 mt-1 block">{hint}</span>}
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-card border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none';
export const btnPrimary = 'inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-2 transition-colors disabled:opacity-50';
export const btnGhost = 'inline-flex items-center gap-2 rounded-card border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 transition-colors';

export function ExportMenu({ onExport }: { onExport: (fmt: 'CSV' | 'XLSX' | 'PDF' | 'Print') => void }) {  const [open, setOpen] = useState(false);
  return (
    <div className="relative print-hidden">
      <button className={btnGhost} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        Export
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-card shadow-lg z-20" role="menu">
          {(['CSV', 'XLSX', 'PDF', 'Print'] as const).map((f) => (
            <button key={f} role="menuitem" className="w-full text-left px-4 py-2 text-sm hover:bg-primary-pale" onClick={() => { onExport(f); setOpen(false); }}>
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

  const links = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ...(currentUser.role !== 'Principal' ? [{ to: '/faculty', label: 'My Panel', icon: <User size={18} /> }] : []),
    { to: '/proposals', label: 'Proposals', icon: <FileText size={18} /> },
    { to: '/proposals/new', label: 'New Proposal', icon: <FilePlus2 size={18} /> },
    { to: '/tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
    { to: '/calendar', label: 'Calendar', icon: <CalendarDays size={18} /> },
    { to: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { to: '/notifications', label: 'Notifications', icon: <Bell size={18} /> },
    ...(currentUser.role === 'Principal' ? [{ to: '/settings', label: 'Settings', icon: <Settings size={18} /> }] : []),
  ];

  const searchGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/proposals?q=${encodeURIComponent(q.trim())}`);
  };

  const side = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"><FileText size={18} /></span>
        {!collapsed && <span className="font-bold text-lg text-primary">Docworm</span>}
      </div>
      <nav className="flex-1 overflow-auto p-3 space-y-1" aria-label="Primary">
        {links.map((l) => (
          <NavLink
            key={l.to + l.label}
            to={l.to}
            end={l.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-card text-sm font-medium transition-colors ${isActive ? 'bg-primary-light text-primary-dark' : 'text-slate-600 hover:bg-gray-100'}`}
          >
            {l.icon}
            {!collapsed && l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100 space-y-2">
        {backend === 'local' && (
          <button onClick={() => setDevOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-card text-xs font-medium border border-dashed border-primary-border text-primary-dark bg-primary-pale hover:bg-primary-light">
            <Bug size={14} /> {!collapsed && `Dev menu: ${currentUser.role}`}
          </button>
        )}
        {!collapsed && (
          <div className="px-1">
            <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 truncate">{currentUser.role} | {currentUser.department}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <aside className={`hidden lg:block border-r border-gray-200 bg-white transition-all ${collapsed ? 'w-16' : 'w-60'} shrink-0 sticky top-0 h-screen`}>
        {side}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white animate-slide-in">{side}</div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 print-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <button className="lg:hidden p-2 rounded-md hover:bg-gray-100" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
            <button className="hidden lg:block p-2 rounded-md hover:bg-gray-100" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar"><ChevronLeft size={18} /></button>
            <form onSubmit={searchGo} className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref no, event, person" className={`${inputCls} pl-9`} aria-label="Global search" />
              </div>
            </form>
            <div className="flex-1 sm:hidden" />
            <button onClick={() => nav('/notifications')} className="relative p-2 rounded-md hover:bg-gray-100" aria-label={`Notifications, ${unread} unread`}>
              <Bell size={18} />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">{unread}</span>}
            </button>
            <button onClick={() => { signOut(); nav('/login'); }} className="p-2 rounded-md hover:bg-gray-100" aria-label="Log out"><LogOut size={18} /></button>
          </div>
          {backend === 'supabase' && (
            <button onClick={refresh} className="w-full text-left px-4 py-1 text-[11px] text-slate-500 hover:text-primary border-b border-gray-100">
              {syncState === 'live' && `Live, synced ${lastSyncedAt ?? 'just now'}, click to refresh`}
              {syncState === 'loading' && 'Syncing with college database...'}
              {syncState === 'offline' && 'Offline, showing last loaded data, click to retry'}
            </button>
          )}
        </header>
        {syncState === 'offline' && (
          <div className="mx-4 sm:mx-6 mt-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-card px-3 py-2 print-hidden flex items-center gap-2" role="alert">
            <span className="flex-1">Connection to the college database was lost. Your view may be out of date.</span>
            <button onClick={refresh} className="px-2.5 py-1 font-bold rounded-md bg-red-600 text-white">Retry</button>
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
        <Modal title="Dev menu: role switcher (demo only)" onClose={() => setDevOpen(false)}>
          <p className="text-sm text-slate-600 mb-3">Quickly preview each role. Production builds hide this menu.</p>
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => { setCurrentUserId(u.id); setDevOpen(false); nav('/'); }}
                className={`w-full text-left px-3 py-2 rounded-card border text-sm ${u.id === currentUser.id ? 'border-primary bg-primary-pale' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <span className="font-semibold">{u.name}</span>
                <span className="text-slate-500">, {u.role}, {u.department}, {u.email}</span>
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
        <span className="text-xs text-slate-500">
          {files.length} of {max} files. PDF, DOC, DOCX, images only, 10 MB each.
          {backend === 'local' && ' Files are metadata only in demo mode.'}
        </span>
      </div>
      {err && <p className="text-xs text-red-600 mt-1" role="alert">{err}</p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm border border-gray-200 rounded-md px-2.5 py-1.5">
              <span className="font-medium flex-1 truncate">{f.name}</span>
              <span className="text-xs text-slate-400">{f.size || f.kind}</span>
              {f.storagePath && (
                <button onClick={() => download(f)} className="text-xs text-primary font-semibold">Download</button>
              )}
              <button onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="text-xs text-red-600" aria-label={`Remove ${f.name}`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <span className="hidden">{currentUser.id}</span>
    </div>
  );
}
