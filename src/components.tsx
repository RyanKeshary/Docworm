'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from './lib/router-compat';
import {
  FileText, Bell, Settings, Calendar, Ticket,
  Menu, X, Search, LogOut, ChevronLeft, User, Database, Shield, Crown, GraduationCap, Building2, Users,
  HelpCircle,
} from 'lucide-react';
import { useData } from './store';
import { ROLE_META, PERMISSIONS } from './lib/roleUtils';
import { OnboardingGuideModal } from './components/OnboardingGuideModal';
import { PrincipalDepartureAlert } from './components/PrincipalDepartureAlert';

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
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs" onClick={onClose} />
      <div className={`relative bg-surface rounded-card border border-primary-border shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-auto max-h-[min(90vh,780px)] flex flex-col overflow-hidden animate-fade-in z-10`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-border shrink-0 bg-surface">
          <h2 className="font-semibold text-ink text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary-pale text-ink-muted transition-colors" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
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
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const nav = useNavigate();
  const unread = notifications.filter((n) => n.userId === currentUser.id && !n.read).length;
  const role = currentUser.role;
  const roleMeta = ROLE_META[role] ?? ROLE_META.Faculty;

  // Auto-show guide strictly once on first-time login
  useEffect(() => {
    if (currentUser?.id && currentUser.id !== 'guest') {
      const key = `docworm_guide_seen_${currentUser.id}`;
      if (!localStorage.getItem(key)) {
        setGuideOpen(true);
        localStorage.setItem(key, 'true');
      }
    }
  }, [currentUser?.id]);

  // Role-specific navigation
  const allLinks = [
    { to: '/', label: 'Permission Requests', icon: <FileText size={18} />, roles: ['Principal', 'Dean', 'HOD', 'Faculty', 'Office Admin'] },
    { to: '/gate-pass', label: 'Employee Gate Pass', icon: <Ticket size={18} />, roles: ['Principal', 'Dean', 'HOD', 'Faculty', 'Office Admin'] },
    { to: '/notifications', label: 'Notifications', icon: <Bell size={18} />, roles: ['Principal', 'Dean', 'HOD', 'Faculty', 'Office Admin'] },
    { to: '/settings', label: 'Settings & Admin', icon: <Settings size={18} />, roles: ['Principal'] },
    { to: '/settings', label: 'Settings', icon: <Settings size={18} />, roles: ['Dean', 'HOD', 'Faculty', 'Office Admin'] },
  ];

  // De-dupe by role visibility
  const links = allLinks.filter((l) => l.roles.includes(role));
  // Remove duplicate '/settings' — keep only the first match for this role
  const seen = new Set<string>();
  const dedupedLinks = links.filter((l) => {
    const k = l.to;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const searchGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/proposals?q=${encodeURIComponent(q.trim())}`);
  };

  const side = (
    <div className="flex flex-col h-full bg-surface">
      {/* App logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-primary-border">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Docworm" className="w-9 h-9 rounded-xl object-contain shadow-xs" />
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

      {/* Role badge */}
      {!collapsed && (
        <div className={`mx-3 mt-3 mb-1 px-3 py-2 rounded-lg border ${roleMeta.border} ${roleMeta.bg} flex items-center gap-2`}>
          <span className="text-base">{roleMeta.icon}</span>
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${roleMeta.accent}`}>{role}</p>
            <p className="text-[10px] text-ink-muted truncate max-w-[140px]">{currentUser.name}</p>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Primary">
        {!collapsed && <p className="text-[10px] text-ink-muted uppercase font-semibold px-3 pb-1 pt-1">Navigation</p>}
        {dedupedLinks.map((l) => (
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
        <button
          onClick={() => { setGuideOpen(true); setMobileOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-card text-xs font-semibold border border-primary-border bg-surface hover:bg-primary-pale text-ink transition-colors"
          title="Open interactive walkthrough & guide"
        >
          <HelpCircle size={14} className="text-primary" />
          {!collapsed && <span className="truncate">Portal Guide &amp; Roles</span>}
        </button>

        <button
          onClick={async () => {
            await signOut();
            nav('/login');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-card text-xs font-semibold border border-rose-200 text-rose-700 bg-rose-50/70 hover:bg-rose-100 transition-colors"
          title="Sign out of Docworm"
        >
          <LogOut size={14} /> {!collapsed && 'Sign Out'}
        </button>

        {!collapsed && (
          <div className="px-1 py-1">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full ${roleMeta.bg} border ${roleMeta.border} font-bold text-xs flex items-center justify-center shrink-0`}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink truncate">{currentUser.name}</p>
                <p className={`text-[11px] truncate ${roleMeta.accent}`}>
                  {currentUser.role}{currentUser.department ? ` • ${currentUser.department}` : (currentUser.role === 'Principal' || currentUser.role === 'Dean' ? ' • All Depts' : '')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-page font-sans">
      <aside className={`hidden lg:flex border-r border-primary-border bg-surface transition-all ${collapsed ? 'w-16' : 'w-60'} shrink-0 h-full flex-col z-20`}>
        {side}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-surface shadow-2xl animate-slide-in">{side}</div>
        </div>
      )}

      <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
        {/* Fixed header pinned strictly to top with clean height */}
        <header className="h-16 shrink-0 z-30 bg-surface/95 backdrop-blur-md border-b border-primary-border/80 print-hidden shadow-xs flex items-center">
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 w-full">
            {/* Left Zone: Sidebar toggles & Institutional Identity */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-primary-pale text-ink transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={19} />
              </button>
              <button
                className="hidden lg:flex items-center justify-center p-2 rounded-xl hover:bg-primary-pale text-ink-muted transition-colors border border-transparent hover:border-primary-border/60"
                onClick={() => setCollapsed((c) => !c)}
                aria-label="Toggle sidebar"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronLeft size={18} className={collapsed ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {collapsed && (
                <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-primary-border/60 ml-1">
                  <span className="text-xs font-bold text-ink">Docworm</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-pale text-primary font-semibold uppercase">{currentUser.role}</span>
                </div>
              )}
            </div>

            {/* Center Zone: Search bar (prominent & centered) */}
            <div className="flex-1 max-w-xl mx-auto hidden sm:block">
              <form onSubmit={searchGo} className="relative w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted/70" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search ref no, event name, department..."
                  className={`${inputCls} pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50/80 focus:bg-white border-slate-200/80 rounded-xl transition-all shadow-2xs`}
                  aria-label="Global search"
                />
              </form>
            </div>

            {/* Right Zone: Actions, Live Indicator, Notifications, and Profile */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 ml-auto">

              {/* How-to Guide */}
              <button
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-primary/20 bg-primary-pale text-primary hover:bg-primary-light transition-all shadow-2xs"
                title={`${currentUser.role} Interactive Guide & Walkthrough`}
              >
                <HelpCircle size={14} className="shrink-0" />
                <span className="hidden sm:inline font-medium">Guide</span>
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => nav('/notifications')}
                className="relative p-2 rounded-xl hover:bg-primary-pale text-ink-muted hover:text-ink transition-colors border border-transparent hover:border-primary-border/60"
                aria-label={`Notifications, ${unread} unread`}
                title="Notifications"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                    {unread}
                  </span>
                )}
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* User Profile Chip */}
              <div className="hidden md:flex items-center gap-2 pl-1 py-0.5">
                <span className={`w-8 h-8 rounded-full ${roleMeta.bg} border ${roleMeta.border} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <div className="text-left hidden lg:block leading-tight">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{currentUser.name}</p>
                  <p className={`text-[10px] font-medium truncate ${roleMeta.accent}`}>{currentUser.role}</p>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={() => { signOut(); nav('/login'); }}
                className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-200"
                title="Sign Out"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <OnboardingGuideModal
        isOpen={guideOpen}
        onClose={() => {
          if (currentUser?.id) {
            localStorage.setItem(`docworm_guide_seen_${currentUser.id}`, 'true');
          }
          setGuideOpen(false);
        }}
        currentUser={currentUser}
      />

      <PrincipalDepartureAlert />
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
