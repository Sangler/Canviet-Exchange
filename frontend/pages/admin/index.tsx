import React from 'react';
import RequireAuth from '../../components/RequireAuth';
import VisibleByRole from '../../components/VisibleByRole';
import AdminSidebar from '../../components/AdminSidebar';
import AdminDashboardWidgets from '../../components/AdminDashboardWidgets';
import AdminTransactionTable from '../../components/AdminTransactionTable';
import AdminTrafficChart from '../../components/AdminTrafficChart';
import AdminTrafficSources from '../../components/AdminTrafficSources';
import AdminSocialStats from '../../components/AdminSocialStats';

export default function AdminHome() {
  return (
    <RequireAuth roles={'admin'}>
      <VisibleByRole
        roles={'admin'}
        fallback={
          <div className="min-h-screen flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-white border rounded-lg p-6 text-center">
              <h1 className="text-2xl font-semibold mb-2">403 - Forbidden</h1>
              <p className="text-gray-600 mb-4">You need administrator access to view this page.</p>
              <a href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go Home</a>
            </div>
          </div>
        }
      >
        <div className="min-h-screen bg-gray-100 flex">
          <AdminSidebar />
          <main className="flex-1 p-6 space-y-6">
            <header className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </header>

            <AdminDashboardWidgets />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AdminTrafficChart />
              </div>
              <div className="space-y-6">
                <AdminTrafficSources />
                <AdminSocialStats />
              </div>
            </div>

            <AdminTransactionTable />
          </main>
        </div>
      </VisibleByRole>
    </RequireAuth>
  );
}
