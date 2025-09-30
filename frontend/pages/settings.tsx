import RequireAuth from '../components/RequireAuth';

export default function SettingsPage() {
  return (
    <RequireAuth>
      <div>
        <h1>Settings</h1>
        <p>Application settings.</p>
      </div>
    </RequireAuth>
  );
}
