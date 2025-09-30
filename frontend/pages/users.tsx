import RequireAuth from '../components/RequireAuth';

export default function UsersPage() {
  return (
    <RequireAuth>
      <div>
        <h1>Users</h1>
        <p>Manage users here.</p>
      </div>
    </RequireAuth>
  );
}
