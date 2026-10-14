import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppOptions } from './config';
import { DEFAULT_OPTIONS } from './config';
import type { AuditLog, CompletionReport, Notification, Proposal, ProposalComment, Task, User } from './types';
import { SEED_AUDIT, SEED_COMMENTS, SEED_NOTIFICATIONS, SEED_PROPOSALS, SEED_TASKS, SEED_USERS } from './seed';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  insertAudit, insertComment, insertNotification, loadWorkspace,
  nextRefNumber, persistProposal, persistTask, upsertCompletion,
  upsertProfile, upsertSettings, uploadAttachment,
} from './lib/backend';

export type CompletionMap = { [proposalId: string]: CompletionReport };

interface DataState {
  users: User[];
  proposals: Proposal[];
  tasks: Task[];
  comments: ProposalComment[];
  notifications: Notification[];
  audit: AuditLog[];
  completions: CompletionMap;
  options: AppOptions;
  letterhead: { collegeName: string; address: string; phone: string; email: string };
  currentUserId: string;
  currentUser: User;
  backend: 'local' | 'supabase';
  authLoading: boolean;
  backendError: string;
  syncState: 'live' | 'loading' | 'offline';
  lastSyncedAt: string | null;
  liveTick: number;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setCurrentUserId: (id: string) => void;
  getNextRefNumber: (cellOrDept: string, category: string, year: string) => Promise<string>;
  uploadFile: (file: File) => Promise<{ name: string; size: string; kind: string; storagePath: string }>;
  saveProposals: (p: Proposal[]) => void;
  saveTasks: (t: Task[]) => void;
  saveComments: (c: ProposalComment[]) => void;
  saveNotifications: (n: Notification[]) => void;
  saveCompletions: (c: CompletionMap) => void;
  saveOptions: (o: AppOptions) => void;
  saveUsers: (u: User[]) => void;
  saveLetterhead: (l: { collegeName: string; address: string; phone: string; email: string }) => void;
  pushNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'> & { read?: boolean }) => void;
  pushAudit: (a: Omit<AuditLog, 'id' | 'createdAt'>) => void;
  signUp: (user: Omit<User, 'id'>) => Promise<string | null>;
  resetDemo: () => void;
  purgeFakeData: () => void;
}

const Ctx = createContext<DataState | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('docworm:' + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Purge legacy demo proposals, tasks, comments, notifications, audit logs from earlier builds
    if (key === 'proposals' && Array.isArray(parsed) && parsed.some((p: { id?: string }) => p.id === 'p-hackathon' || p.id === 'p-robo')) {
      localStorage.removeItem('docworm:' + key);
      return fallback;
    }
    if (key === 'tasks' && Array.isArray(parsed) && parsed.some((t: { id?: string }) => t.id === 't1' || t.id === 't2')) {
      localStorage.removeItem('docworm:' + key);
      return fallback;
    }
    if (key === 'comments' && Array.isArray(parsed) && parsed.some((c: { id?: string }) => c.id === 'c1')) {
      localStorage.removeItem('docworm:' + key);
      return fallback;
    }
    if (key === 'notifications' && Array.isArray(parsed) && parsed.some((n: { id?: string }) => n.id === 'n1')) {
      localStorage.removeItem('docworm:' + key);
      return fallback;
    }
    if (key === 'audit' && Array.isArray(parsed) && parsed.some((a: { id?: string }) => a.id === 'l1')) {
      localStorage.removeItem('docworm:' + key);
      return fallback;
    }
    if (key === 'users' && Array.isArray(parsed) && parsed.some((u: { name?: string }) => u.name === 'Dr. S. R. Patil')) {
      localStorage.removeItem('docworm:' + key);
      return fallback;
    }
    return parsed as T;
  } catch { return fallback; }
}
function persist(key: string, val: unknown) {
  try { localStorage.setItem('docworm:' + key, JSON.stringify(val)); } catch { /* noop */ }
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DEFAULT_LETTERHEAD = {
  collegeName: 'Shree L.R. Tiwari College of Engineering',
  address: 'Shree L.R. Tiwari College of Engineering, Mira Road (East), Thane 401107',
  phone: '+91 22 2812 1234',
  email: 'office@slrtce.in',
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const backend: 'local' | 'supabase' = isSupabaseConfigured ? 'supabase' : 'local';
  const [users, setUsers] = useState<User[]>(() => load('users', SEED_USERS));
  const [proposals, setProposals] = useState<Proposal[]>(() => load('proposals', SEED_PROPOSALS));
  const [tasks, setTasks] = useState<Task[]>(() => load('tasks', SEED_TASKS));
  const [comments, setComments] = useState<ProposalComment[]>(() => load('comments', SEED_COMMENTS));
  const [notifications, setNotifications] = useState<Notification[]>(() => load('notifications', SEED_NOTIFICATIONS));
  const [audit, setAudit] = useState<AuditLog[]>(() => load('audit', SEED_AUDIT));
  const [completions, setCompletions] = useState<CompletionMap>(() => load('completions', {} as CompletionMap));
  const [options, setOptions] = useState<AppOptions>(() => load('options', DEFAULT_OPTIONS));
  const [letterhead, setLetterhead] = useState(() => load('letterhead', DEFAULT_LETTERHEAD));
  const [currentUserId, setCurrentUserIdState] = useState<string>(() => (backend === 'local' ? load('session', 'u-principal') : ''));
  const [authLoading, setAuthLoading] = useState(backend === 'supabase');
  const [backendError, setBackendError] = useState('');
  const [syncState, setSyncState] = useState<'live' | 'loading' | 'offline'>(backend === 'supabase' ? 'loading' : 'live');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState(0);

  // Last state confirmed in Supabase, used to persist only what changed.
  const snap = useRef<{ proposals: Map<string, string>; tasks: Map<string, string> }>({
    proposals: new Map(), tasks: new Map(),
  });
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);

  const reportErr = (where: string, e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setBackendError(`${where}: ${msg}`);
  };

  const applyWorkspace = (w: Awaited<ReturnType<typeof loadWorkspace>>) => {
    if (w.users.length) setUsers(w.users);
    setProposals(w.proposals);
    setTasks(w.tasks);
    setComments(w.comments);
    setNotifications(w.notifications);
    setAudit(w.audit);
    setCompletions(w.completions);
    if (w.options && Object.keys(w.options).length) {
      setOptions((prev) => ({ ...DEFAULT_OPTIONS, ...prev, ...(w.options as unknown as AppOptions) }));
    }
    if (w.letterhead && w.letterhead.collegeName) {
      setLetterhead({
        collegeName: w.letterhead.collegeName ?? DEFAULT_LETTERHEAD.collegeName,
        address: w.letterhead.address ?? DEFAULT_LETTERHEAD.address,
        phone: w.letterhead.phone ?? DEFAULT_LETTERHEAD.phone,
        email: w.letterhead.email ?? DEFAULT_LETTERHEAD.email,
      });
    }
    snap.current = {
      proposals: new Map(w.proposals.map((p) => [p.id, JSON.stringify(p)])),
      tasks: new Map(w.tasks.map((t) => [t.id, JSON.stringify(t)])),
    };
    setLastSyncedAt(nowStr());
    setSyncState('live');
    setBackendError('');
  };

  const loadWithRetry = async (tries = 3): Promise<boolean> => {
    const sb = supabase();
    const { data } = await sb.auth.getSession();
    if (!data.session) return false;
    let last: unknown = null;
    for (let i = 0; i < tries; i++) {
      try {
        applyWorkspace(await loadWorkspace(sb));
        return true;
      } catch (e) {
        last = e;
        await new Promise((res) => setTimeout(res, 800 * (i + 1)));
      }
    }
    reportErr('Could not reach the college database', last);
    setSyncState('offline');
    return false;
  };

  const refresh = async () => {
    if (backend !== 'supabase') return;
    setSyncState('loading');
    await loadWithRetry(2);
  };

  // Initial session check for Supabase mode.
  useEffect(() => {
    if (backend !== 'supabase') return;
    (async () => {
      try {
        const sb = supabase();
        const { data } = await sb.auth.getSession();
        if (data.session?.user) {
          const ok = await loadWithRetry(3);
          if (ok) setCurrentUserIdState(data.session.user.id);
        } else {
          setSyncState('live');
        }
      } catch (e) { reportErr('Startup sync failed', e); setSyncState('offline'); }
      finally { setAuthLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: refresh shortly after any relevant change so every screen stays live.
  useEffect(() => {
    if (backend !== 'supabase' || !currentUserId) return;
    let cancelled = false;
    try {
      const sb = supabase();
      const schedule = () => {
        setLiveTick((t) => t + 1);
        if (rtTimer.current) clearTimeout(rtTimer.current);
        rtTimer.current = setTimeout(() => { if (!cancelled) refresh(); }, 1500);
      };
      const ch = sb
        .channel('docworm-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docworm_proposals' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docworm_tasks' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docworm_comments' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docworm_completion_reports' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docworm_notifications', filter: `user_id=eq.${currentUserId}` }, schedule)
        .subscribe();
      channelRef.current = ch;
    } catch { /* realtime unavailable, manual refresh still works */ }
    return () => {
      cancelled = true;
      if (rtTimer.current) clearTimeout(rtTimer.current);
      try { channelRef.current?.unsubscribe(); } catch { /* noop */ }
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, currentUserId]);

  // Local mode persistence only. Supabase mode persists per change below.
  useEffect(() => { if (backend === 'local') persist('users', users); }, [users, backend]);
  useEffect(() => { if (backend === 'local') persist('proposals', proposals); }, [proposals, backend]);
  useEffect(() => { if (backend === 'local') persist('tasks', tasks); }, [tasks, backend]);
  useEffect(() => { if (backend === 'local') persist('comments', comments); }, [comments, backend]);
  useEffect(() => { if (backend === 'local') persist('notifications', notifications); }, [notifications, backend]);
  useEffect(() => { if (backend === 'local') persist('audit', audit); }, [audit, backend]);
  useEffect(() => { if (backend === 'local') persist('completions', completions); }, [completions, backend]);
  useEffect(() => { if (backend === 'local') persist('options', options); }, [options, backend]);
  useEffect(() => { if (backend === 'local') persist('letterhead', letterhead); }, [letterhead, backend]);
  useEffect(() => { if (backend === 'local') persist('session', currentUserId); }, [currentUserId, backend]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0] ?? {
      id: 'guest',
      name: 'Staff User',
      email: '',
      role: 'Faculty',
      department: 'HAS',
      designation: 'Staff',
      phone: '',
      password: '',
    },
    [users, currentUserId],
  );

  const signIn = async (email: string, password: string): Promise<string | null> => {
    setBackendError('');
    if (backend === 'local') {
      const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
      if (!u) return 'Invalid email or password.';
      setCurrentUserIdState(u.id);
      return null;
    }
    try {
      const sb = supabase();
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return error.message;
      const uidNow = data.user.id;
      setSyncState('loading');
      const w = await loadWorkspace(sb);
      applyWorkspace(w);
      setCurrentUserIdState(uidNow);
      const me = w.users.find((u) => u.id === uidNow);
      if (!me) return 'Signed in, but no staff profile exists for this account. Ask the principal to create one.';
      return null;
    } catch (e) {
      setSyncState('offline');
      return e instanceof Error ? e.message : 'Sign in failed.';
    }
  };

  const signUp = async (newUser: Omit<User, 'id'>): Promise<string | null> => {
    if (!newUser.email.trim() || !newUser.password) return 'Email and password are required.';
    const emailNorm = newUser.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
      return 'An account with this email already exists.';
    }
    const createdUser: User = {
      ...newUser,
      id: `u-${Date.now().toString(36)}`,
      email: emailNorm,
    };
    const updatedUsers = [...users, createdUser];
    setUsers(updatedUsers);
    if (backend === 'local') {
      persist('users', updatedUsers);
      setCurrentUserIdState(createdUser.id);
    }
    return null;
  };

  const signOut = async () => {
    if (backend === 'supabase') {
      try { await supabase().auth.signOut(); } catch { /* noop */ }
      setCurrentUserIdState('');
    } else {
      localStorage.removeItem('docworm:session');
    }
  };

  const getNextRefNumber = async (cellOrDept: string, category: string, year: string): Promise<string> => {
    const cat = category.replace(/[^A-Za-z]/g, '').slice(0, 12) || 'General';
    if (backend === 'supabase') {
      try {
        const n = await nextRefNumber(supabase(), year);
        return `SLRTCE/${cellOrDept}/${cat}/${year}-${String(n).padStart(3, '0')}`;
      } catch (e) { reportErr('Ref number fallback to local count', e); }
    }
    const count = proposals.length + 1;
    return `SLRTCE/${cellOrDept}/${cat}/${year}-${String(count).padStart(3, '0')}`;
  };

  const uploadFile = async (file: File) => {
    if (backend !== 'supabase') {
      return { name: file.name, size: '', kind: 'File', storagePath: '' };
    }
    return uploadAttachment(supabase(), currentUserId, file);
  };

  const saveProposals: DataState['saveProposals'] = (next) => {
    setProposals(next);
    if (backend !== 'supabase') return;
    const sb = supabase();
    next.forEach((p) => {
      const prev = snap.current.proposals.get(p.id);
      const now = JSON.stringify(p);
      if (prev !== now) {
        snap.current.proposals.set(p.id, now);
        persistProposal(sb, p).catch((e) => reportErr(`Sync proposal ${p.refNo} failed`, e));
      }
    });
  };

  const saveTasks: DataState['saveTasks'] = (next) => {
    setTasks(next);
    if (backend !== 'supabase') return;
    const sb = supabase();
    next.forEach((t) => {
      const prev = snap.current.tasks.get(t.id);
      const now = JSON.stringify(t);
      if (prev !== now) {
        snap.current.tasks.set(t.id, now);
        persistTask(sb, t).catch((e) => reportErr(`Sync task ${t.title} failed`, e));
      }
    });
  };

  // Debounced settings writer: keystroke level saves collapse into one write,
  // and empty payloads are never sent, so settings cannot be blanked by a race.
  const queueSettingsWrite = (nextOptions: AppOptions, nextHead: typeof letterhead) => {
    if (backend !== 'supabase') return;
    if (!Object.keys(nextOptions).length || !nextHead.collegeName) return;
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      upsertSettings(supabase(), nextOptions, nextHead).catch((e) => reportErr('Sync settings failed', e));
    }, 800);
  };

  const value: DataState = {
    users, proposals, tasks, comments, notifications, audit, completions, options, letterhead,
    currentUserId, currentUser, backend, authLoading, backendError,
    syncState, lastSyncedAt, liveTick,
    isAuthenticated: backend === 'local' ? true : Boolean(currentUserId),
    signIn, signOut, refresh,
    setCurrentUserId: setCurrentUserIdState,
    getNextRefNumber, uploadFile,
    saveProposals,
    saveTasks,
    saveComments: (next) => {
      if (backend === 'supabase') {
        const known = new Set(comments.map((c) => c.id));
        next.filter((c) => !known.has(c.id)).forEach((c) =>
          insertComment(supabase(), c).catch((e) => reportErr('Sync comment failed', e)));
      }
      setComments(next);
    },
    saveNotifications: (next) => setNotifications(next),
    saveCompletions: (next) => {
      if (backend === 'supabase') {
        Object.values(next).forEach((c) => {
          if (JSON.stringify(completions[c.proposalId]) !== JSON.stringify(c)) {
            upsertCompletion(supabase(), c).catch((e) => reportErr('Sync report failed', e));
          }
        });
      }
      setCompletions(next);
    },
    saveOptions: (next) => {
      setOptions(next);
      queueSettingsWrite(next, letterhead);
    },
    saveUsers: (next) => {
      setUsers(next);
      if (backend === 'supabase') {
        next.forEach((u) => upsertProfile(supabase(), u).catch((e) => reportErr('Sync user failed', e)));
      }
    },
    saveLetterhead: (next) => {
      setLetterhead(next);
      queueSettingsWrite(options, next);
    },
    pushNotification: (n) => {
      const full: Notification = { ...n, id: uid(), createdAt: nowStr(), read: n.read ?? false };
      setNotifications((prev) => [full, ...prev]);
      if (backend === 'supabase') {
        insertNotification(supabase(), full).catch((e) => reportErr('Sync notification failed', e));
      }
    },
    pushAudit: (a) => {
      const full: AuditLog = { ...a, id: uid(), createdAt: nowStr() };
      setAudit((prev) => [full, ...prev]);
      if (backend === 'supabase') {
        insertAudit(supabase(), full).catch((e) => reportErr('Sync audit failed', e));
      }
    },
    signUp,
    resetDemo: () => {
      localStorage.removeItem('docworm:proposals');
      localStorage.removeItem('docworm:tasks');
      localStorage.removeItem('docworm:comments');
      localStorage.removeItem('docworm:notifications');
      localStorage.removeItem('docworm:audit');
      localStorage.removeItem('docworm:completions');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('docworm:draft')) {
          localStorage.removeItem(k);
        }
      }
      setProposals([]);
      setTasks([]);
      setComments([]);
      setNotifications([]);
      setAudit([]);
      setCompletions({});
      setOptions(DEFAULT_OPTIONS);
      setLetterhead(DEFAULT_LETTERHEAD);
    },
    purgeFakeData: () => {
      localStorage.removeItem('docworm:proposals');
      localStorage.removeItem('docworm:tasks');
      localStorage.removeItem('docworm:comments');
      localStorage.removeItem('docworm:notifications');
      localStorage.removeItem('docworm:audit');
      localStorage.removeItem('docworm:completions');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('docworm:draft')) {
          localStorage.removeItem(k);
        }
      }
      setProposals([]);
      setTasks([]);
      setComments([]);
      setNotifications([]);
      setAudit([]);
      setCompletions({});
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside provider');
  return v;
}
