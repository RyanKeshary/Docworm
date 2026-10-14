import React, { useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Database, Server, ExternalLink, RefreshCw, Trash2,
  Shield, CheckCircle2, Copy, Check, Info, User as UserIcon, Lock,
} from 'lucide-react';
import { useData, nowStr } from '../store';
import { Badge, Drawer, EmptyState, ExportMenu, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components';
import { REPORT_COLS, computedTaskStatus, detectClashes, exportCSV, exportPDF, exportXLSX, flattenProposal, flattenReport, flattenTask, budgetTotals, exportLetterPDF } from '../utils';
import type { Task } from '../types';

export function TasksList() {
  const { tasks, users, currentUser, saveTasks, pushNotification, pushAudit } = useData();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPriority, setFPriority] = useState('');
  const [search, setSearch] = useState('');
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', taskType: 'Report Submission', priority: 'Medium', assignedTo: [] as string[], dueDate: '' });
  const [detail, setDetail] = useState<Task | null>(null);

  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const list = tasks.filter((t) => {
    if (fType && t.taskType !== fType) return false;
    if (fPriority && t.priority !== fPriority) return false;
    const cs = computedTaskStatus(t.dueDate, t.status);
    if (fStatus && cs !== fStatus) return false;
    if (search && !(t.title + t.description).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const rows = list.map((t) => flattenTask(t, name));
  const [visible, setVisible] = useState(50);
  React.useEffect(() => { setVisible(50); }, [fType, fStatus, fPriority, search]);
  const shown = list.slice(0, visible);
  const cols = ['id', 'title', 'type', 'priority', 'status', 'assignedTo', 'dueDate', 'completionDate'];

  const submitTask = () => {
    if (!form.title.trim() || !form.dueDate || form.assignedTo.length === 0) return;
    const t: Task = {
      id: `t-${Date.now().toString(36)}`, title: form.title, description: form.description,
      taskType: form.taskType, priority: form.priority, assignedBy: currentUser.id,
      assignedByName: currentUser.name, assignedTo: form.assignedTo,
      assignedDate: new Date().toISOString().slice(0, 10), dueDate: form.dueDate,
      status: 'Not Started', attachments: [], updates: [],
    };
    saveTasks([t, ...tasks]);
    form.assignedTo.forEach((uid) => pushNotification({ userId: uid, title: 'New task assigned', body: `${t.title}, due ${t.dueDate}`, link: `/tasks/${t.id}` }));
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Assigned task ${t.title}`, entity: 'Task', entityId: t.id });
    setCreate(false);
    setForm({ title: '', description: '', taskType: 'Report Submission', priority: 'Medium', assignedTo: [], dueDate: '' });
  };

  const boardCols = ['Not Started', 'In Progress', 'Completed', 'Overdue'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div><p className="text-xs text-slate-500">Tasks</p><h1 className="text-2xl font-bold">Task assignments</h1></div>
        <div className="flex-1" />
        <div className="flex bg-gray-100 rounded-card p-1">
          {(['table', 'board'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize ${view === v ? 'bg-white shadow-sm text-primary-dark' : 'text-slate-600'}`}>{v}</button>
          ))}
        </div>
        <ExportMenu onExport={(f) => {
          if (f === 'CSV') exportCSV('docworm-tasks.csv', rows, cols);
          else if (f === 'XLSX') exportXLSX('docworm-tasks.xlsx', rows, cols);
          else if (f === 'PDF') exportPDF('docworm-tasks.pdf', 'Docworm tasks export', cols, rows);
          else window.print();
        }} />
        {currentUser.role === 'Principal' && <button onClick={() => setCreate(true)} className={btnPrimary}><Plus size={15} /> New task</button>}
      </div>

      <div className="flex flex-wrap gap-2 bg-white border border-gray-200 rounded-card p-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className={`${inputCls} !w-48`} aria-label="Search tasks" />
        <select value={fType} onChange={(e) => setFType(e.target.value)} className={`${inputCls} !w-52`} aria-label="Filter by type">
          <option value="">All types</option>
          {['Report Submission', 'Event Coordination', 'Accreditation or NAAC or NBA', 'Admission Related', 'Examination Related', 'Infrastructure', 'Meeting', 'Other'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={`${inputCls} !w-36`} aria-label="Filter by status">
          <option value="">All statuses</option>
          {['Not Started', 'In Progress', 'Completed', 'Overdue'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className={`${inputCls} !w-32`} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {['Low', 'Medium', 'High', 'Urgent'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{list.length} tasks</span>
      </div>

      {list.length === 0 && <EmptyState title="No tasks found" hint="Adjust filters or ask the principal to assign a task." />}

      {view === 'table' && list.length > 0 && (
        <>
          <div className="hidden md:block bg-white border border-gray-200 rounded-card overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-gray-100">
                <th className="p-3">Title</th><th className="p-3">Type</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Assignees</th><th className="p-3">Due</th><th className="p-3">Open</th>
              </tr></thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-primary-pale/40">
                    <td className="p-3 font-medium">{t.title}</td>
                    <td className="p-3 text-slate-600">{t.taskType}</td>
                    <td className="p-3">{t.priority}</td>
                    <td className="p-3"><Badge text={computedTaskStatus(t.dueDate, t.status)} /></td>
                    <td className="p-3 text-xs">{t.assignedTo.map(name).join(', ')}</td>
                    <td className="p-3 text-xs">{t.dueDate}</td>
                    <td className="p-3"><button onClick={() => setDetail(t)} className="text-primary font-semibold">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {shown.map((t) => (
              <button key={t.id} onClick={() => setDetail(t)} className="w-full text-left bg-white border border-gray-200 rounded-card p-4">
                <span className="flex gap-2 items-center"><span className="font-semibold text-sm flex-1">{t.title}</span><Badge text={computedTaskStatus(t.dueDate, t.status)} /></span>
                <span className="text-xs text-slate-500">{t.taskType} | due {t.dueDate}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {view === 'table' && visible < list.length && (
        <button onClick={() => setVisible((v: number) => v + 50)} className={`${btnGhost} w-full justify-center`}>
          Show more ({list.length - visible} remaining)
        </button>
      )}

      {view === 'board' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {boardCols.map((col) => (
            <div key={col} className="bg-gray-50 border border-gray-200 rounded-card p-3">
              <p className="text-sm font-bold flex items-center gap-2"><Badge text={col} /><span className="text-slate-500">{list.filter((t) => computedTaskStatus(t.dueDate, t.status) === col).length}</span></p>
              <div className="mt-2 space-y-2">
                {list.filter((t) => computedTaskStatus(t.dueDate, t.status) === col).slice(0, 20).map((t) => (
                  <button key={t.id} onClick={() => setDetail(t)} className="w-full text-left bg-white border border-gray-200 rounded-card p-3 hover:border-primary-border">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.taskType} | {t.priority} | due {t.dueDate}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.assignedTo.map(name).join(', ')}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {create && (
        <Modal title="Assign task (Principal)" onClose={() => setCreate(false)}>
          <div className="space-y-3">
            <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Example: NBA compliance files" /></Field>
            <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Task type">
                <select value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })} className={inputCls}>
                  {['Report Submission', 'Event Coordination', 'Accreditation or NAAC or NBA', 'Admission Related', 'Examination Related', 'Infrastructure', 'Meeting', 'Other'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                  {['Low', 'Medium', 'High', 'Urgent'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Assign to (searchable)</legend>
              <input placeholder="Type to filter users" className={`${inputCls} mt-1 mb-2`} onChange={(e) => setSearch(e.target.value)} aria-label="Filter users" />
              <div className="max-h-40 overflow-auto border border-gray-200 rounded-card divide-y divide-gray-50">
                {users.filter((u) => u.role !== 'Principal' && (u.name + u.department).toLowerCase().includes(search.toLowerCase())).map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <input type="checkbox" checked={form.assignedTo.includes(u.id)} onChange={() => setForm({ ...form, assignedTo: form.assignedTo.includes(u.id) ? form.assignedTo.filter((x) => x !== u.id) : [...form.assignedTo, u.id] })} className="accent-[#6D4AFF]" />
                    {u.name} <span className="text-xs text-slate-500">({u.role}, {u.department})</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} /></Field>
            <button onClick={submitTask} className={btnPrimary}>Assign task</button>
          </div>
        </Modal>
      )}

      {detail && <TaskDrawer task={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

export function TaskDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const { tasks, saveTasks, users, currentUser, pushAudit, pushNotification } = useData();
  const [text, setText] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const live = tasks.find((t) => t.id === task.id) ?? task;
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const updateStatus = (status: Task['status'], remark?: string) => {
    const upd = { id: `tu-${Date.now()}`, text: remark || `Status set to ${status}`, userId: currentUser.id, userName: currentUser.name, createdAt: nowStr(), statusAfter: status };
    saveTasks(tasks.map((t) => t.id === live.id ? { ...t, status, completionDate: status === 'Completed' ? new Date().toISOString().slice(0, 10) : t.completionDate, updates: [upd, ...t.updates], updatedAt: undefined } as Task : t));
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Set task ${live.title} to ${status}`, entity: 'Task', entityId: live.id });
  };
  const post = () => {
    if (!text.trim()) return;
    saveTasks(tasks.map((t) => t.id === live.id ? { ...t, updates: [{ id: `tu-${Date.now()}`, text, userId: currentUser.id, userName: currentUser.name, createdAt: nowStr() }, ...t.updates] } : t));
    setText('');
  };
  const extend = () => {
    if (!extendDate || !extendReason.trim()) return;
    saveTasks(tasks.map((t) => t.id === live.id ? { ...t, dueDate: extendDate, extendReason, updates: [{ id: `tu-${Date.now()}`, text: `Due date extended to ${extendDate}. Reason: ${extendReason}`, userId: currentUser.id, userName: currentUser.name, createdAt: nowStr() }, ...t.updates] } : t));
    live.assignedTo.forEach((uid) => pushNotification({ userId: uid, title: 'Task due date extended', body: `${live.title} now due ${extendDate}`, link: `/tasks/${live.id}` }));
    setExtendDate(''); setExtendReason('');
  };

  return (
    <Drawer title={live.title} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p><Badge text={computedTaskStatus(live.dueDate, live.status)} /> <span className="text-slate-500 ml-1">{live.taskType} | {live.priority}</span></p>
        <p className="text-slate-700">{live.description}</p>
        <p className="text-xs text-slate-500">Assigned by {live.assignedByName} on {live.assignedDate}, due {live.dueDate}, to {live.assignedTo.map(name).join(', ')}</p>
        {live.extendReason && <p className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">Extension note: {live.extendReason}</p>}
        <div className="flex flex-wrap gap-1.5">
          {(['Not Started', 'In Progress', 'Completed'] as const).map((s) => (
            <button key={s} onClick={() => updateStatus(s)} className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border ${live.status === s ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}>{s}</button>
          ))}
          {currentUser.role === 'Principal' && <button onClick={() => updateStatus('Cancelled', 'Cancelled by principal')} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-red-300 text-red-700">Cancel</button>}
        </div>
        {currentUser.role === 'Principal' && (
          <div className="border border-gray-200 rounded-card p-3 space-y-2">
            <p className="font-semibold text-xs">Extend due date (logged reason)</p>
            <input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} className={inputCls} aria-label="New due date" />
            <input value={extendReason} onChange={(e) => setExtendReason(e.target.value)} placeholder="Reason for extension" className={inputCls} aria-label="Extension reason" />
            <button onClick={extend} className={btnGhost}>Extend</button>
          </div>
        )}
        <div>
          <p className="font-semibold mb-1">Progress comments</p>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add update or completion remark" className={inputCls} aria-label="Add task update" />
            <button onClick={post} className={btnPrimary}>Post</button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {live.updates.map((u) => <li key={u.id} className="border border-gray-100 rounded px-2 py-1.5"><b>{u.userName}</b> <span className="text-xs text-slate-400">{u.createdAt}</span><br />{u.text}</li>)}
            {live.updates.length === 0 && <li className="text-slate-500">No updates yet.</li>}
          </ul>
        </div>
        <Link to={`/tasks/${live.id}`} className="text-primary text-xs font-semibold">Open full task page</Link>
      </div>
    </Drawer>
  );
}

export function TaskDetail() {
  const { id } = useParams();
  const { tasks } = useData();
  const nav = useNavigate();
  const t = tasks.find((x) => x.id === id);
  const [open, setOpen] = useState(true);
  if (!t) return <EmptyState title="Task not found" hint="It may have been removed." />;
  return (
    <div className="space-y-3">
      <button onClick={() => nav(-1)} className="text-sm text-primary font-semibold inline-flex items-center gap-1"><ArrowLeft size={15} /> Back</button>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      {open && <TaskDrawer task={t} onClose={() => { setOpen(false); nav('/tasks'); }} />}
      {!open && <Link to="/tasks" className={btnGhost}>Back to tasks</Link>}
    </div>
  );
}

export function CalendarView() {
  const { proposals } = useData();
  const approved = proposals.filter((p) => ['Approved', 'Completed', 'Under Review', 'Submitted'].includes(p.status));
  const clashes = detectClashes(proposals);
  const days = useMemo(() => {
    const m: Record<string, typeof approved> = {};
    approved.forEach((p) => {
      const d = p.startDate;
      m[d] = [...(m[d] ?? []), p];
    });
    return Object.entries(m).sort();
  }, [approved]);
  return (
    <div className="space-y-4">
      <div><p className="text-xs text-slate-500">Calendar</p><h1 className="text-2xl font-bold">Approved events and room clashes</h1></div>
      {clashes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-sm text-red-800 space-y-1">
          <p className="font-bold">Clash warnings</p>
          {clashes.map((c, i) => <p key={i}>{c}</p>)}
        </div>
      )}
      {days.length === 0 && <EmptyState title="No scheduled events" hint="Approved events will appear here by date." />}
      <div className="space-y-2">
        {days.map(([d, list]) => (
          <div key={d} className="bg-white border border-gray-200 rounded-card p-4">
            <p className="font-bold text-sm">{d}</p>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              {list.map((p) => (
                <Link key={p.id} to={`/proposals/${p.id}`} className="border border-gray-200 rounded-card px-3 py-2 text-sm hover:border-primary-border">
                  <span className="font-semibold">{p.eventName}</span> <Badge text={p.status} />
                  <span className="block text-xs text-slate-500">{p.startTime} to {p.endTime} | {p.resources.map((r) => r.roomNo).filter(Boolean).join(', ') || 'No rooms'}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Reports() {
  const { proposals, tasks, completions, currentUser, pushNotification, pushAudit, letterhead, options } = useData();
  const [year, setYear] = useState('2026-27');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState({ from: '2026-01-01', to: '2026-12-31' });

  const yp = proposals.filter((p) => p.academicYear === year);
  const approvalRate = proposals.length ? Math.round((proposals.filter((p) => ['Approved', 'Completed'].includes(p.status)).length / proposals.length) * 100) : 0;
  const pendingReports = proposals.filter((p) => p.status === 'Approved' && p.endDate < new Date().toISOString().slice(0, 10) && !completions[p.id]);
  const overdueReports = pendingReports.filter((p) => p.endDate < new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10));
  const taskRate = tasks.length ? Math.round((tasks.filter((t) => t.status === 'Completed').length / tasks.length) * 100) : 0;
  const budgetByHead = useMemo(() => {
    const m: Record<string, number> = {};
    proposals.filter((p) => p.hasBudget).forEach((p) => { m[p.budgetHead] = (m[p.budgetHead] ?? 0) + budgetTotals(p).total; });
    return Object.entries(m);
  }, [proposals]);

  const filtered = proposals.filter((p) =>
    (!dept || p.departments.includes(dept)) &&
    (!status || p.status === status) &&
    p.startDate >= range.from && p.startDate <= range.to,
  );
  const cols = ['refNo', 'eventName', 'category', 'status', 'startDate', 'departments', 'submitter', 'participants', 'totalExpenses'];
  const submittedList = proposals
    .filter((p) => completions[p.id])
    .map((p) => ({ p, r: completions[p.id] }));
  const bulkExport = (fmt: 'CSV' | 'XLSX' | 'PDF') => {
    const rows = filtered.map(flattenProposal);
    if (fmt === 'CSV') exportCSV(`docworm-bulk-${range.from}-${range.to}.csv`, rows, cols);
    else if (fmt === 'XLSX') exportXLSX(`docworm-bulk-${range.from}-${range.to}.xlsx`, rows, cols);
    else exportPDF(`docworm-bulk-${range.from}-${range.to}.pdf`, `Docworm bulk export ${range.from} to ${range.to}`, cols, rows);
  };
  const zipLetters = () => {
    filtered.filter((p) => p.status === 'Approved').forEach((p, i) => setTimeout(() => exportLetterPDF(p, letterhead), i * 400));
  };
  const analyticsExport = () => {
    const rows = [{
      academicYear: year, totalProposals: yp.length, approvalRate: `${approvalRate}%`,
      approved: yp.filter((p) => ['Approved', 'Completed'].includes(p.status)).length,
      rejected: yp.filter((p) => p.status === 'Rejected').length,
      budgetUtilization: budgetByHead.map(([h, v]) => `${h}: Rs.${v}`).join('; '),
      taskCompletionRate: `${taskRate}%`,
    }];
    exportXLSX(`docworm-analytics-${year}.xlsx`, rows, Object.keys(rows[0]));
  };

  return (
    <div className="space-y-4">
      <div><p className="text-xs text-slate-500">Reports</p><h1 className="text-2xl font-bold">Completion and analytics</h1></div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold">Analytics export ({year})</h2>
            <div className="flex-1" />
            <select value={year} onChange={(e) => setYear(e.target.value)} className={`${inputCls} !w-32`} aria-label="Academic year">
              {options.academicYears.map((y) => <option key={y}>{y}</option>)}
            </select>
            <button onClick={analyticsExport} className={btnPrimary}>Export summary</button>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              ['Total proposals', String(yp.length)],
              ['Approval rate', `${approvalRate}%`],
              ['Task completion', `${taskRate}%`],
              ['Budget heads', String(budgetByHead.length)],
            ].map(([k, v]) => (
              <div key={k} className="border border-gray-200 rounded-card p-3"><p className="text-xl font-bold">{v}</p><p className="text-xs text-slate-500">{k}</p></div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold">Budget used by head</p>
            <div className="mt-2 space-y-1.5">
              {budgetByHead.map(([h, v]) => (
                <div key={h} className="flex items-center gap-2 text-sm">
                  <span className="w-44 truncate">{h}</span>
                  <span className="flex-1 h-5 bg-gray-100 rounded"><span className="block h-full bg-primary rounded" style={{ width: `${Math.min(100, (v / Math.max(1, ...budgetByHead.map((x) => x[1]))) * 100)}%` }} /></span>
                  <span className="font-semibold text-xs">Rs. {v}</span>
                </div>
              ))}
              {budgetByHead.length === 0 && <p className="text-sm text-slate-500">No budgets yet.</p>}
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <h2 className="font-semibold">Bulk export (principal)</h2>
          <div className="mt-2 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="From"><input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={inputCls} /></Field>
              <Field label="To"><input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={dept} onChange={(e) => setDept(e.target.value)} className={inputCls} aria-label="Department"><option value="">All depts</option>{options.departments.map((d) => <option key={d}>{d}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls} aria-label="Status"><option value="">All statuses</option>{options.proposalStatuses.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
            <p className="text-xs text-slate-500">{filtered.length} proposals match.</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => bulkExport('CSV')} className={btnGhost}>CSV</button>
              <button onClick={() => bulkExport('XLSX')} className={btnGhost}>XLSX</button>
              <button onClick={() => bulkExport('PDF')} className={btnGhost}>PDF</button>
              <button onClick={zipLetters} className={btnPrimary}>Approved letters PDF</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Pending reports ({pendingReports.length})</h2>
          <div className="flex-1" />
          <ExportMenu onExport={(f) => {
            const rows = pendingReports.map(flattenProposal);
            if (f === 'CSV') exportCSV('docworm-pending-reports.csv', rows, cols);
            else if (f === 'XLSX') exportXLSX('docworm-pending-reports.xlsx', rows, cols);
            else if (f === 'PDF') exportPDF('docworm-pending-reports.pdf', 'Docworm pending reports', cols, rows);
            else window.print();
          }} />
        </div>
        <div className="mt-3 space-y-2">
          {pendingReports.map((p) => {
            const overdue = overdueReports.includes(p);
            return (
              <div key={p.id} className={`border rounded-card px-3 py-2.5 text-sm flex flex-wrap gap-2 items-center ${overdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <Link to={`/proposals/${p.id}`} className="font-semibold flex-1 min-w-40">{p.eventName}</Link>
                <span className="font-mono text-xs text-slate-500">{p.refNo}</span>
                {overdue && <Badge text="Overdue" />}
                {currentUser.role === 'Principal' && (
                  <button
                    onClick={() => { pushNotification({ userId: p.submitterId, title: 'Completion report reminder', body: `Please submit the completion report for ${p.refNo}`, link: `/proposals/${p.id}` }); pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Sent report reminder for ${p.refNo}`, entity: 'Proposal', entityId: p.id }); }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-white"
                  >
                    Send reminder
                  </button>
                )}
              </div>
            );
          })}
          {pendingReports.length === 0 && <EmptyState title="No pending reports" hint="Approved events past their date will appear here." />}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Submitted reports ({submittedList.length})</h2>
          <div className="flex-1" />
          <ExportMenu onExport={(f) => {
            const rows = submittedList.map(({ p, r }) => flattenReport(p, r));
            if (f === 'CSV') exportCSV('docworm-submitted-reports.csv', rows, REPORT_COLS);
            else if (f === 'XLSX') exportXLSX('docworm-submitted-reports.xlsx', rows, REPORT_COLS);
            else if (f === 'PDF') exportPDF('docworm-submitted-reports.pdf', 'Docworm submitted completion reports', REPORT_COLS, rows);
            else window.print();
          }} />
        </div>
        <div className="mt-3 space-y-2">
          {submittedList.map(({ p, r }) => (
            <div key={p.id} className="border border-gray-200 rounded-card px-3 py-2.5 text-sm flex flex-wrap gap-2 items-center">
              <Link to={`/proposals/${p.id}`} className="font-semibold flex-1 min-w-40">{p.eventName}</Link>
              <span className="font-mono text-xs text-slate-500">{p.refNo}</span>
              <Badge text={r.done ? 'Done' : 'Not Done'} />
              <ExportMenu onExport={(f) => {
                const rows = [flattenReport(p, r)];
                const file = `docworm-report-${p.refNo.replace(/\//g, '-')}`;
                if (f === 'CSV') exportCSV(`${file}.csv`, rows, REPORT_COLS);
                else if (f === 'XLSX') exportXLSX(`${file}.xlsx`, rows, REPORT_COLS);
                else if (f === 'PDF') exportPDF(`${file}.pdf`, `Docworm completion report ${p.refNo}`, REPORT_COLS, rows);
                else window.print();
              }} />
            </div>
          ))}
          {submittedList.length === 0 && <EmptyState title="No submitted reports yet" hint="Reports appear here once submitters file them." />}
        </div>
      </div>
    </div>
  );
}

export function NotificationsCenter() {
  const { notifications, saveNotifications, currentUser } = useData();
  const mine = notifications.filter((n) => n.userId === currentUser.id);
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <div><p className="text-xs text-slate-500">Inbox</p><h1 className="text-2xl font-bold">Notifications ({mine.filter((n) => !n.read).length} unread)</h1></div>
        <div className="flex-1" />
        <button onClick={() => saveNotifications(notifications.map((n) => n.userId === currentUser.id ? { ...n, read: true } : n))} className={btnGhost}>Mark all read</button>
      </div>
      {mine.length === 0 && <EmptyState title="No notifications" hint="Status changes, assignments, and reminders will appear here." />}
      <div className="space-y-2">
        {mine.map((n) => (
          <div key={n.id} className={`bg-white border rounded-card p-4 text-sm ${n.read ? 'border-gray-200' : 'border-primary-border'}`}>
            <p className="font-semibold">{n.title} <span className="text-xs font-normal text-slate-400">{n.createdAt}</span></p>
            <p className="text-slate-600 mt-0.5">{n.body}</p>
            <div className="mt-2 flex gap-2">
              <Link to={n.link} className="text-primary font-semibold text-xs">Open linked item</Link>
              {!n.read && <button onClick={() => saveNotifications(notifications.map((x) => x.id === n.id ? { ...x, read: true } : x))} className="text-xs text-slate-500 underline">Mark read</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const {
    options, saveOptions, users, saveUsers, letterhead, saveLetterhead,
    resetDemo, purgeFakeData, audit, currentUser, setCurrentUserId,
    backend, syncState, lastSyncedAt, refresh, proposals, tasks, comments, notifications,
  } = useData();

  const [params, setParams] = useSearchParams();
  const currentTab = params.get('tab') ?? 'database';
  const setTab = (t: string) => setParams({ tab: t });

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Faculty', department: 'IT', designation: '', phone: '' });
  const [purgeFeedback, setPurgeFeedback] = useState('');
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const nav = useNavigate();

  const isAdmin = currentUser.role === 'Principal' || currentUser.role === 'Dean';

  const editList = (key: keyof typeof options, val: string) => {
    saveOptions({ ...options, [key]: val.split(',').map((s) => s.trim()).filter(Boolean) });
  };

  const addUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    saveUsers([...users, {
      id: `u-${Date.now().toString(36)}`,
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      role: newUser.role as 'Principal' | 'Dean' | 'HOD' | 'Faculty',
      department: newUser.department,
      designation: newUser.designation.trim() || newUser.role,
      phone: newUser.phone.trim(),
      password: 'password123',
    }]);
    setNewUser({ name: '', email: '', role: 'Faculty', department: 'IT', designation: '', phone: '' });
  };

  const handlePurgeFakeData = () => {
    if (window.confirm('Are you sure you want to remove all fake proposals, demo tasks, notifications, and reset to a clean slate? This action cannot be undone.')) {
      purgeFakeData();
      setPurgeFeedback('All fake proposals, dummy tasks, and cached mock entries have been purged!');
      setTimeout(() => setPurgeFeedback(''), 4000);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const sampleEnvText = `# Supabase Cloud Credentials for Docworm
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`;

  const copyEnv = () => {
    navigator.clipboard.writeText(sampleEnvText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const tables = [
    { name: 'docworm_proposals', count: proposals.length, desc: 'Institutional permission letters, dates, budget, department approvals' },
    { name: 'docworm_tasks', count: tasks.length, desc: 'Event action items, assignees, priorities, and deadlines' },
    { name: 'docworm_profiles', count: users.length, desc: 'Institutional staff profiles, designations, roles & departments' },
    { name: 'docworm_comments', count: comments.length, desc: 'Review notes, queries, and HOD/Dean remarks' },
    { name: 'docworm_notifications', count: notifications.length, desc: 'Live alerts for signers, submitters & coordinators' },
    { name: 'docworm_audit_log', count: audit.length, desc: 'Institutional audit trail of all approval decisions and changes' },
    { name: 'docworm_resources', count: 'Dynamic', desc: 'Room & seminar hall bookings and clashes' },
    { name: 'docworm_approval_steps', count: 'Dynamic', desc: 'Step-by-step routing chain (Submitter -> HOD -> Dean -> Principal)' },
    { name: 'docworm_completion_reports', count: 'Dynamic', desc: 'Post-event completion evidence and participant statistics' },
    { name: 'docworm_settings', count: '1', desc: 'Custom dropdown lists, departments, and letterhead' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">System & Configuration</span>
            {!isAdmin && (
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {currentUser.role} View
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">Settings & Database</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access database connection, institutional options, letterhead, and staff directory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePurgeFakeData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-card text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs"
            title="Wipe any old demo proposals, tasks, or fake records"
          >
            <Trash2 size={14} /> Purge All Fake Data
          </button>
          <button onClick={() => nav('/')} className={btnGhost}>Dashboard</button>
        </div>
      </div>

      {purgeFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-card p-3.5 flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{purgeFeedback}</span>
        </div>
      )}

      {/* Tabs navigation - clean, responsive pills */}
      <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-card border border-slate-200/60 overflow-x-auto scrollbar-thin">
        {[
          { id: 'database', label: 'Database & Backend', icon: <Database size={15} /> },
          { id: 'profile', label: 'My Profile', icon: <UserIcon size={15} /> },
          { id: 'letterhead', label: 'College Letterhead', icon: null },
          { id: 'options', label: 'Academic Options', icon: null },
          { id: 'users', label: 'Staff Directory', icon: null },
          { id: 'audit', label: `Audit Log (${audit.length})`, icon: null },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 ${
              currentTab === t.id
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. DATABASE & BACKEND TAB */}
      {currentTab === 'database' && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Backend Status Banner */}
          <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${backend === 'supabase' ? (syncState === 'live' ? 'bg-emerald-500 animate-pulse-dot' : 'bg-amber-500') : 'bg-violet-500'}`} />
                  <span className="font-bold text-base sm:text-lg text-slate-900">
                    Active Storage: {backend === 'supabase' ? 'Supabase PostgreSQL (Cloud Database)' : 'Local Browser Storage (HTML5 LocalStorage)'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {backend === 'supabase'
                    ? `Live Realtime synchronization active. Last synced at: ${lastSyncedAt ?? 'Initial sync'}.`
                    : 'Currently storing all proposals, tasks, and users in your browser storage. Connect Supabase to enable cloud persistence across devices.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {backend === 'supabase' && (
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-card text-xs font-semibold bg-primary-pale text-primary border border-primary-border hover:bg-primary-light transition-colors"
                  >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Syncing...' : 'Sync Now'}
                  </button>
                )}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-card text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  <ExternalLink size={14} /> Open Supabase Console
                </a>
              </div>
            </div>

            {/* Where to access the database */}
            <div className="mt-5 grid md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-card p-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Server size={16} className="text-primary" />
                  <span>1. Cloud Table Editor</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-primary underline font-medium">Supabase Dashboard</a> &rarr; <b>Table Editor</b> to directly view, filter, insert, or edit rows in any table.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-card p-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Database size={16} className="text-primary" />
                  <span>2. SQL Editor / Direct DB</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Connect via <b>pgAdmin</b>, <b>DBeaver</b>, or <b>psql</b> using the Postgres connection string in your <code>DATABASE_URL</code> (Port 5432).
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-card p-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Shield size={16} className="text-primary" />
                  <span>3. Local Migrations</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  SQL migrations live in <code>supabase/migrations/</code>. Run <code>npm run db:migrate</code> to apply changes or add tables anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Database Tables Overview */}
          <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-slate-900 text-base">PostgreSQL Database Schema & Tables</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tables created in public schema of your database</p>
              </div>
              <span className="text-xs font-semibold bg-primary-pale text-primary border border-primary-border px-2.5 py-1 rounded-full">
                10 Tables
              </span>
            </div>

            <div className="mt-4 overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50/70 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Table Name</th>
                    <th className="py-2.5 px-3 font-semibold">Current Count</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-slate-700">
                  {tables.map((t) => (
                    <tr key={t.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-primary-dark">{t.name}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{t.count}</td>
                      <td className="py-2.5 px-3 text-slate-500">{t.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configuration Guide */}
          <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Environment Configuration (.env)</h2>
                <p className="text-xs text-slate-500">Configure these keys to connect Docworm directly to your Supabase instance.</p>
              </div>
              <button
                onClick={copyEnv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-semibold border border-gray-300 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                {copiedEnv ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedEnv ? 'Copied' : 'Copy Sample .env'}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-card text-xs font-mono overflow-x-auto">
              {sampleEnvText}
            </pre>
          </div>
        </div>
      )}

      {/* 2. PROFILE TAB */}
      {currentTab === 'profile' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-5 animate-fade-in">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Logged-in Staff Profile</h2>
            <p className="text-xs text-slate-500">Your institutional credentials and current authorization role.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-card p-4 bg-slate-50">
              <span className="text-xs text-slate-500 block">Full Name</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{currentUser.name}</span>
            </div>
            <div className="border border-gray-200 rounded-card p-4 bg-slate-50">
              <span className="text-xs text-slate-500 block">Institutional Email</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{currentUser.email || 'None registered'}</span>
            </div>
            <div className="border border-gray-200 rounded-card p-4 bg-slate-50">
              <span className="text-xs text-slate-500 block">Authorization Role</span>
              <span className="text-base font-semibold text-primary block mt-0.5">{currentUser.role}</span>
            </div>
            <div className="border border-gray-200 rounded-card p-4 bg-slate-50">
              <span className="text-xs text-slate-500 block">Department</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{currentUser.department}</span>
            </div>
            <div className="border border-gray-200 rounded-card p-4 bg-slate-50">
              <span className="text-xs text-slate-500 block">Designation</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{currentUser.designation || currentUser.role}</span>
            </div>
            <div className="border border-gray-200 rounded-card p-4 bg-slate-50">
              <span className="text-xs text-slate-500 block">Contact Phone</span>
              <span className="text-base font-semibold text-slate-900 block mt-0.5">{currentUser.phone || 'Not specified'}</span>
            </div>
          </div>

          {backend === 'local' && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Switch Active Role in Local Mode:</p>
              <div className="flex flex-wrap gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setCurrentUserId(u.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      u.id === currentUser.id
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'border-gray-200 bg-white hover:border-primary-border text-slate-700'
                    }`}
                  >
                    {u.name} ({u.role})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. OPTIONS TAB */}
      {currentTab === 'options' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Academic & Proposal Dropdown Lists</h2>
              <p className="text-xs text-slate-500">Comma-separated entries. Changes apply across all forms immediately.</p>
            </div>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                <Lock size={12} /> Admin Managed
              </span>
            )}
          </div>

          {(['departments', 'eventCategories', 'organizingBodies', 'taskTypes', 'budgetHeads', 'resourceTypes', 'academicYears'] as const).map((k) => (
            <Field key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}>
              <textarea
                value={(options[k] as string[]).join(', ')}
                onChange={(e) => isAdmin && editList(k, e.target.value)}
                disabled={!isAdmin}
                className={`${inputCls} ${!isAdmin ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                rows={2}
              />
            </Field>
          ))}
        </div>
      )}

      {/* 4. USERS TAB */}
      {currentTab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Staff Directory & Authorized Accounts</h2>
              <p className="text-xs text-slate-500">Official faculty, department heads, deans, and administration accounts.</p>
            </div>
            <span className="text-xs font-semibold bg-primary-pale text-primary border border-primary-border px-2.5 py-1 rounded-full">
              {users.length} Registered
            </span>
          </div>

          {isAdmin && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-card space-y-3">
              <p className="text-xs font-semibold text-slate-700">Add New Staff Member:</p>
              <div className="grid sm:grid-cols-3 gap-2.5">
                <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Full Name (e.g. Dr. Priya Rao)" className={inputCls} aria-label="User name" />
                <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email address" className={inputCls} aria-label="User email" />
                <input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="Phone (optional)" className={inputCls} aria-label="User phone" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className={inputCls} aria-label="Role">
                  {['Faculty', 'HOD', 'Dean', 'Principal'].map((r) => <option key={r}>{r}</option>)}
                </select>
                <select value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} className={inputCls} aria-label="Department">
                  {options.departments.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input value={newUser.designation} onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })} placeholder="Designation (e.g. Assistant Professor)" className={inputCls} aria-label="Designation" />
              </div>
              <button onClick={addUser} className={btnPrimary}><Plus size={15} /> Add Staff Account</button>
            </div>
          )}

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-card overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{u.name}</span>
                    <Badge text={u.role} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {u.designation} • Dept of {u.department} • <span className="font-mono">{u.email}</span>
                  </p>
                </div>
                {isAdmin && users.length > 1 && (
                  <button onClick={() => saveUsers(users.filter((x) => x.id !== u.id))} className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. LETTERHEAD TAB */}
      {currentTab === 'letterhead' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base">College Letterhead Header</h2>
              <p className="text-xs text-slate-500">Appears on every exported PDF and DOCX permission letter.</p>
            </div>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                <Lock size={12} /> Admin Managed
              </span>
            )}
          </div>

          <Field label="College Name">
            <input
              value={letterhead.collegeName}
              onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, collegeName: e.target.value })}
              disabled={!isAdmin}
              className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
            />
          </Field>
          <Field label="Official Address">
            <textarea
              value={letterhead.address}
              onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, address: e.target.value })}
              disabled={!isAdmin}
              className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              rows={2}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                value={letterhead.phone}
                onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, phone: e.target.value })}
                disabled={!isAdmin}
                className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              />
            </Field>
            <Field label="Official Email">
              <input
                value={letterhead.email}
                onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, email: e.target.value })}
                disabled={!isAdmin}
                className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              />
            </Field>
          </div>
        </div>
      )}

      {/* 6. AUDIT TAB */}
      {currentTab === 'audit' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Institutional Audit Trail</h2>
              <p className="text-xs text-slate-500">Chronological record of official approvals, edits, and status changes.</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {audit.length} Records
            </span>
          </div>

          <div className="mt-4 max-h-[500px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {audit.map((a) => (
              <div key={a.id} className="border border-gray-100 rounded-card p-3 hover:bg-slate-50/70 transition-colors text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{a.actorName}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{a.createdAt}</span>
                </div>
                <p className="text-slate-600 mt-1">{a.action}</p>
              </div>
            ))}
            {audit.length === 0 && (
              <EmptyState title="No audit records" hint="Actions performed across Docworm will be recorded here." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
