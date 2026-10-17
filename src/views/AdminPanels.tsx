'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useData } from '../store';
import {
  Database, Play, Download, AlertTriangle, CheckCircle2, RefreshCw,
  Search, Shield, Plus, Trash2, Mail, Send, Eye, EyeOff, Save,
  X, Check, Lock, Terminal, Wrench
} from 'lucide-react';

const btnPrimary = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-card text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-card text-xs font-semibold border border-gray-300 hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50';
const inputCls = 'w-full text-xs sm:text-sm px-3 py-2 rounded-card border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

// ==========================================
// 1. CLOUD TABLE EDITOR PANEL
// ==========================================
export function CloudTableEditorPanel() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('users');
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadRows(selectedTable, page);
    }
  }, [selectedTable, page]);

  const loadTables = async () => {
    try {
      const res = await api.admin.listTables();
      const list = res.tables?.map((t: any) => t.table_name || t) || [
        'users', 'permission_requests', 'announcements', 'departments',
        'event_categories', 'academic_options', 'audit_log', 'app_settings'
      ];
      setTables(list);
      if (list.length > 0 && !selectedTable) setSelectedTable(list[0]);
    } catch {
      setTables(['users', 'permission_requests', 'announcements', 'departments', 'event_categories', 'academic_options', 'audit_log']);
    }
  };

  const loadRows = async (table: string, p: number) => {
    setLoading(true);
    try {
      const res = await api.admin.getTableRows(table, p, limit);
      setRows(res.rows || []);
      setTotalRows(res.total || 0);
    } catch (err: any) {
      setFeedback(`Error loading table: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return Object.values(r).some((val) => String(val).toLowerCase().includes(s));
  });

  const columns = rows.length > 0 ? Object.keys(rows[0]).filter((c) => !c.includes('password') && !c.includes('token')) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-card border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 shrink-0">Select Table:</label>
          <select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {tables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500 font-mono">({totalRows} total rows)</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter current view..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-card border border-gray-300 w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <a
            href={`/api/export/csv/${selectedTable}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            title="Download UTF-8 BOM CSV for Excel"
          >
            <Download size={13} /> Export CSV
          </a>

          <button
            onClick={() => loadRows(selectedTable, page)}
            className="p-1.5 text-slate-500 hover:text-slate-800 border border-gray-300 rounded-card bg-slate-50"
            title="Refresh Table"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-card flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)}><X size={14} /></button>
        </div>
      )}

      {/* Table view */}
      <div className="bg-white border border-gray-200 rounded-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-gray-200">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-700">
              {filteredRows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  {columns.map((col) => {
                    const val = r[col];
                    const display = val === null ? <span className="text-slate-400 italic">null</span> :
                      typeof val === 'boolean' ? (val ? 'true' : 'false') :
                      typeof val === 'object' ? JSON.stringify(val) : String(val);
                    return (
                      <td key={col} className="py-2 px-3 whitespace-nowrap max-w-xs truncate" title={String(val)}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={Math.max(1, columns.length)} className="py-8 text-center text-slate-500 italic">
                    No rows found in {selectedTable}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-xs text-slate-600">
          <span>Page {page} of {Math.max(1, Math.ceil(totalRows / limit))}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className={btnGhost}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= totalRows || loading}
              className={btnGhost}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. INTERACTIVE SQL QUERY EDITOR PANEL
// ==========================================
export function SqlEditorPanel() {
  const [query, setQuery] = useState('SELECT id, name, email, role, department, designation, status FROM users ORDER BY created_at DESC LIMIT 20;');
  const [writeMode, setWriteMode] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [fields, setFields] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);

  const sampleQueries = [
    { label: 'Staff Directory', q: 'SELECT id, name, email, role, department, status FROM users ORDER BY role, name;' },
    { label: 'Pending Requests', q: "SELECT id, category, title, submitter_name, department, status, created_at FROM permission_requests WHERE status = 'pending' ORDER BY created_at DESC;" },
    { label: 'Recent Announcements', q: 'SELECT id, title, priority, created_by_name, created_at FROM announcements ORDER BY created_at DESC LIMIT 10;' },
    { label: 'Audit Trail', q: 'SELECT id, actor_name, action, target_type, created_at FROM audit_log ORDER BY created_at DESC LIMIT 20;' },
    { label: 'Staff Count by Department', q: "SELECT COALESCE(department, 'None (Principal)') as department, count(*) as count FROM users GROUP BY department ORDER BY count DESC;" },
  ];

  const handleRun = async () => {
    // Check for destructive queries
    const qUpper = query.trim().toUpperCase();
    const isDestructive = qUpper.startsWith('DROP') ||
      qUpper.startsWith('TRUNCATE') ||
      (qUpper.startsWith('DELETE') && !qUpper.includes('WHERE')) ||
      (qUpper.startsWith('UPDATE') && !qUpper.includes('WHERE'));

    if (isDestructive && !confirmModal) {
      setConfirmModal(true);
      return;
    }

    setConfirmModal(false);
    setRunning(true);
    setError(null);
    const start = performance.now();

    try {
      const res = await api.admin.runSql(query, writeMode);
      const rows = res.rows || [];
      setResults(rows);
      setFields(rows.length > 0 ? Object.keys(rows[0]) : []);
      setRowCount(res.rowCount ?? rows.length);
      setExecutionTime(Math.round(performance.now() - start));
    } catch (err: any) {
      setError(err.message || 'SQL execution failed');
      setResults(null);
    } finally {
      setRunning(false);
    }
  };

  const handleExportCsv = () => {
    if (!results || results.length === 0) return;
    const header = fields.join(',');
    const csvRows = results.map((r) =>
      fields.map((f) => {
        const val = r[f];
        const str = val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = '\uFEFF' + [header, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Query Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-primary" />
            <span className="font-bold text-slate-900 text-sm">Interactive SQL Console</span>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">PostgreSQL</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={writeMode}
                onChange={(e) => setWriteMode(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className={writeMode ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                {writeMode ? '⚠️ Write Mode (DML/DDL Enabled)' : '🔒 Read-Only Safe Mode'}
              </span>
            </label>

            <button
              onClick={handleRun}
              disabled={running}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-card text-xs font-bold bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              <Play size={13} className={running ? 'animate-spin' : ''} />
              {running ? 'Running...' : 'Run Query'}
            </button>
          </div>
        </div>

        {/* Quick query templates */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Templates:</span>
          {sampleQueries.map((s) => (
            <button
              key={s.label}
              onClick={() => setQuery(s.q)}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={5}
          className="w-full font-mono text-xs sm:text-sm p-3 rounded-card border border-gray-300 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="SELECT * FROM users;"
        />
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-card flex items-start gap-2">
          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <pre className="font-mono whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white border border-gray-200 rounded-card shadow-xs overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="font-semibold text-slate-800">
                {rowCount} {rowCount === 1 ? 'row' : 'rows'} returned
              </span>
              {executionTime !== null && (
                <span className="text-slate-400 font-mono">in {executionTime}ms</span>
              )}
            </div>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto max-h-[450px] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-gray-200">
                <tr>
                  {fields.map((f) => (
                    <th key={f} className="py-2 px-3 whitespace-nowrap">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-slate-700">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    {fields.map((f) => (
                      <td key={f} className="py-2 px-3 whitespace-nowrap max-w-xs truncate" title={String(r[f])}>
                        {r[f] === null ? <span className="text-slate-400 italic">null</span> : String(r[f])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-slate-900 text-base">Destructive Query Warning</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to execute a destructive statement (DROP, TRUNCATE, or unqualified DELETE/UPDATE). This operation will permanently alter or delete data in your live PostgreSQL database.
            </p>
            <pre className="p-3 bg-slate-900 text-rose-300 font-mono text-xs rounded-card overflow-x-auto max-h-32">
              {query}
            </pre>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setConfirmModal(false)} className={btnGhost}>Cancel</button>
              <button
                onClick={handleRun}
                className="px-4 py-2 rounded-card text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Yes, Execute Destructive Query
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. LOCAL MITIGATION & RECOVERY TOOLS PANEL
// ==========================================
export function MitigationToolsPanel() {
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [output, setOutput] = useState<{ [key: string]: { type: 'success' | 'error'; msg: string } }>({});

  const runTool = async (key: string, fn: () => Promise<any>) => {
    setRunningTool(key);
    try {
      const res = await fn();
      setOutput((prev) => ({
        ...prev,
        [key]: { type: 'success', msg: res.message || JSON.stringify(res) },
      }));
    } catch (err: any) {
      setOutput((prev) => ({
        ...prev,
        [key]: { type: 'error', msg: err.message || 'Operation failed' },
      }));
    } finally {
      setRunningTool(null);
    }
  };

  const tools = [
    {
      id: 'fix-principal',
      name: 'Enforce Principal Department Neutrality',
      desc: 'Ensures all Principal accounts have department_id = NULL in PostgreSQL as mandated by Phase 4.',
      action: async () => {
        return api.admin.runSql("UPDATE users SET department = NULL, department_id = NULL WHERE role = 'Principal';", true);
      },
    },
    {
      id: 'test-db',
      name: 'Live Database Health & Latency Probe',
      desc: 'Executes a roundtrip heartbeat probe against the Supabase pooler checking connection pool status.',
      action: async () => {
        return api.health();
      },
    },
    {
      id: 'clean-orphans',
      name: 'Audit Log & Notification Cleanup',
      desc: 'Prunes orphaned notification receipts and cleans up temporary audit trail anomalies.',
      action: async () => {
        return api.admin.runSql("DELETE FROM announcement_receipts WHERE user_id NOT IN (SELECT id FROM users);", true);
      },
    },
    {
      id: 'sync-sequences',
      name: 'Verify Database Table Foreign Key Constraints',
      desc: 'Validates foreign key integrity between permission requests, users, departments, and event categories.',
      action: async () => {
        return api.admin.runSql("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'permission_requests'::regclass;", false);
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-card p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Wrench size={18} className="text-primary" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Institutional Database Mitigation & Recovery Tools</h3>
            <p className="text-xs text-slate-500">Run one-click administrative routines to verify, repair, and maintain database state.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {tools.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-card p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-800">{t.name}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                <button
                  onClick={() => runTool(t.id, t.action)}
                  disabled={runningTool === t.id}
                  className={btnPrimary}
                >
                  <Play size={12} className={runningTool === t.id ? 'animate-spin' : ''} />
                  {runningTool === t.id ? 'Executing...' : 'Run Tool'}
                </button>

                {output[t.id] && (
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                    output[t.id].type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {output[t.id].type === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {output[t.id].type === 'success' ? 'Completed' : 'Failed'}
                  </span>
                )}
              </div>

              {output[t.id] && (
                <div className={`mt-2 p-2 rounded text-[11px] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto ${
                  output[t.id].type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {output[t.id].msg}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. ACADEMIC OPTIONS & RESTRICTED INPUTS PANEL
// ==========================================
export function AcademicOptionsPanel() {
  const [subTab, setSubTab] = useState<'options' | 'departments' | 'categories'>('options');
  const [options, setOptions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('program');
  const [newValue, setNewValue] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [catName, setCatName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [optRes, deptRes, catRes] = await Promise.all([
        api.options.get(),
        api.departments.list(),
        api.categories.list(),
      ]);
      const rawOptions = optRes.all || (Array.isArray(optRes.options) ? optRes.options : []);
      setOptions(Array.isArray(rawOptions) ? rawOptions : []);
      setDepartments(deptRes.departments || []);
      setCategories(catRes.categories || []);
    } catch (err: any) {
      setFeedback(`Error loading options: ${err.message}`);
    }
  };

  const optionTypes = [
    { id: 'program', label: 'Academic Programs (B.Tech, M.Tech)' },
    { id: 'year', label: 'Academic Years (FE, SE, TE, BE)' },
    { id: 'semester', label: 'Semesters (Sem 1 - 8)' },
    { id: 'designation', label: 'Faculty Designations' },
    { id: 'budgetHead', label: 'Budget Heads' },
    { id: 'resourceType', label: 'Room & Resource Types' },
  ];

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    try {
      await api.options.add({ type: selectedType, value: newValue.trim() });
      setNewValue('');
      setFeedback('Successfully added option');
      loadAll();
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
    }
  };

  const handleToggleOption = async (opt: any) => {
    try {
      await api.options.update(opt.id, { active: !opt.active });
      loadAll();
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!window.confirm('Delete this option? If already in use, it will be deactivated instead.')) return;
    try {
      await api.options.delete(id);
      loadAll();
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode.trim() || !deptName.trim()) return;
    try {
      await api.departments.create({ code: deptCode.trim().toUpperCase(), name: deptName.trim() });
      setDeptCode('');
      setDeptName('');
      setFeedback('Department added successfully');
      loadAll();
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
    }
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await api.categories.create({ name: catName.trim() });
      setCatName('');
      setFeedback('Event category added successfully');
      loadAll();
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
    }
  };

  const filteredOptions = Array.isArray(options) ? options.filter((o) => o && o.type === selectedType) : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setSubTab('options')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'options' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Academic Dropdown Lists
        </button>
        <button
          onClick={() => setSubTab('departments')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'departments' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setSubTab('categories')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'categories' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Event Categories ({categories.length})
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-card flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)}><X size={14} /></button>
        </div>
      )}

      {/* 1. ACADEMIC DROPDOWNS */}
      {subTab === 'options' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Manage Restricted Dropdown Values</h3>
              <p className="text-xs text-slate-500">Deactivating a value hides it from new forms while preserving historic records.</p>
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-card border border-gray-300 bg-slate-50 text-slate-800"
            >
              {optionTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddOption} className="flex gap-2">
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`Add new ${selectedType} option...`}
              className={inputCls}
            />
            <button type="submit" className={btnPrimary}>
              <Plus size={14} /> Add Value
            </button>
          </form>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-card overflow-hidden">
            {filteredOptions.map((opt) => (
              <div key={opt.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className={`font-medium ${opt.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                    {opt.value}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleOption(opt)}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-slate-600 hover:bg-slate-100"
                  >
                    {opt.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteOption(opt.id)}
                    className="text-rose-600 hover:text-rose-800 p-1"
                    title="Delete Option"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                No values defined for this category yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. DEPARTMENTS */}
      {subTab === 'departments' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="font-bold text-slate-900 text-sm">Institutional Departments</h3>
            <p className="text-xs text-slate-500">Configure academic departments and offices.</p>
          </div>

          <form onSubmit={handleAddDept} className="grid sm:grid-cols-3 gap-2">
            <input
              required
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              placeholder="Code (e.g. AI-DS)"
              className={inputCls}
            />
            <input
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="Full Name (e.g. Artificial Intelligence & Data Science)"
              className={inputCls}
            />
            <button type="submit" className={btnPrimary}>
              <Plus size={14} /> Add Department
            </button>
          </form>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-card overflow-hidden">
            {departments.map((d) => (
              <div key={d.id || d.code} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                <div>
                  <span className="font-bold text-primary font-mono mr-2">{d.code}</span>
                  <span className="text-slate-800 font-medium">{d.name}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">ID: {d.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. EVENT CATEGORIES */}
      {subTab === 'categories' && (
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="font-bold text-slate-900 text-sm">Event Categories</h3>
            <p className="text-xs text-slate-500">Permission request classification heads.</p>
          </div>

          <form onSubmit={handleAddCat} className="flex gap-2">
            <input
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Hackathon / Technical Symposium"
              className={inputCls}
            />
            <button type="submit" className={btnPrimary}>
              <Plus size={14} /> Add Category
            </button>
          </form>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-card overflow-hidden">
            {categories.map((c) => (
              <div key={c.id || c.name} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                <span className="text-slate-800 font-medium">{c.name}</span>
                <span className="text-[11px] text-slate-400 font-mono">ID: {c.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. CONFIGURABLE SMTP & EMAIL SETTINGS PANEL
// ==========================================
export function SmtpSettingsPanel() {
  const [smtp, setSmtp] = useState({
    host: '',
    port: '587',
    secure: false,
    auth_user: '',
    auth_pass: '',
    from_name: 'Docworm Approvals',
    from_email: 'approvals@slrtce.in',
  });
  const [testRecipient, setTestRecipient] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadSmtp();
  }, []);

  const loadSmtp = async () => {
    try {
      const res = await api.settings.getEmail();
      if (res.settings) {
        setSmtp({
          host: res.settings.host || '',
          port: String(res.settings.port || '587'),
          secure: Boolean(res.settings.secure),
          auth_user: res.settings.auth_user || '',
          auth_pass: res.settings.auth_pass || '',
          from_name: res.settings.from_name || 'Docworm Approvals',
          from_email: res.settings.from_email || 'approvals@slrtce.in',
        });
      }
    } catch {
      // Dev default
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api.settings.updateEmail(smtp);
      setFeedback({ type: 'success', msg: 'SMTP configuration saved securely server-side!' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to save SMTP settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await api.settings.testEmail(testRecipient || undefined);
      setFeedback({
        type: 'success',
        msg: `Test email dispatched! ${res.previewUrl ? `Dev Preview URL: ${res.previewUrl}` : 'Delivered successfully.'}`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: `Test email failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Institutional SMTP & Email Dispatch</h2>
          <p className="text-xs text-slate-500">Configure outbound email credentials for announcements, password resets, and notifications.</p>
        </div>
        <Mail size={20} className="text-primary" />
      </div>

      {feedback && (
        <div className={`p-4 rounded-card border text-xs flex items-center gap-2.5 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
          <span className="break-all">{feedback.msg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">SMTP Host</label>
            <input
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              placeholder="smtp.gmail.com or mail.slrtce.in"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Port</label>
            <input
              value={smtp.port}
              onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
              placeholder="587"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">SMTP Username</label>
            <input
              value={smtp.auth_user}
              onChange={(e) => setSmtp({ ...smtp, auth_user: e.target.value })}
              placeholder="notifications@slrtce.in"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">SMTP Password</label>
            <input
              type="password"
              value={smtp.auth_pass}
              onChange={(e) => setSmtp({ ...smtp, auth_pass: e.target.value })}
              placeholder="••••••••••••"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Sender Name</label>
            <input
              value={smtp.from_name}
              onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
              placeholder="Docworm Approvals"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Sender Email Address</label>
            <input
              type="email"
              value={smtp.from_email}
              onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
              placeholder="approvals@slrtce.in"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={smtp.secure}
              onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
              className="rounded border-gray-300 text-primary"
            />
            <span>Use TLS / SSL (Secure connection)</span>
          </label>

          <button type="submit" disabled={saving} className={btnPrimary}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save SMTP Settings'}
          </button>
        </div>
      </form>

      {/* Test Email Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-card p-4 space-y-3">
        <h3 className="font-bold text-xs text-slate-800">Test Email Connection</h3>
        <p className="text-xs text-slate-500">
          Dispatch an instant verification message to confirm SMTP credentials and network deliverability.
        </p>

        <div className="flex gap-2">
          <input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Recipient email (optional, defaults to current user)"
            className={inputCls}
          />
          <button
            onClick={handleSendTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-card text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs shrink-0 disabled:opacity-50"
          >
            <Send size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. USER PROFILE & PASSWORD CHANGE PANEL
// ==========================================
export function UserProfilePanel({ currentUser, onUpdate }: { currentUser: any; onUpdate?: () => void }) {
  const { updateCurrentUser } = useData();
  const [profile, setProfile] = useState({
    name: currentUser.name || '',
    phone: currentUser.phone || '',
    designation: currentUser.designation || '',
    photo_url: currentUser.photo_url || '',
  });

  useEffect(() => {
    setProfile({
      name: currentUser.name || '',
      phone: currentUser.phone || '',
      designation: currentUser.designation || '',
      photo_url: currentUser.photo_url || '',
    });
  }, [currentUser.id, currentUser.name, currentUser.phone, currentUser.designation, currentUser.photo_url]);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);
    try {
      const res = await api.profile.update(profile);
      const updatedData = res.user ? { ...profile, ...res.user } : profile;
      updateCurrentUser(updatedData);
      setProfileFeedback({ type: 'success', msg: 'Profile updated successfully!' });
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setProfileFeedback({ type: 'error', msg: err.message || 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordFeedback(null);

    if (passwordForm.new_password.length < 8) {
      setPasswordFeedback({ type: 'error', msg: 'New password must be at least 8 characters long.' });
      setPasswordSaving(false);
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordFeedback({ type: 'error', msg: 'New passwords do not match.' });
      setPasswordSaving(false);
      return;
    }

    try {
      await api.auth.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordFeedback({ type: 'success', msg: 'Password changed successfully!' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', msg: err.message || 'Failed to change password' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Details Edit */}
      <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Edit Institutional Profile</h2>
            <p className="text-xs text-slate-500">Update your contact details, designation, and public information.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-pale text-primary border border-primary-border">
            {currentUser.role}
          </span>
        </div>

        {profileFeedback && (
          <div className={`p-3 rounded-card text-xs flex items-center gap-2 ${
            profileFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {profileFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{profileFeedback.msg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
              <input
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Institutional Email</label>
              <input
                disabled
                value={currentUser.email || ''}
                className={`${inputCls} bg-slate-50 text-slate-500 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
              <input
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                placeholder="Assistant Professor, Dept of IT"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className={inputCls}
              />
            </div>
            {currentUser.role !== 'Principal' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                <input
                  disabled
                  value={currentUser.department || 'General'}
                  className={`${inputCls} bg-slate-50 text-slate-500 cursor-not-allowed`}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Photo URL</label>
              <input
                value={profile.photo_url}
                onChange={(e) => setProfile({ ...profile, photo_url: e.target.value })}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={profileSaving} className={btnPrimary}>
              <Save size={14} /> {profileSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="pb-3 border-b border-gray-100 flex items-center gap-2">
          <Lock size={18} className="text-primary" />
          <div>
            <h2 className="font-bold text-slate-900 text-base">Change Password</h2>
            <p className="text-xs text-slate-500">
              Default password for all accounts is <code className="font-mono font-bold text-primary">password@67</code>. You can set your own custom password here anytime.
            </p>
          </div>
        </div>

        {passwordFeedback && (
          <div className={`p-3 rounded-card text-xs flex items-center gap-2 ${
            passwordFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {passwordFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{passwordFeedback.msg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Current Password</label>
            <input
              required
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              placeholder="e.g. password@67"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">New Password (min 8 chars)</label>
            <input
              required
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm New Password</label>
            <input
              required
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={passwordSaving} className={btnPrimary}>
              <Lock size={14} /> {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 7. PRINCIPAL STAFF PROFILE EDIT MODAL
// ==========================================
export function EditStaffModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'Faculty',
    department: user.department || 'IT',
    designation: user.designation || '',
    phone: user.phone || '',
    status: user.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.users.update(user.id, {
        ...formData,
        department: formData.role === 'Principal' ? null : formData.department,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update staff record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-card max-w-lg w-full p-6 shadow-xl space-y-4 animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Edit Staff Profile</h3>
            <p className="text-xs text-slate-500">Principal Administrative Authority</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-card">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Institutional Email</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={inputCls}
              >
                <option value="Principal">Principal</option>
                <option value="Dean">Dean</option>
                <option value="HOD">Head of Department (HOD)</option>
                <option value="Faculty">Faculty</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={inputCls}
              >
                <option value="active">Active</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            {formData.role !== 'Principal' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                <input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="IT, CMPN, EXTC, etc."
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
              <input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Professor & HOD"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Phone</label>
              <input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Staff Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
