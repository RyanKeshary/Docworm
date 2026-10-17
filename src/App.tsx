import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './store';
import { Layout } from './components';
import { PermissionPortal } from './views/PermissionPortal';
import { Login } from './views/pages1';
import { SettingsPage, NotificationsCenter } from './views/pages3';
import { FacultyLeavePortal } from './views/FacultyLeavePortal';

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
          <Route path="/" element={<Guard><PermissionPortal /></Guard>} />
          <Route path="/requests" element={<Guard><PermissionPortal /></Guard>} />
          <Route path="/proposals" element={<Guard><PermissionPortal /></Guard>} />
          <Route path="/faculty" element={<Guard><PermissionPortal /></Guard>} />
          <Route path="/leaves" element={<Guard><FacultyLeavePortal /></Guard>} />
          <Route path="/notifications" element={<Guard><NotificationsCenter /></Guard>} />
          <Route path="/settings" element={<Guard><SettingsPage /></Guard>} />
          <Route path="*" element={<Guard><PermissionPortal /></Guard>} />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
