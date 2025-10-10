import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useHasRole } from '../hooks/useHasRole';
import { useAuth } from '../context/AuthContext';
import RequireAuth from '../components/RequireAuth';
import AppFooter from '../components/AppFooter';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';

type UserItem = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
};

export default function UsersPage() {
  const isAdmin = useHasRole('admin');
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  type SortKey = 'user' | 'role' | 'joined';
  const [sortKey, setSortKey] = useState<SortKey>('user');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!isAdmin) {
      // Not authorized - redirect to home
      router.replace('/');
      return;
    }

    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${base}/api/admin/users`, { headers });
        if (!res.ok) {
          // fallback to public users endpoint
          const res2 = await fetch(`${base}/api/users`, { headers });
          let json2: any = {};
          try { json2 = await res2.json(); } catch (e) { console.warn('users: fallback not json', e); }
          setData(json2.users || []);
        } else {
          let json: any = {};
          try { json = await res.json(); } catch (e) { console.warn('users: admin users not json', e); }
          setData(json.users || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, router]);

  return (
    <>
        <RequireAuth>
          <div>
            <AppSidebar />
            <div className="wrapper d-flex flex-column min-vh-100">
              <AppHeader />
              <div className="body flex-grow-1">
<div className="container">
      <h1>Users</h1>
      {loading ? (
        <div className="card">Loading…</div>
      ) : data.length === 0 ? (
        <div className="card empty">No users found.</div>
      ) : (
        <div className="card">
          <div className="toolbar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search users"
              />
            </div>
            <div className="result-count" aria-live="polite">
              {data.length} total
            </div>
          </div>
          <div className="table-wrapper">
            <table className="users-table" role="table">
              <thead>
                <tr>
                  <th scope="col" title="Short ID">ID</th>
                  <th
                    scope="col"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSortKey(prev => prev === 'user' ? prev : 'user');
                      setSortDir(prev => sortKey === 'user' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                    aria-sort={sortKey === 'user' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`${sortKey === 'user' ? 'is-sorted' : ''} sortable-col`}
                    title="Sort by user name"
                  >
                    <span>User</span>
                    <span className="sort-icon" aria-hidden>
                      {sortKey === 'user' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th scope="col" className="hide-sm">Phone</th>
                  <th
                    scope="col"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSortKey(prev => prev === 'role' ? prev : 'role');
                      setSortDir(prev => sortKey === 'role' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                    aria-sort={sortKey === 'role' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`${sortKey === 'role' ? 'is-sorted' : ''} sortable-col`}
                    title="Sort by role"
                  >
                    <span>Role</span>
                    <span className="sort-icon" aria-hidden>
                      {sortKey === 'role' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="hide-md"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSortKey(prev => prev === 'joined' ? prev : 'joined');
                      setSortDir(prev => sortKey === 'joined' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                    aria-sort={sortKey === 'joined' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`sortable-col ${sortKey === 'joined' ? 'is-sorted' : ''}`}
                    title="Sort by joined date"
                  >
                    <span>Joined</span>
                    <span className="sort-icon" aria-hidden>
                      {sortKey === 'joined' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data
                  .filter(u => {
                    if (!search.trim()) return true;
                    const term = search.toLowerCase();
                    const name = `${(u.firstName||'').trim()} ${(u.lastName||'').trim()}`.toLowerCase();
                    return name.includes(term) || u.email.toLowerCase().includes(term) || (u.role||'').toLowerCase().includes(term);
                  })
                  .sort((a, b) => {
                    let cmp = 0;
                    if (sortKey === 'user') {
                      const an = `${(a.firstName||'').trim()} ${(a.lastName||'').trim()}`.toLowerCase();
                      const bn = `${(b.firstName||'').trim()} ${(b.lastName||'').trim()}`.toLowerCase();
                      cmp = an.localeCompare(bn || '');
                      if (cmp === 0) cmp = a.email.localeCompare(b.email);
                    } else if (sortKey === 'role') {
                      cmp = (a.role||'user').localeCompare(b.role||'user');
                    } else if (sortKey === 'joined') {
                      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      cmp = ad - bd; // ascending oldest -> newest
                    }
                    return sortDir === 'asc' ? cmp : -cmp;
                  })
                  .map(u => {
                  const name = `${(u.firstName||'').trim()} ${(u.lastName||'').trim()}`.trim() || '—';
                  const role = (u.role || 'user').toLowerCase();
                  const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—';
                  return (
                    <tr key={u._id}>
                      <td className="mono id-cell" aria-label={`User id ending ${u._id.slice(-6)}`}>{u._id.slice(-6)}</td>
                      <td className="user-cell">
                        <div className="user-name">{name}</div>
                        <div className="user-email" title={u.email}>{u.email}</div>
                      </td>
                      <td className="hide-sm phone-cell">{u.phone || '—'}</td>
                      <td>
                        <span className={`role-badge role-${role}`}>{role}</span>
                      </td>
                      <td className="hide-md">{joined}</td>
                    </tr>
                  )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        .container { max-width: 1100px; margin: 32px auto; padding: 0 16px; }
        h1 { margin: 0 0 20px; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 20px 8px; box-shadow: 0 2px 4px -2px rgba(0,0,0,0.05),0 4px 12px -2px rgba(0,0,0,0.04); }
        .empty { color: #6b7280; font-size: 14px; }
        .table-wrapper { width: 100%; overflow-x: auto; }
        .users-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; line-height: 1.35; }
        thead th { position: sticky; top: 0; background: #f8fafc; z-index: 2; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
        tbody td { padding: 12px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #1e293b; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr { transition: background-color 120ms ease; }
        tbody tr:nth-child(even) { background: #fcfdff; }
        tbody tr:hover { background: #f1f5f9; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color: #64748b; }
        .id-cell { white-space: nowrap; }
        .user-cell { min-width: 200px; }
        .user-name { font-weight: 600; color: #0f172a; line-height: 1.2; }
        .user-email { font-size: 12px; color: #64748b; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
        .phone-cell { font-size: 13px; color: #334155; }
        .role-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; letter-spacing: .5px; text-transform: uppercase; border: 1px solid transparent; }
        .role-user { background: #f1f5f9; color: #334155; border-color: #e2e8f0; }
        .role-admin { background: #1d4ed8; color: #fff; }
        .hide-sm { }
        .hide-md { }
        @media (max-width: 900px) {
          .hide-md { display: none; }
          .user-email { max-width: 180px; }
        }
        @media (max-width: 640px) {
          thead th:nth-child(1) { width: 54px; }
          .hide-sm { display: none; }
          .user-email { display: none; }
          .container { padding: 0 8px; }
          .users-table { font-size: 13px; }
        }
        @media (prefers-color-scheme: dark) {
          .card { background: #1e293b; border-color: #334155; }
          thead th { background: #1e293b; color: #cbd5e1; border-bottom-color: #334155; }
          tbody td { border-bottom-color: #2a3a4f; color: #e2e8f0; }
          tbody tr:nth-child(even) { background: #24324a; }
          tbody tr:hover { background: #2f435d; }
          .empty { color: #94a3b8; }
          .user-name { color: #f1f5f9; }
          .user-email { color: #94a3b8; }
          .mono { color: #94a3b8; }
          .role-user { background: #334155; color: #e2e8f0; border-color: #475569; }
          .role-admin { background: #2563eb; }
        }
      `}</style>
      <style jsx>{`
        .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 0 0 12px; flex-wrap: wrap; }
        .search-box { flex: 1 1 240px; }
        .search-box input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; transition: border-color 120ms, background 120ms; }
        .search-box input:focus { outline: none; border-color: #6366f1; background: #ffffff; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
        .result-count { font-size: 12px; font-weight: 500; color: #64748b; }
        .users-table th.is-sorted { color: #1d4ed8; }
        .users-table th[role='button'] { cursor: pointer; user-select: none; }
        .sort-indicator { margin-left: 4px; font-size: 10px; }
        @media (prefers-color-scheme: dark) {
          .search-box input { background: #1e293b; border-color: #334155; color: #e2e8f0; }
          .search-box input:focus { border-color: #6366f1; background: #24324a; }
          .result-count { color: #94a3b8; }
          .users-table th.is-sorted { color: #60a5fa; }
        }
      `}</style>
    </div>

              </div>
              <AppFooter />
            </div>
          </div>
        </RequireAuth>
    </>
  );
}
