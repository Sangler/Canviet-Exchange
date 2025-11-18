import React from 'react'
import {  AppSidebar, AppFooter, AppHeader } from '../components'
import RequireAuth from '../components/RequireAuth'
import DashboardPage from './dashboard'

export default function TransferHistory() {
  return (
    <RequireAuth>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1">
            {/* Render the dashboard page inside the main content area as requested */}
            <DashboardPage />
          </div>
          <AppFooter />
        </div>
      </div>
    </RequireAuth>
  )
}
