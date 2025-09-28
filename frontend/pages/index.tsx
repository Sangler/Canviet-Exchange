import React from "react";
import { AppContent, AppSidebar, AppFooter, AppHeader } from "../components";
import RequireAuth from "../components/RequireAuth";

export default function Dashboard() {
  return (
    <RequireAuth>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1">
            <AppContent />
          </div>
          <AppFooter />
        </div>
      </div>
    </RequireAuth>
  );
}
