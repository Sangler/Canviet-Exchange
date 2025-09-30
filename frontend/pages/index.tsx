import React from "react";
import { AppContent } from "../components";
import RequireAuth from "../components/RequireAuth";

export default function Dashboard() {
  return (
    <RequireAuth>
      <AppContent />
    </RequireAuth>
  );
}
