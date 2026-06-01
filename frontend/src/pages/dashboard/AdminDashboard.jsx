import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          System Administration
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage users, view system analytics, and configure platform settings.
        </p>
      </div>

      <div className="rounded-lg bg-white shadow border border-gray-100 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <p className="text-sm text-gray-500">
          Admin metrics and user management table will be implemented here.
        </p>
      </div>
    </div>
  );
}