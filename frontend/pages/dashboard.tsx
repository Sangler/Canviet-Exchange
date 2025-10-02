import { useEffect, useState } from 'react';

type RequestItem = {
  _id: string;
  createdAt: string;
  fromCurrency: string;
  toCurrency: string;
  amountSent: number;
  amountReceived?: number;
  exchangeRate?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
};

export default function DashboardPage() {
  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/requests');
        const json = await res.json();
        setData(json.requests || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container">
      <h1>Your Requests</h1>
      {loading ? (
        <div className="card">Loading…</div>
      ) : data.length === 0 ? (
        <div className="card empty">No requests yet. Create your first transfer to see it here.</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Submitted</th>
                <th>From → To</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r._id}>
                  <td className="mono">{r._id.slice(-6)}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.fromCurrency} → {r.toCurrency}</td>
                  <td>{r.amountSent} {r.fromCurrency}</td>
                  <td>{r.exchangeRate ?? '-'}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .container { max-width: 980px; margin: 32px auto; padding: 0 16px; }
        h1 { margin-bottom: 16px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
        .empty { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 10px; border-bottom: 1px solid #f1f5f9; }
        th { font-weight: 600; color: #374151; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .badge { padding: 4px 10px; border-radius: 9999px; font-size: 12px; text-transform: capitalize; }
        .badge.pending { background: #fef3c7; color: #92400e; }
        .badge.approved { background: #dcfce7; color: #166534; }
        .badge.rejected { background: #fee2e2; color: #991b1b; }
        .badge.completed { background: #e0e7ff; color: #3730a3; }
        @media (max-width: 640px) { .mono { display: none; } }
      `}</style>
    </div>
  );
}
