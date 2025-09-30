import RequireAuth from '../components/RequireAuth';

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <div>
        <h1>Analytics</h1>
        <p>Analytics dashboard.</p>
      </div>
    </RequireAuth>
  );
}
