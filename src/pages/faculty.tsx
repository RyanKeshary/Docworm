import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckSquare, FilePlus2, FileText } from 'lucide-react';
import { useData } from '../store';
import { Badge, EmptyState, btnPrimary, btnGhost } from '../components';
import { computedTaskStatus } from '../utils';

// Dedicated faculty workspace: own permission letters (create and edit),
// assigned tasks, completion reports, and notifications. Updates live via
// the realtime subscription in the store, no manual refresh needed.
export function FacultyPanel() {
  const { currentUser, proposals, tasks, notifications, completions, syncState } = useData();
  const mine = proposals.filter((p) => p.submitterId === currentUser.id);
  const editable = mine.filter((p) => ['Draft', 'Changes Requested'].includes(p.status));
  const myTasks = tasks.filter((t) => t.assignedTo.includes(currentUser.id));
  const pendingReports = mine.filter(
    (p) => p.status === 'Approved' && p.endDate < new Date().toISOString().slice(0, 10) && !completions[p.id],
  );
  const myNotes = notifications.filter((n) => n.userId === currentUser.id).slice(0, 5);
  const unread = notifications.filter((n) => n.userId === currentUser.id && !n.read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-xs text-slate-500">
            Faculty panel{syncState === 'live' ? ', live' : syncState === 'loading' ? ', syncing...' : ', offline'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            {currentUser.name}, {currentUser.department}
          </h1>
          <p className="text-sm text-slate-500">{currentUser.designation} | {currentUser.email}</p>
        </div>
        <div className="flex-1" />
        <Link to="/proposals/new" className={btnPrimary}><FilePlus2 size={15} /> New permission letter</Link>
        <Link to="/tasks" className={btnGhost}><CheckSquare size={15} /> My tasks ({myTasks.length})</Link>
      </div>

      {pendingReports.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-card px-4 py-3 text-sm">
          <span className="font-semibold">Completion report pending for {pendingReports.length} event{pendingReports.length > 1 ? 's' : ''}.</span>
          {pendingReports.map((p) => (
            <Link key={p.id} to={`/proposals/${p.id}`} className="block text-primary font-semibold mt-1">
              File report for {p.eventName}
            </Link>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold flex-1">My permission letters ({mine.length})</h2>
            <Link to="/proposals?tab=mine" className="text-sm text-primary font-semibold">View all</Link>
          </div>
          <div className="mt-3 space-y-2">
            {mine.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-card px-3 py-2.5 flex flex-wrap items-center gap-2">
                <Link to={`/proposals/${p.id}`} className="font-medium text-sm flex-1 min-w-40">{p.eventName}</Link>
                <span className="font-mono text-xs text-slate-400">{p.refNo}</span>
                <Badge text={p.status} />
                {['Draft', 'Changes Requested'].includes(p.status) && (
                  <Link to={`/proposals/${p.id}/edit`} className="text-xs font-bold text-primary border border-primary-border rounded-md px-2 py-1">Edit</Link>
                )}
              </div>
            ))}
            {mine.length === 0 && (
              <EmptyState title="No letters yet" hint="Create your first permission letter to get started." icon={<FileText size={20} />} />
            )}
          </div>
          {editable.length > 0 && (
            <p className="text-xs text-slate-500 mt-3">{editable.length} letter{editable.length > 1 ? 's' : ''} can still be edited (draft or changes requested).</p>
          )}
        </section>

        <div className="space-y-4">
          <section className="bg-white border border-gray-200 rounded-card p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold flex-1">My tasks ({myTasks.length})</h2>
              <Link to="/tasks" className="text-sm text-primary font-semibold">All</Link>
            </div>
            <div className="mt-2 space-y-1.5">
              {myTasks.slice(0, 5).map((t) => (
                <Link key={t.id} to={`/tasks/${t.id}`} className="block text-sm border border-gray-100 rounded-md px-2.5 py-2 hover:border-primary-border">
                  <span className="font-medium">{t.title}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Due {t.dueDate} <Badge text={computedTaskStatus(t.dueDate, t.status)} /></span>
                </Link>
              ))}
              {myTasks.length === 0 && <p className="text-sm text-slate-500">No tasks assigned.</p>}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-card p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold flex-1">Notifications ({unread} unread)</h2>
              <Link to="/notifications" className="text-primary" aria-label="Open notifications"><Bell size={16} /></Link>
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {myNotes.map((n) => (
                <li key={n.id} className={`border rounded-md px-2.5 py-2 ${n.read ? 'border-gray-100' : 'border-primary-border bg-primary-pale/40'}`}>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </li>
              ))}
              {myNotes.length === 0 && <li className="text-sm text-slate-500">Nothing here yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
