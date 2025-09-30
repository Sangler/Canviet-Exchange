import RequireAuth from '../components/RequireAuth';

export default function ColorsPage() {
  return (
    <RequireAuth>
      <div>
        <h1>Colors</h1>
        <p>Design system colors.</p>
      </div>
    </RequireAuth>
  );
}
