import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './store';
import { Layout } from './components';
import { Login, Dashboard, ProposalsList } from './pages/pages1';
import { ProposalForm, ProposalDetail } from './pages/pages2';
import { TasksList, TaskDetail, CalendarView, Reports, NotificationsCenter, SettingsPage } from './pages/pages3';

function Guard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useData();
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading Docworm...</p>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Dashboard /></Guard>} />
          <Route path="/proposals" element={<Guard><ProposalsList /></Guard>} />
          <Route path="/proposals/new" element={<Guard><ProposalForm /></Guard>} />
          <Route path="/proposals/:id" element={<Guard><ProposalDetail /></Guard>} />
          <Route path="/tasks" element={<Guard><TasksList /></Guard>} />
          <Route path="/tasks/:id" element={<Guard><TaskDetail /></Guard>} />
          <Route path="/calendar" element={<Guard><CalendarView /></Guard>} />
          <Route path="/reports" element={<Guard><Reports /></Guard>} />
          <Route path="/notifications" element={<Guard><NotificationsCenter /></Guard>} />
          <Route path="/settings" element={<Guard><SettingsPage /></Guard>} />
          <Route path="*" element={<Guard><Dashboard /></Guard>} />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
